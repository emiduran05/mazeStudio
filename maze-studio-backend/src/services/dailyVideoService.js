const pool = require("../config/db");

const DAILY_API = "https://api.daily.co/v1";
const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

function configuration() {
  const apiKey = process.env.DAILY_API_KEY?.trim();
  const domain = process.env.DAILY_DOMAIN?.trim()?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!apiKey || !domain) throw httpError("Maze Video is not configured", 503);
  return { apiKey, domain };
}

async function dailyRequest(path, options = {}) {
  const { apiKey } = configuration();
  const response = await fetch(`${DAILY_API}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(body.info || body.error || body.message || "Daily video request failed", 502);
  return body;
}

async function accessContext(eventId, userId, client = pool) {
  return (await client.query(`
    SELECT event.*,user_account.first_name,user_account.last_name,user_account.email,
      (event.organizer_user_id=$2::uuid) is_organizer,
      (SELECT profile.id FROM calendar_event_attendees attendee
        JOIN learner_profiles profile ON profile.id=attendee.learner_profile_id
        WHERE attendee.event_id=event.id AND profile.linked_user_id=$2::uuid
          AND attendee.response_status<>'DECLINED' LIMIT 1) learner_profile_id,
      EXISTS(SELECT 1 FROM calendar_event_attendees attendee
        JOIN learner_profiles profile ON profile.id=attendee.learner_profile_id
        WHERE attendee.event_id=event.id AND profile.linked_user_id=$2::uuid
          AND attendee.response_status<>'DECLINED') is_attendee
    FROM calendar_events event JOIN users user_account ON user_account.id=$2::uuid
    WHERE event.id=$1::uuid`, [eventId,userId])).rows[0];
}

function roomName(eventId) { return `maze_${eventId.replace(/-/g, "")}`; }

async function ensureRoom(eventId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const event = (await client.query("SELECT * FROM calendar_events WHERE id=$1::uuid FOR UPDATE", [eventId])).rows[0];
    if (!event) throw httpError("Class not found", 404);
    if (event.video_room_name && event.video_room_url) { await client.query("COMMIT"); return event; }
    const name = roomName(event.id);
    const exp = Math.floor(new Date(event.ends_at).getTime()/1000) + 15*60;
    let room;
    try {
      room = await dailyRequest("/rooms", {method:"POST",body:JSON.stringify({
        name,privacy:"private",properties:{exp,eject_at_room_exp:true,enable_prejoin_ui:true,
          enable_people_ui:true,enable_chat:true,enable_screenshare:true,enable_hand_raising:true,
          enable_emoji_reactions:true,start_video_off:false,start_audio_off:false,max_participants:event.capacity||200}
      })});
    } catch (error) {
      if (!String(error.message).toLowerCase().includes("already")) throw error;
      room = await dailyRequest(`/rooms/${encodeURIComponent(name)}`);
    }
    const roomUrl = room.url || `https://${configuration().domain}/${name}`;
    const updated = (await client.query(`UPDATE calendar_events SET meeting_provider='MAZE_VIDEO',video_room_name=$1,video_room_url=$2,meeting_url=NULL,updated_at=NOW() WHERE id=$3 RETURNING *`, [name,roomUrl,event.id])).rows[0];
    await client.query("COMMIT");
    return updated;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function getAccess(eventId, userId) {
  const context = await accessContext(eventId,userId);
  if (!context || (!context.is_organizer && !context.is_attendee)) throw httpError("You are not invited to this class", 403);
  if (context.status === "CANCELLED") throw httpError("This class was cancelled", 409);
  if (!['ONE_TO_ONE','LIVE_CLASS','WEBINAR','OFFICE_HOURS'].includes(context.event_type)) throw httpError("This event does not support Maze Video", 400);
  const opensAt = new Date(context.starts_at).getTime() - 10*60*1000;
  const closesAt = new Date(context.ends_at).getTime() + 15*60*1000;
  const now = Date.now();
  const accessState = now < opensAt ? "UPCOMING" : now > closesAt ? "EXPIRED" : "OPEN";
  const lessonPlan = (await pool.query(`SELECT assignment.position,step.id,step.title,stage.title stage_title
    FROM calendar_event_lesson_steps assignment JOIN steps step ON step.id=assignment.step_id
    JOIN stages stage ON stage.id=step.stage_id
    WHERE assignment.event_id=$1::uuid AND assignment.learner_profile_id IS NOT DISTINCT FROM
      CASE WHEN $2::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM calendar_event_lesson_steps own WHERE own.event_id=$1::uuid AND own.learner_profile_id=$2::uuid)
        THEN $2::uuid ELSE NULL::uuid END
    ORDER BY assignment.position`,[eventId,context.learner_profile_id||null])).rows;
  const base = {event:{id:context.id,title:context.title,startsAt:context.starts_at,endsAt:context.ends_at},lessonPlan,accessState,canJoin:accessState==="OPEN",opensAt:new Date(opensAt).toISOString(),closesAt:new Date(closesAt).toISOString(),role:context.is_organizer?"EDUCATOR":"LEARNER"};
  if (!base.canJoin) return base;
  const room = await ensureRoom(eventId);
  const displayName = [context.first_name,context.last_name].filter(Boolean).join(" ") || context.email;
  const token = await dailyRequest("/meeting-tokens", {method:"POST",body:JSON.stringify({properties:{
    room_name:room.video_room_name,user_id:userId,user_name:displayName,is_owner:Boolean(context.is_organizer),
    enable_prejoin_ui:true,enable_recording_ui:false,lang:"es",exp:Math.floor(closesAt/1000),eject_at_token_exp:true
  }})});
  await pool.query(`INSERT INTO video_session_participations(event_id,user_id,last_joined_at)
    VALUES($1,$2,NOW()) ON CONFLICT(event_id,user_id) DO UPDATE SET last_joined_at=NOW()`, [eventId,userId]);
  return {...base,roomUrl:room.video_room_url,token:token.token};
}

async function leave(eventId, userId) {
  const context = await accessContext(eventId,userId);
  if (!context || (!context.is_organizer&&!context.is_attendee)) throw httpError("Class not found",404);
  await pool.query(`UPDATE video_session_participations SET left_at=NOW(),
    duration_seconds=duration_seconds+GREATEST(0,EXTRACT(EPOCH FROM(NOW()-last_joined_at))::int)
    WHERE event_id=$1 AND user_id=$2`, [eventId,userId]);
  return {recorded:true};
}

module.exports = { getAccess, leave };
