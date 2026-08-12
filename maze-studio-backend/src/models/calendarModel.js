const pool = require("../config/db");
const notificationService = require("../services/notificationService");

async function list(user, from, to, audience = null) {
  const isEducator = audience !== "learner" && user.role === "EDUCATOR";
  const params = [user.id, from, to];
  const events = await pool.query(`
    SELECT event.id,event.title,event.description,event.event_type,event.status,event.starts_at,event.ends_at,
      event.timezone,event.location_type,event.meeting_provider,event.meeting_url,event.location_text,event.capacity,event.metadata,
      event.learning_journey_id,event.learning_path_id,event.cohort_id,journey.title journey_title,
      (SELECT mine.response_status FROM calendar_event_attendees mine
       JOIN learner_profiles mine_profile ON mine_profile.id=mine.learner_profile_id
       WHERE mine.event_id=event.id AND mine_profile.linked_user_id=$1::uuid LIMIT 1) my_response_status,
      COUNT(attendee.id)::int attendee_count,'EVENT' source
    FROM calendar_events event
    LEFT JOIN learning_journeys journey ON journey.id=event.learning_journey_id
    LEFT JOIN calendar_event_attendees attendee ON attendee.event_id=event.id
    WHERE event.starts_at < $3::timestamptz AND event.ends_at > $2::timestamptz
      AND (${isEducator ? "event.organizer_user_id=$1::uuid" : `EXISTS (
        SELECT 1 FROM calendar_event_attendees mine JOIN learner_profiles profile ON profile.id=mine.learner_profile_id
        WHERE mine.event_id=event.id AND profile.linked_user_id=$1::uuid AND mine.response_status<>'DECLINED'
      )`})
    GROUP BY event.id,journey.title`, params);

  const challenges = await pool.query(`
    SELECT CONCAT(challenge.id::text,'-',moment.kind) id,
      challenge.title || CASE WHEN moment.kind='DUE' THEN ' · Due' ELSE ' · Available' END title,
      challenge.description,CASE WHEN moment.kind='DUE' THEN 'CHALLENGE_DUE' ELSE 'CHALLENGE_RELEASE' END event_type,
      challenge.status,moment.at starts_at,moment.at + INTERVAL '30 minutes' ends_at,'UTC' timezone,
      'NONE' location_type,'NONE' meeting_provider,NULL meeting_url,NULL location_text,NULL capacity,
      challenge.learning_journey_id,NULL learning_path_id,journey.title journey_title,0 attendee_count,'CHALLENGE' source,
      challenge.id challenge_id
    FROM challenges challenge JOIN learning_journeys journey ON journey.id=challenge.learning_journey_id
    CROSS JOIN LATERAL (VALUES ('RELEASE',challenge.release_at),('DUE',challenge.due_at)) moment(kind,at)
    WHERE moment.at IS NOT NULL AND moment.at >= $2::timestamptz AND moment.at < $3::timestamptz
      AND (${isEducator ? "journey.owner_user_id=$1::uuid" : `EXISTS (
        SELECT 1 FROM challenge_assignments assignment JOIN journey_enrollments enrollment ON enrollment.id=assignment.enrollment_id
        WHERE assignment.challenge_id=challenge.id AND enrollment.learner_user_id=$1::uuid AND assignment.status='ASSIGNED'
      )`})`, params);
  return [...events.rows, ...challenges.rows].sort((a,b) => new Date(a.starts_at)-new Date(b.starts_at));
}

async function create(educatorId, input) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (input.learningJourneyId) {
      const access = await client.query("SELECT id FROM learning_journeys WHERE id=$1::uuid AND owner_user_id=$2::uuid AND status<>'ARCHIVED'", [input.learningJourneyId, educatorId]);
      if (!access.rows[0]) { const error=new Error("Learning Journey not found"); error.statusCode=404; throw error; }
    }
    const result = await client.query(`INSERT INTO calendar_events
      (organizer_user_id,learning_journey_id,learning_path_id,title,description,event_type,starts_at,ends_at,timezone,location_type,meeting_provider,meeting_url,location_text,capacity,recurrence_rule,metadata)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::timestamptz,$8::timestamptz,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb) RETURNING *`,
      [educatorId,input.learningJourneyId||null,input.learningPathId||null,input.title.trim(),input.description||null,input.eventType||"CUSTOM",input.startsAt,input.endsAt,input.timezone||"UTC",input.locationType||"ONLINE",input.locationType==="NONE"?"NONE":"MAZE_VIDEO",null,input.locationText||null,input.capacity||null,JSON.stringify(input.recurrenceRule||{}),JSON.stringify(input.metadata||{})]);
    for (const profileId of [...new Set(input.learnerProfileIds || [])]) await client.query("INSERT INTO calendar_event_attendees(event_id,learner_profile_id) VALUES($1,$2::uuid) ON CONFLICT DO NOTHING", [result.rows[0].id,profileId]);
    if (input.inviteAllJourney && input.learningJourneyId) {
      await client.query(`INSERT INTO calendar_event_attendees(event_id,learner_profile_id)
        SELECT $1,enrollment.learner_profile_id FROM journey_enrollments enrollment
        WHERE enrollment.learning_journey_id=$2::uuid AND enrollment.status='ACTIVE'
        ON CONFLICT DO NOTHING`, [result.rows[0].id,input.learningJourneyId]);
    }
    const invited=await client.query("SELECT learner_profile_id FROM calendar_event_attendees WHERE event_id=$1",[result.rows[0].id]);
    for(const attendee of invited.rows) await notificationService.create({recipientProfileId:attendee.learner_profile_id,actorUserId:educatorId,type:"CALENDAR_EVENT",title:"New event scheduled",body:`${result.rows[0].title} was added to your calendar.`,actionUrl:"/student/calendar",entityType:"CALENDAR_EVENT",entityId:result.rows[0].id,deduplicationKey:`calendar:${result.rows[0].id}`},client);
    for (const minutes of [...new Set(input.reminderMinutes || [1440,60])]) await client.query("INSERT INTO calendar_event_reminders(event_id,minutes_before,channel) VALUES($1,$2,'EMAIL') ON CONFLICT DO NOTHING", [result.rows[0].id,minutes]);
    await client.query("COMMIT"); return result.rows[0];
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function remove(educatorId, eventId) {
  const result=await pool.query("DELETE FROM calendar_events WHERE id=$1::uuid AND organizer_user_id=$2::uuid RETURNING id",[eventId,educatorId]);
  return result.rows[0];
}

async function participants(educatorId,eventId){
  const event=(await pool.query("SELECT id,learning_journey_id FROM calendar_events WHERE id=$1::uuid AND organizer_user_id=$2::uuid",[eventId,educatorId])).rows[0];
  if(!event)return null;
  return(await pool.query(`SELECT profile.id,profile.first_name,profile.last_name,profile.contact_email,profile.status,
    EXISTS(SELECT 1 FROM calendar_event_attendees attendee WHERE attendee.event_id=$1::uuid AND attendee.learner_profile_id=profile.id) invited
    FROM learner_profiles profile JOIN educator_learner_relationships relationship ON relationship.learner_profile_id=profile.id
    WHERE relationship.educator_user_id=$2::uuid AND relationship.status='ACTIVE' AND profile.status<>'ARCHIVED'
      AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM journey_enrollments enrollment WHERE enrollment.learning_journey_id=$3::uuid AND enrollment.learner_profile_id=profile.id AND enrollment.status IN('ACTIVE','COMPLETED')))
    ORDER BY invited DESC,profile.first_name,profile.last_name`,[eventId,educatorId,event.learning_journey_id])).rows;
}

async function inviteParticipant(educatorId,eventId,profileId){
  const client=await pool.connect();try{await client.query("BEGIN");
    const event=(await client.query("SELECT * FROM calendar_events WHERE id=$1::uuid AND organizer_user_id=$2::uuid FOR UPDATE",[eventId,educatorId])).rows[0];
    if(!event)throw Object.assign(new Error("Calendar event not found"),{statusCode:404});
    if(event.event_type==="ONE_TO_ONE")throw Object.assign(new Error("1:1 classes are private. Their learner is assigned by the purchase and additional invitations are not allowed."),{statusCode:409,code:"PRIVATE_CLASSROOM"});
    const profile=(await client.query(`SELECT profile.* FROM learner_profiles profile JOIN educator_learner_relationships relationship ON relationship.learner_profile_id=profile.id WHERE profile.id=$1::uuid AND relationship.educator_user_id=$2::uuid AND relationship.status='ACTIVE'`,[profileId,educatorId])).rows[0];
    if(!profile)throw Object.assign(new Error("Student not found"),{statusCode:404});
    await client.query("INSERT INTO calendar_event_attendees(event_id,learner_profile_id,response_status) VALUES($1::uuid,$2::uuid,'ACCEPTED') ON CONFLICT(event_id,learner_profile_id) DO UPDATE SET response_status='ACCEPTED'",[eventId,profileId]);
    await notificationService.create({recipientProfileId:profileId,actorUserId:educatorId,type:"CALENDAR_EVENT",title:"You were invited to a class",body:`${event.title} was added to your calendar.`,actionUrl:"/student/calendar",entityType:"CALENDAR_EVENT",entityId:eventId,deduplicationKey:`calendar-invite:${eventId}:${profileId}`},client);
    await client.query("COMMIT");return{invited:true};
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

async function removeParticipant(educatorId,eventId,profileId){
  const event=(await pool.query("SELECT event_type FROM calendar_events WHERE id=$1::uuid AND organizer_user_id=$2::uuid",[eventId,educatorId])).rows[0];
  if(!event)return null;
  if(event.event_type==="ONE_TO_ONE")throw Object.assign(new Error("The learner assigned to a purchased 1:1 class cannot be removed."),{statusCode:409,code:"PRIVATE_CLASSROOM"});
  const result=await pool.query(`DELETE FROM calendar_event_attendees attendee USING calendar_events calendar_event WHERE attendee.event_id=calendar_event.id AND calendar_event.id=$1::uuid AND calendar_event.organizer_user_id=$2::uuid AND attendee.learner_profile_id=$3::uuid RETURNING attendee.id`,[eventId,educatorId,profileId]);return result.rows[0]||null
}

async function confirmAttendance(learnerUserId,eventId,attended) {
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const context=(await client.query(`SELECT event.id,event.title,event.organizer_user_id,event.starts_at,event.ends_at,
      event.event_type,event.metadata,event.cohort_id,attendee.id attendee_id,attendee.response_status,
      EXISTS(SELECT 1 FROM offering_orders orders
        WHERE orders.learner_user_id=$2::uuid AND orders.status IN ('PAID','FREE')
          AND (orders.id::text=event.metadata->>'offeringOrderId' OR orders.cohort_id=event.cohort_id)) purchased
      FROM calendar_events event JOIN calendar_event_attendees attendee ON attendee.event_id=event.id
      JOIN learner_profiles profile ON profile.id=attendee.learner_profile_id
      WHERE event.id=$1::uuid AND profile.linked_user_id=$2::uuid FOR UPDATE`,[eventId,learnerUserId])).rows[0];
    if(!context)throw Object.assign(new Error("Class not found"),{statusCode:404});
    if(!context.purchased)throw Object.assign(new Error("Only purchased 1:1 or cohort sessions require confirmation"),{statusCode:400});
    if(new Date(context.ends_at)>new Date())throw Object.assign(new Error("You can confirm attendance after the class ends"),{statusCode:409});
    if(["ATTENDED","ABSENT"].includes(context.response_status))throw Object.assign(new Error("Attendance was already confirmed"),{statusCode:409});
    const responseStatus=attended?"ATTENDED":"ABSENT";
    await client.query("UPDATE calendar_event_attendees SET response_status=$1,responded_at=NOW() WHERE id=$2::uuid",[responseStatus,context.attendee_id]);
    await notificationService.create({recipientUserId:context.organizer_user_id,actorUserId:learnerUserId,type:attended?"CLASS_ATTENDANCE_CONFIRMED":"CLASS_NOT_HELD_REPORTED",title:attended?"Class attendance confirmed":"Learner reported a class was not held",body:attended?`The learner confirmed that ${context.title} took place.`:`The learner reported that ${context.title} did not take place.`,actionUrl:"/calendar",entityType:"CALENDAR_EVENT",entityId:eventId,deduplicationKey:`attendance-confirmation:${eventId}`},client);
    await client.query("COMMIT");
    return{responseStatus};
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

module.exports={list,create,remove,confirmAttendance,participants,inviteParticipant,removeParticipant};
