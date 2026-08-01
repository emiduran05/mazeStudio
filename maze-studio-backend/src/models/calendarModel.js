const pool = require("../config/db");
const notificationService = require("../services/notificationService");

async function list(user, from, to) {
  const isEducator = user.role === "EDUCATOR";
  const params = [user.id, from, to];
  const events = await pool.query(`
    SELECT event.id,event.title,event.description,event.event_type,event.status,event.starts_at,event.ends_at,
      event.timezone,event.location_type,event.meeting_provider,event.meeting_url,event.location_text,event.capacity,event.metadata,
      event.learning_journey_id,event.learning_path_id,journey.title journey_title,
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
      [educatorId,input.learningJourneyId||null,input.learningPathId||null,input.title.trim(),input.description||null,input.eventType||"CUSTOM",input.startsAt,input.endsAt,input.timezone||"UTC",input.locationType||"ONLINE",input.meetingProvider||"MANUAL",input.meetingUrl||null,input.locationText||null,input.capacity||null,JSON.stringify(input.recurrenceRule||{}),JSON.stringify(input.metadata||{})]);
    for (const profileId of [...new Set(input.learnerProfileIds || [])]) await client.query("INSERT INTO calendar_event_attendees(event_id,learner_profile_id) VALUES($1,$2::uuid) ON CONFLICT DO NOTHING", [result.rows[0].id,profileId]);
    if (input.inviteAllJourney && input.learningJourneyId) {
      await client.query(`INSERT INTO calendar_event_attendees(event_id,learner_profile_id)
        SELECT $1,enrollment.learner_profile_id FROM journey_enrollments enrollment
        WHERE enrollment.learning_journey_id=$2::uuid AND enrollment.status='ACTIVE'
        ON CONFLICT DO NOTHING`, [result.rows[0].id,input.learningJourneyId]);
    }
    const invited=await client.query("SELECT learner_profile_id FROM calendar_event_attendees WHERE event_id=$1",[result.rows[0].id]);
    for(const attendee of invited.rows) await notificationService.create({recipientProfileId:attendee.learner_profile_id,actorUserId:educatorId,type:"CALENDAR_EVENT",title:"New event scheduled",body:`${result.rows[0].title} was added to your calendar.`,actionUrl:"/student/calendar",entityType:"CALENDAR_EVENT",entityId:result.rows[0].id,deduplicationKey:`calendar:${result.rows[0].id}`},client);
    for (const minutes of [...new Set(input.reminderMinutes || [30])]) await client.query("INSERT INTO calendar_event_reminders(event_id,minutes_before) VALUES($1,$2) ON CONFLICT DO NOTHING", [result.rows[0].id,minutes]);
    await client.query("COMMIT"); return result.rows[0];
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function remove(educatorId, eventId) {
  const result=await pool.query("DELETE FROM calendar_events WHERE id=$1::uuid AND organizer_user_id=$2::uuid RETURNING id",[eventId,educatorId]);
  return result.rows[0];
}

module.exports={list,create,remove};
