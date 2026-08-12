const pool = require("../config/db");
const stripe = require("../config/stripe");
const notificationService = require("./notificationService");

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

async function eventContext(eventId, userId, client = pool) {
  return (await client.query(`
    SELECT event.*, attendee.id attendee_id, attendee.learner_profile_id, attendee.response_status,
      profile.linked_user_id learner_user_id, orders.id offering_order_id, orders.amount, orders.currency,
      orders.billing_type, orders.session_count, orders.stripe_payment_intent_id, orders.stripe_subscription_id,
      offering.session_count offering_session_count, offering.title offering_title
    FROM calendar_events event
    JOIN calendar_event_attendees attendee ON attendee.event_id=event.id
    JOIN learner_profiles profile ON profile.id=attendee.learner_profile_id
    LEFT JOIN LATERAL (
      SELECT candidate.* FROM offering_orders candidate
      WHERE candidate.learner_user_id=profile.linked_user_id AND candidate.status IN ('PAID','FREE')
        AND (candidate.id::text=event.metadata->>'offeringOrderId'
          OR (event.cohort_id IS NOT NULL AND candidate.cohort_id=event.cohort_id))
      ORDER BY candidate.paid_at DESC NULLS LAST LIMIT 1
    ) orders ON TRUE
    LEFT JOIN offerings offering ON offering.id=orders.offering_id
    WHERE event.id=$1::uuid AND profile.linked_user_id=$2::uuid`, [eventId, userId])).rows[0];
}

function proportionalSessionValue(row) {
  const count = row.billing_type === "MONTHLY"
    ? (Number(row.session_count) || 1) * 4
    : Number(row.session_count) || Number(row.offering_session_count) || 1;
  return Math.max(0, Math.round(Number(row.amount || 0) / count));
}

async function report(userId, eventId, input = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await eventContext(eventId, userId, client);
    if (!row) throw httpError("Purchased class not found", 404);
    if (!row.offering_order_id) throw httpError("This class is not connected to a purchase", 409);
    if (new Date(row.ends_at) > new Date()) throw httpError("An incident can be reported after the class ends", 409);
    const incidentType = input.incidentType === "ENDED_EARLY" ? "SESSION_ENDED_EARLY" : input.incidentType;
    if (!["EDUCATOR_NO_SHOW", "TECHNICAL_ISSUE", "SESSION_ENDED_EARLY", "OTHER"].includes(incidentType)) throw httpError("Choose a valid incident type", 400);
    if (!["REPLACEMENT", "CREDIT", "REFUND"].includes(input.requestedResolution)) throw httpError("Choose a requested resolution", 400);
    const description = String(input.description || "").trim();
    if (description.length < 10) throw httpError("Describe what happened in at least 10 characters", 400);
    const incident = (await client.query(`
      INSERT INTO session_incidents(event_id,learner_user_id,learner_profile_id,educator_user_id,offering_order_id,incident_type,description,requested_resolution,session_value,currency)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [row.id,userId,row.learner_profile_id,row.organizer_user_id,row.offering_order_id,incidentType,description,input.requestedResolution,proportionalSessionValue(row),row.currency])).rows[0];
    await client.query("UPDATE calendar_event_attendees SET response_status='ABSENT',responded_at=NOW() WHERE id=$1", [row.attendee_id]);
    await notificationService.create({recipientUserId:row.organizer_user_id,actorUserId:userId,type:"SESSION_INCIDENT_REPORTED",title:"Session incident requires a response",body:`A learner reported an issue with ${row.title}. Respond within 48 hours.`,actionUrl:"/calendar",entityType:"SESSION_INCIDENT",entityId:incident.id,deduplicationKey:`session-incident:${incident.id}`}, client);
    await client.query("COMMIT");
    return incident;
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") throw httpError("This session was already reported", 409);
    throw error;
  } finally { client.release(); }
}

async function list(user, audience) {
  const educator = audience !== "learner" && user.role === "EDUCATOR";
  return (await pool.query(`
    SELECT incident.*,event.title,event.starts_at,event.ends_at,event.cohort_id,
      CONCAT_WS(' ',learner.first_name,learner.last_name) learner_name
    FROM session_incidents incident JOIN calendar_events event ON event.id=incident.event_id
    JOIN users learner ON learner.id=incident.learner_user_id
    WHERE ${educator ? "incident.educator_user_id" : "incident.learner_user_id"}=$1::uuid
    ORDER BY (incident.status='OPEN') DESC,incident.created_at DESC LIMIT 80`, [user.id])).rows;
}

async function paymentIntent(row) {
  if (row.stripe_payment_intent_id) return row.stripe_payment_intent_id;
  if (!row.stripe_subscription_id) return null;
  const invoices = await stripe.invoices.list({subscription:row.stripe_subscription_id,status:"paid",limit:24});
  const cutoff = new Date(row.ends_at).getTime() / 1000;
  const invoice = invoices.data.filter(item=>item.created<=cutoff).sort((a,b)=>b.created-a.created)[0] || invoices.data[0];
  return typeof invoice?.payment_intent === "string" ? invoice.payment_intent : invoice?.payment_intent?.id || null;
}

async function applyCredit(row) {
  if (!row.session_value) return null;
  const learner = (await pool.query("SELECT stripe_customer_id FROM users WHERE id=$1", [row.learner_user_id])).rows[0];
  if (!learner?.stripe_customer_id) throw httpError("The learner does not have a Stripe customer balance", 409);
  return stripe.customers.createBalanceTransaction(learner.stripe_customer_id, {amount:-row.session_value,currency:row.currency.toLowerCase(),description:`Maze Studio credit for ${row.title}`,metadata:{sessionIncidentId:row.id}});
}

async function respond(educatorId, id, input = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = (await client.query(`
      SELECT incident.*,event.title,event.starts_at,event.ends_at,event.timezone,event.learning_journey_id,event.metadata,
        orders.stripe_payment_intent_id,orders.stripe_subscription_id
      FROM session_incidents incident JOIN calendar_events event ON event.id=incident.event_id
      JOIN offering_orders orders ON orders.id=incident.offering_order_id
      WHERE incident.id=$1 AND incident.educator_user_id=$2 AND incident.status='OPEN' FOR UPDATE`, [id,educatorId])).rows[0];
    if (!row) throw httpError("Open incident not found", 404);
    const action = input.action;
    const response = String(input.response || "").trim();
    if (action === "DISPUTE") {
      if (!response) throw httpError("Explain why you are disputing the report", 400);
      await client.query("UPDATE session_incidents SET status='DISPUTED',educator_response=$1,updated_at=NOW() WHERE id=$2", [response,id]);
      await notificationService.create({recipientUserId:row.learner_user_id,actorUserId:educatorId,type:"SESSION_INCIDENT_DISPUTED",title:"Your session report was disputed",body:response,actionUrl:"/student/calendar",entityType:"SESSION_INCIDENT",entityId:id,deduplicationKey:`incident-disputed:${id}`}, client);
      await client.query("COMMIT");
      return {status:"DISPUTED"};
    }

    let status, resolutionId = null, replacementEventId = null;
    if (action === "REPLACEMENT") {
      const starts = new Date(input.replacementStartsAt);
      if (Number.isNaN(starts.getTime()) || starts <= new Date()) throw httpError("Choose a future replacement time", 400);
      const duration = new Date(row.ends_at) - new Date(row.starts_at);
      const ends = new Date(starts.getTime() + (duration > 0 ? duration : 3600000));
      const replacement = (await client.query(`
        INSERT INTO calendar_events(organizer_user_id,learning_journey_id,title,description,event_type,starts_at,ends_at,timezone,location_type,meeting_provider,metadata)
        VALUES($1,$2,$3,'Replacement class approved after a session incident','ONE_TO_ONE',$4,$5,$6,'ONLINE','MANUAL',$7::jsonb) RETURNING id`,
        [educatorId,row.learning_journey_id,`${row.title} · Replacement`,starts.toISOString(),ends.toISOString(),row.timezone,JSON.stringify({...row.metadata,replacementForIncidentId:id})])).rows[0];
      await client.query("INSERT INTO calendar_event_attendees(event_id,learner_profile_id,response_status) VALUES($1,$2,'ACCEPTED')", [replacement.id,row.learner_profile_id]);
      replacementEventId = replacement.id;
      status = "RESOLVED_REPLACEMENT";
    } else if (action === "CREDIT") {
      const credit = await applyCredit(row); resolutionId = credit?.id || null; status = "RESOLVED_CREDIT";
    } else if (action === "REFUND") {
      const intent = await paymentIntent(row);
      if (row.session_value && !intent) throw httpError("A refundable payment could not be found", 409);
      const refund = row.session_value ? await stripe.refunds.create({payment_intent:intent,amount:row.session_value,reverse_transfer:true,refund_application_fee:true,metadata:{sessionIncidentId:id}}) : null;
      resolutionId = refund?.id || null; status = "RESOLVED_REFUND";
    } else throw httpError("Choose replacement, credit, refund or dispute", 400);

    await client.query("UPDATE session_incidents SET status=$1,educator_response=$2,resolution_type=$3,replacement_event_id=$4,stripe_credit_id=$5,stripe_refund_id=$6,resolved_at=NOW(),updated_at=NOW() WHERE id=$7", [status,response||null,action,replacementEventId,action==="CREDIT"?resolutionId:null,action==="REFUND"?resolutionId:null,id]);
    await notificationService.create({recipientUserId:row.learner_user_id,actorUserId:educatorId,type:"SESSION_INCIDENT_RESOLVED",title:"Your session report was resolved",body:action==="REPLACEMENT"?"A replacement class was added to your calendar.":action==="CREDIT"?"A proportional credit was added to your account.":"A proportional refund was issued.",actionUrl:"/student/calendar",entityType:"SESSION_INCIDENT",entityId:id,deduplicationKey:`incident-resolved:${id}`}, client);
    await client.query("COMMIT");
    return {status,replacementEventId,resolutionId};
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

module.exports = { report, list, respond };
