const pool = require("../config/db");
const notificationService = require("../services/notificationService");

async function listPublished({ search = "", type = "" }) {
  const result = await pool.query(`
    SELECT offering.id, offering.title, offering.description, offering.offering_type,
      offering.price_amount, offering.currency, offering.access_duration_days,
      offering.session_count, offering.session_duration_minutes, offering.schedule_mode,
      offering.starts_at, offering.ends_at, offering.capacity, offering.settings,
      journey.id learning_journey_id, journey.title journey_title,
      journey.description journey_description, journey.cover_url, journey.difficulty,
      journey.language, journey.estimated_minutes,
      CONCAT_WS(' ', educator.first_name, educator.last_name) educator_name,
      educator.id educator_id, educator.avatar_url educator_avatar_url, profile.slug educator_slug,
      COUNT(cohort.id) FILTER (WHERE cohort.status='OPEN' AND cohort.starts_at>NOW())::int open_cohort_count
    FROM offerings offering
    JOIN learning_journeys journey ON journey.id=offering.learning_journey_id
    JOIN users educator ON educator.id=offering.owner_user_id
    LEFT JOIN educator_profiles profile ON profile.educator_user_id=educator.id AND profile.is_published=TRUE
    LEFT JOIN subscriptions subscription ON subscription.user_id=offering.owner_user_id
    LEFT JOIN cohorts cohort ON cohort.offering_id=offering.id
    WHERE offering.status='PUBLISHED' AND journey.status='PUBLISHED'
      AND offering.offering_type IN ('SELF_PACED','ONE_TO_ONE','COHORT')
      AND journey.visibility='PUBLIC'
      AND educator.status='ACTIVE'
      AND subscription.status IN ('ACTIVE','TRIALING')
      AND (offering.sales_start_at IS NULL OR offering.sales_start_at<=NOW())
      AND (offering.sales_end_at IS NULL OR offering.sales_end_at>NOW())
      AND ($1::text='' OR offering.title ILIKE '%'||$1::text||'%' OR offering.description ILIKE '%'||$1::text||'%' OR journey.title ILIKE '%'||$1::text||'%' OR journey.description ILIKE '%'||$1::text||'%' OR CONCAT_WS(' ',educator.first_name,educator.last_name) ILIKE '%'||$1::text||'%' OR profile.headline ILIKE '%'||$1::text||'%' OR profile.specialties::text ILIKE '%'||$1::text||'%')
      AND ($2::text='' OR offering.offering_type=$2::text)
    GROUP BY offering.id,journey.id,educator.id,profile.slug
    ORDER BY offering.created_at DESC`, [search.trim(), type]);
  return result.rows;
}

async function getJourneyPublished(journeyId, userId = null) {
  return (await pool.query(`SELECT offering.*,journey.title journey_title,journey.description journey_description,
    journey.cover_url,journey.difficulty,journey.language,journey.estimated_minutes,
    CONCAT_WS(' ',educator.first_name,educator.last_name) educator_name,
    educator.id educator_id,educator.avatar_url educator_avatar_url,profile.slug educator_slug,
    EXISTS(SELECT 1 FROM offering_orders orders WHERE orders.offering_id=offering.id AND orders.learner_user_id=$2::uuid AND orders.status IN ('PAID','FREE')) purchased,
    EXISTS(SELECT 1 FROM journey_enrollments enrollment WHERE enrollment.learning_journey_id=journey.id AND enrollment.learner_user_id=$2::uuid AND enrollment.status IN ('ACTIVE','COMPLETED')) enrolled
    FROM offerings offering JOIN learning_journeys journey ON journey.id=offering.learning_journey_id
    JOIN users educator ON educator.id=offering.owner_user_id LEFT JOIN educator_profiles profile ON profile.educator_user_id=educator.id AND profile.is_published=TRUE LEFT JOIN subscriptions subscription ON subscription.user_id=offering.owner_user_id
    WHERE journey.id=$1::uuid AND offering.status='PUBLISHED' AND journey.status='PUBLISHED'
      AND offering.offering_type IN ('SELF_PACED','ONE_TO_ONE','COHORT')
      AND journey.visibility IN ('PUBLIC','UNLISTED')
      AND educator.status='ACTIVE' AND subscription.status IN ('ACTIVE','TRIALING')
      AND (offering.sales_start_at IS NULL OR offering.sales_start_at<=NOW()) AND (offering.sales_end_at IS NULL OR offering.sales_end_at>NOW())
    ORDER BY offering.price_amount,offering.created_at`,[journeyId,userId])).rows;
}

async function getPublished(id, userId = null) {
  const result = await pool.query(`
    SELECT offering.*, journey.title journey_title, journey.description journey_description,
      journey.cover_url, journey.difficulty, journey.language, journey.estimated_minutes,
      CONCAT_WS(' ',educator.first_name,educator.last_name) educator_name,
      educator.id educator_id, educator.avatar_url educator_avatar_url, profile.slug educator_slug,
      EXISTS(SELECT 1 FROM journey_enrollments enrollment WHERE enrollment.learning_journey_id=offering.learning_journey_id AND enrollment.learner_user_id=$2::uuid AND enrollment.status IN ('ACTIVE','COMPLETED')) enrolled
    FROM offerings offering
    JOIN learning_journeys journey ON journey.id=offering.learning_journey_id
    JOIN users educator ON educator.id=offering.owner_user_id
    LEFT JOIN educator_profiles profile ON profile.educator_user_id=educator.id AND profile.is_published=TRUE
    LEFT JOIN subscriptions subscription ON subscription.user_id=offering.owner_user_id
    WHERE offering.id=$1::uuid AND offering.status='PUBLISHED' AND journey.status='PUBLISHED'
      AND journey.visibility IN ('PUBLIC','UNLISTED')
      AND educator.status='ACTIVE' AND subscription.status IN ('ACTIVE','TRIALING')
      AND (offering.sales_start_at IS NULL OR offering.sales_start_at<=NOW())
      AND (offering.sales_end_at IS NULL OR offering.sales_end_at>NOW())
    LIMIT 1`, [id, userId]);
  return result.rows[0] || null;
}

async function getPublicJourneyStructure(journeyId) {
  return (await pool.query(`SELECT stage.id stage_id,stage.parent_stage_id,stage.title stage_title,
    stage.description stage_description,stage.position stage_position,step.id step_id,
    step.title step_title,step.description step_description,step.position step_position,
    step.estimated_minutes,step.is_preview,step.icon,step.emoji
    FROM stages stage LEFT JOIN steps step ON step.stage_id=stage.id AND step.status='PUBLISHED'
    JOIN learning_journeys journey ON journey.id=stage.learning_journey_id
    WHERE journey.id=$1::uuid AND journey.status='PUBLISHED'
      AND journey.visibility IN('PUBLIC','UNLISTED')
    ORDER BY stage.parent_stage_id NULLS FIRST,stage.position,step.position`,[journeyId])).rows;
}

async function getPublicPreviewStep(journeyId,stepId) {
  const step=(await pool.query(`SELECT step.id,step.title,step.description,step.estimated_minutes,
    step.image_url,stage.title stage_title,journey.id learning_journey_id,journey.title journey_title
    FROM steps step JOIN stages stage ON stage.id=step.stage_id
    JOIN learning_journeys journey ON journey.id=stage.learning_journey_id
    WHERE journey.id=$1::uuid AND step.id=$2::uuid AND journey.status='PUBLISHED'
      AND journey.visibility IN('PUBLIC','UNLISTED') AND step.status='PUBLISHED' AND step.is_preview=TRUE
      AND EXISTS(SELECT 1 FROM offerings offering WHERE offering.learning_journey_id=journey.id AND offering.status='PUBLISHED')`,[journeyId,stepId])).rows[0];
  if(!step)return null;
  step.blocks=(await pool.query(`SELECT id,parent_block_id,block_type,position,content,settings
    FROM step_blocks WHERE step_id=$1::uuid ORDER BY position,created_at`,[stepId])).rows;
  return step;
}

async function listOpenCohorts(offeringId) {
  return (await pool.query(`
    SELECT cohort.id,cohort.title,cohort.starts_at,cohort.ends_at,cohort.timezone,cohort.capacity,
      cohort.status,COUNT(member.id) FILTER(WHERE member.status='ACTIVE')::int member_count,
      (cohort.status='OPEN' AND cohort.starts_at>NOW() AND COUNT(member.id) FILTER(WHERE member.status='ACTIVE')<cohort.capacity) enrollment_open,
      CASE WHEN cohort.ends_at<NOW() OR cohort.status='COMPLETED' THEN 'COMPLETED'
           WHEN cohort.starts_at<=NOW() THEN 'IN_PROGRESS' ELSE 'UPCOMING' END schedule_status
    FROM cohorts cohort LEFT JOIN cohort_members member ON member.cohort_id=cohort.id
    WHERE cohort.offering_id=$1::uuid AND cohort.status<>'DRAFT' AND cohort.status<>'CANCELLED'
    GROUP BY cohort.id
    ORDER BY (cohort.starts_at>NOW()) DESC,cohort.starts_at DESC NULLS LAST`, [offeringId])).rows;
}

async function listAvailability(offeringId,from,to){
  return (await pool.query(`SELECT event.starts_at,event.ends_at,event.metadata
    FROM calendar_events event JOIN offerings offering ON offering.owner_user_id=event.organizer_user_id
    WHERE offering.id=$1::uuid AND event.status IN ('SCHEDULED','IN_PROGRESS')
      AND event.starts_at<$3::timestamptz AND event.ends_at>$2::timestamptz
    ORDER BY event.starts_at`,[offeringId,from,to])).rows;
}

async function findBookingConflicts(offeringId,slots){
  return (await pool.query(`SELECT DISTINCT event.starts_at,event.ends_at
    FROM offerings offering JOIN calendar_events event ON event.organizer_user_id=offering.owner_user_id
    JOIN jsonb_to_recordset($2::jsonb) slot(starts_at timestamptz,ends_at timestamptz)
      ON event.starts_at<slot.ends_at AND event.ends_at>slot.starts_at
    WHERE offering.id=$1::uuid AND event.status IN ('SCHEDULED','IN_PROGRESS')`,[offeringId,JSON.stringify(slots)])).rows;
}

async function createOrder(offering, userId, cohortId, status = "PENDING", booking = {}) {
  const count=offering.offering_type==="ONE_TO_ONE"?Number(booking.sessionCount):Number(offering.session_count)||null;
  const monthly=offering.offering_type==="ONE_TO_ONE"?booking.frequency==="WEEKLY":offering.payment_model==="MONTHLY";
  const perSession=offering.offering_type!=="ONE_TO_ONE"&&offering.payment_model==="PER_SESSION";
  const amount=offering.offering_type==="ONE_TO_ONE"?offering.price_amount*count*(monthly?4:1):offering.price_amount;
  return (await pool.query(`INSERT INTO offering_orders(offering_id,cohort_id,learner_user_id,status,amount,currency,session_count,first_session_at,recurrence_frequency,booking_timezone,booking_settings,billing_type)
    VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8::timestamptz,$9,$10,$11::jsonb,$12) RETURNING *`,
    [offering.id, cohortId || null, userId, status, amount, offering.currency,count,booking.sessionDates?.[0]||booking.firstSessionAt||null,booking.frequency||null,booking.timezone||null,JSON.stringify(booking),monthly?"MONTHLY":perSession?"PER_SESSION":"ONE_TIME"])).rows[0];
}

async function attachCheckout(orderId, sessionId) {
  await pool.query("UPDATE offering_orders SET stripe_checkout_session_id=$1,updated_at=NOW() WHERE id=$2::uuid", [sessionId, orderId]);
}

async function saveCustomer(userId, stripeCustomerId) {
  await pool.query("UPDATE users SET stripe_customer_id=COALESCE(stripe_customer_id,$1),updated_at=NOW() WHERE id=$2::uuid", [stripeCustomerId,userId]);
}

async function fulfillOrder(orderId, paymentIntentId = null, free = false, stripeSubscriptionId = null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const order = (await client.query(`SELECT orders.*,offering.learning_journey_id,offering.owner_user_id,offering.offering_type,offering.title offering_title,
      offering.access_policy,offering.access_duration_days
      FROM offering_orders orders JOIN offerings offering ON offering.id=orders.offering_id
      WHERE orders.id=$1::uuid FOR UPDATE`, [orderId])).rows[0];
    if (!order) throw Object.assign(new Error("Order not found"), { statusCode: 404 });
    if (["PAID","FREE"].includes(order.status) && order.enrollment_id) { await client.query("COMMIT"); return order; }
    if (["COHORT","HYBRID","WEBINAR"].includes(order.offering_type)) {
      if (!order.cohort_id) throw Object.assign(new Error("Choose a group for this offer"), { statusCode: 400 });
      const capacity = (await client.query(`SELECT capacity FROM cohorts WHERE id=$1::uuid AND offering_id=$2::uuid AND status IN ('OPEN','ACTIVE') FOR UPDATE`, [order.cohort_id,order.offering_id])).rows[0];
      const memberCount = capacity ? Number((await client.query("SELECT COUNT(*)::int count FROM cohort_members WHERE cohort_id=$1::uuid AND status='ACTIVE'", [order.cohort_id])).rows[0].count) : 0;
      if (!capacity || memberCount>=capacity.capacity) throw Object.assign(new Error("This group is no longer available"), { statusCode: 409 });
    }
    const accessExpiresAt=order.access_policy==="FIXED_DAYS"?new Date(Date.now()+Number(order.access_duration_days||1)*86400000):null;
    const enrollment = (await client.query(`INSERT INTO journey_enrollments(learning_journey_id,learner_user_id,status,enrollment_source,enrolled_by_user_id,started_at,source_order_id,access_policy,access_expires_at)
      VALUES($1::uuid,$2::uuid,'ACTIVE','PURCHASE',$3::uuid,NOW(),$4::uuid,$5,$6::timestamptz)
      ON CONFLICT(learning_journey_id,learner_user_id) DO UPDATE SET status='ACTIVE',enrollment_source='PURCHASE',completed_at=NULL,source_order_id=EXCLUDED.source_order_id,access_policy=EXCLUDED.access_policy,access_expires_at=EXCLUDED.access_expires_at,updated_at=NOW()
      RETURNING *`, [order.learning_journey_id,order.learner_user_id,order.owner_user_id,order.id,order.access_policy,accessExpiresAt])).rows[0];
    const count=Number(order.session_count)||0;
    if (order.cohort_id) {
      await client.query(`INSERT INTO cohort_members(cohort_id,enrollment_id,status) VALUES($1::uuid,$2::uuid,'ACTIVE')
        ON CONFLICT(cohort_id,enrollment_id) DO UPDATE SET status='ACTIVE',updated_at=NOW()`, [order.cohort_id,enrollment.id]);
      await client.query(`INSERT INTO calendar_event_attendees(event_id,learner_profile_id)
        SELECT event.id,$2::uuid FROM calendar_events event WHERE event.cohort_id=$1::uuid AND event.starts_at>NOW() AND event.status='SCHEDULED' ON CONFLICT DO NOTHING`, [order.cohort_id,enrollment.learner_profile_id]);
    }
    if (order.offering_type==="ONE_TO_ONE") {
      const configured=Array.isArray(order.booking_settings?.sessionDates)?order.booking_settings.sessionDates:[];
      const first=new Date(order.first_session_at),weeks=order.recurrence_frequency==="BIWEEKLY"?2:order.recurrence_frequency==="WEEKLY"?1:0;
      let dates=configured.length?configured.map(value=>new Date(value)):Array.from({length:count},(_,index)=>new Date(first.getTime()+index*weeks*7*86400000));
      if(order.billing_type==="MONTHLY"){const templates=[...dates],reservationWeeks=Number(process.env.BOOKING_RESERVATION_WEEKS||26);dates=[];for(let week=0;week<reservationWeeks;week++)for(const template of templates)dates.push(new Date(template.getTime()+week*7*86400000));}
      if(!count||(!dates.length)||dates.some(date=>Number.isNaN(date.getTime()))) throw Object.assign(new Error("The 1:1 schedule is incomplete"),{statusCode:400});
      const duration=Number((await client.query("SELECT session_duration_minutes FROM offerings WHERE id=$1",[order.offering_id])).rows[0].session_duration_minutes)||60;
      for(let index=0;index<dates.length;index++){
        const starts=dates[index],ends=new Date(starts.getTime()+duration*60000);
        const event=(await client.query(`INSERT INTO calendar_events(organizer_user_id,learning_journey_id,title,description,event_type,starts_at,ends_at,timezone,location_type,meeting_provider,recurrence_rule,metadata)
          VALUES($1::uuid,$2::uuid,$3,$4,'ONE_TO_ONE',$5,$6,$7,'ONLINE','MAZE_VIDEO',$8::jsonb,$9::jsonb) RETURNING id`,[order.owner_user_id,order.learning_journey_id,`${order.session_count}-class 1:1 package · Session ${index+1}`,"Private session requested by the learner",starts.toISOString(),ends.toISOString(),order.booking_timezone||"UTC",JSON.stringify({frequency:order.recurrence_frequency,count}),JSON.stringify({offeringOrderId:order.id,occurrence:index+1})])).rows[0];
        await client.query("INSERT INTO calendar_event_attendees(event_id,learner_profile_id,response_status) VALUES($1,$2::uuid,'ACCEPTED') ON CONFLICT DO NOTHING",[event.id,enrollment.learner_profile_id]);
        for(const minutes of[1440,60])await client.query("INSERT INTO calendar_event_reminders(event_id,minutes_before,channel) VALUES($1,$2,'EMAIL') ON CONFLICT DO NOTHING",[event.id,minutes]);
      }
    }
    if(order.billing_type==="MONTHLY")await client.query(`INSERT INTO offering_subscriptions(offering_order_id,learner_user_id,offering_id,stripe_subscription_id,status,weekly_class_count,monthly_amount,currency) VALUES($1,$2,$3,$4,'ACTIVE',$5,$6,$7) ON CONFLICT(offering_order_id) DO UPDATE SET stripe_subscription_id=COALESCE(EXCLUDED.stripe_subscription_id,offering_subscriptions.stripe_subscription_id),status='ACTIVE',updated_at=NOW()`,[order.id,order.learner_user_id,order.offering_id,stripeSubscriptionId,Math.max(1,count||1),order.amount,order.currency]);
    const updated = (await client.query(`UPDATE offering_orders SET status=$1,enrollment_id=$2::uuid,stripe_payment_intent_id=$3,stripe_subscription_id=$4,paid_at=NOW(),updated_at=NOW() WHERE id=$5::uuid RETURNING *`, [free?"FREE":"PAID",enrollment.id,paymentIntentId,stripeSubscriptionId,orderId])).rows[0];
    if(!free)await client.query(`INSERT INTO financial_ledger(educator_user_id,offering_order_id,learning_journey_id,entry_type,gross_amount,platform_fee_amount,educator_amount,currency,stripe_payment_intent_id,status,metadata) VALUES($1,$2,$3,'SALE',$4,$5,$6,$7,$8,'SUCCEEDED',$9::jsonb) ON CONFLICT DO NOTHING`,[order.owner_user_id,order.id,order.learning_journey_id,order.amount,Math.round(order.amount*Number(process.env.STRIPE_PLATFORM_FEE_PERCENT||5)/100),order.amount-Math.round(order.amount*Number(process.env.STRIPE_PLATFORM_FEE_PERCENT||5)/100),order.currency,paymentIntentId,JSON.stringify({billingType:order.billing_type,stripeSubscriptionId})]);
    const learnerAction=order.offering_type==="ONE_TO_ONE"?"/student/calendar":`/learn/journeys/${order.learning_journey_id}`;
    await notificationService.create({recipientUserId:order.owner_user_id,actorUserId:order.learner_user_id,type:"COURSE_PURCHASED",title:"New course purchase",body:`A learner purchased ${order.offering_title}. Open your calendar to review scheduled classes.`,actionUrl:"/calendar",entityType:"OFFERING_ORDER",entityId:order.id,deduplicationKey:`purchase-educator:${order.id}`},client);
    await notificationService.create({recipientUserId:order.learner_user_id,actorUserId:order.owner_user_id,type:"PURCHASE_CONFIRMED",title:"Your purchase was successful",body:order.offering_type==="ONE_TO_ONE"?`${order.offering_title} is confirmed. Your classes are ready in Calendar.`:`${order.offering_title} is ready in My Learning.`,actionUrl:learnerAction,entityType:"OFFERING_ORDER",entityId:order.id,deduplicationKey:`purchase-learner:${order.id}`},client);
    await client.query("COMMIT"); return updated;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function listSubscriptions(userId){return(await pool.query(`SELECT subscription.*,offering.title FROM offering_subscriptions subscription JOIN offerings offering ON offering.id=subscription.offering_id WHERE subscription.learner_user_id=$1 ORDER BY subscription.created_at DESC`,[userId])).rows;}
async function listPendingOrders(userId){return(await pool.query(`SELECT id,stripe_checkout_session_id FROM offering_orders WHERE learner_user_id=$1::uuid AND status='PENDING' AND stripe_checkout_session_id IS NOT NULL ORDER BY created_at`,[userId])).rows;}
async function listOrders(userId){return(await pool.query(`SELECT orders.id,orders.amount,orders.currency,orders.status,orders.billing_type,orders.paid_at,offering.title,refund.status refund_status FROM offering_orders orders JOIN offerings offering ON offering.id=orders.offering_id LEFT JOIN refund_requests refund ON refund.offering_order_id=orders.id WHERE orders.learner_user_id=$1 AND orders.status IN('PAID','REFUNDED') ORDER BY orders.created_at DESC`,[userId])).rows;}
async function updateSubscription(stripeId,status,cancelAtPeriodEnd=false,currentPeriodEnd=null){await pool.query("UPDATE offering_subscriptions SET status=$1,cancel_at_period_end=$2,current_period_end=$3,updated_at=NOW() WHERE stripe_subscription_id=$4",[String(status).toUpperCase(),cancelAtPeriodEnd,currentPeriodEnd,stripeId]);}
async function cancelSubscriptionEvents(stripeId,after){await pool.query(`UPDATE calendar_events event SET status='CANCELLED',updated_at=NOW() FROM offering_subscriptions subscription WHERE subscription.stripe_subscription_id=$1 AND event.metadata->>'offeringOrderId'=subscription.offering_order_id::text AND event.starts_at>$2::timestamptz`,[stripeId,after]);}
async function extendWeeklySchedule(orderId,weeks=16){const client=await pool.connect();try{await client.query("BEGIN");const row=(await client.query(`SELECT orders.*,offering.learning_journey_id,offering.owner_user_id,offering.title,offering.session_duration_minutes,enrollment.learner_profile_id FROM offering_orders orders JOIN offerings offering ON offering.id=orders.offering_id JOIN journey_enrollments enrollment ON enrollment.id=orders.enrollment_id WHERE orders.id=$1::uuid AND orders.billing_type='MONTHLY'`,[orderId])).rows[0];if(!row){await client.query("COMMIT");return}const templates=row.booking_settings?.sessionDates||[],duration=Number(row.session_duration_minutes)||60;for(const value of templates){let start=new Date(value);while(start<new Date())start=new Date(start.getTime()+7*86400000);for(let week=0;week<weeks;week++){const begins=new Date(start.getTime()+week*7*86400000),ends=new Date(begins.getTime()+duration*60000);const event=(await client.query(`INSERT INTO calendar_events(organizer_user_id,learning_journey_id,title,description,event_type,starts_at,ends_at,timezone,location_type,meeting_provider,metadata) SELECT $1,$2,$3,'Weekly subscription class','ONE_TO_ONE',$4,$5,$6,'ONLINE','MANUAL',$7::jsonb WHERE NOT EXISTS(SELECT 1 FROM calendar_events WHERE metadata->>'offeringOrderId'=$8 AND starts_at=$4::timestamptz) RETURNING id`,[row.owner_user_id,row.learning_journey_id,row.title,begins.toISOString(),ends.toISOString(),row.booking_timezone||"UTC",JSON.stringify({offeringOrderId:row.id,weeklySubscription:true}),row.id])).rows[0];if(event)await client.query("INSERT INTO calendar_event_attendees(event_id,learner_profile_id,response_status) VALUES($1,$2,'ACCEPTED') ON CONFLICT DO NOTHING",[event.id,row.learner_profile_id]);}}await client.query("COMMIT")}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}}

async function recordSubscriptionRenewal(orderId, invoice) {
  const order = (await pool.query(`SELECT orders.*,offering.owner_user_id,offering.learning_journey_id
    FROM offering_orders orders JOIN offerings offering ON offering.id=orders.offering_id
    WHERE orders.id=$1::uuid`, [orderId])).rows[0];
  if (!order) return;
  const gross = Number(invoice.amount_paid || order.amount || 0);
  const platformFee = Math.round(gross * Number(process.env.STRIPE_PLATFORM_FEE_PERCENT || 5) / 100);
  const chargeId = typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id || null;
  await pool.query(`INSERT INTO financial_ledger(
      educator_user_id,offering_order_id,learning_journey_id,entry_type,gross_amount,
      platform_fee_amount,educator_amount,currency,stripe_charge_id,status,metadata)
    VALUES($1,$2,$3,'SUBSCRIPTION_RENEWAL',$4,$5,$6,$7,$8,'SUCCEEDED',$9::jsonb)
    ON CONFLICT DO NOTHING`, [order.owner_user_id, order.id, order.learning_journey_id,
    gross, platformFee, gross-platformFee, String(invoice.currency || order.currency).toUpperCase(),
    chargeId, JSON.stringify({ stripeInvoiceId: invoice.id, stripeSubscriptionId: invoice.subscription })]);
}

async function extendWeeklyScheduleSafe(orderId,weeks=26){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const row=(await client.query(`SELECT orders.*,offering.learning_journey_id,offering.owner_user_id,offering.title,offering.session_duration_minutes,enrollment.learner_profile_id
      FROM offering_orders orders JOIN offerings offering ON offering.id=orders.offering_id
      JOIN journey_enrollments enrollment ON enrollment.id=orders.enrollment_id
      WHERE orders.id=$1::uuid AND orders.billing_type='MONTHLY'`,[orderId])).rows[0];
    if(!row){await client.query("COMMIT");return}
    const templates=row.booking_settings?.sessionDates||[],duration=Number(row.session_duration_minutes)||60;
    for(const value of templates){let start=new Date(value);while(start<new Date())start=new Date(start.getTime()+7*86400000);for(let week=0;week<weeks;week++){
      const begins=new Date(start.getTime()+week*7*86400000),ends=new Date(begins.getTime()+duration*60000);
      const event=(await client.query(`INSERT INTO calendar_events(organizer_user_id,learning_journey_id,title,description,event_type,starts_at,ends_at,timezone,location_type,meeting_provider,metadata)
        SELECT $1,$2,$3,'Weekly subscription class','ONE_TO_ONE',$4,$5,$6,'ONLINE','MAZE_VIDEO',$7::jsonb
        WHERE NOT EXISTS(SELECT 1 FROM calendar_events WHERE metadata->>'offeringOrderId'=$8 AND starts_at=$4::timestamptz)
          AND NOT EXISTS(SELECT 1 FROM calendar_events WHERE organizer_user_id=$1 AND status IN('SCHEDULED','IN_PROGRESS') AND starts_at<$5::timestamptz AND ends_at>$4::timestamptz)
        RETURNING id`,[row.owner_user_id,row.learning_journey_id,row.title,begins.toISOString(),ends.toISOString(),row.booking_timezone||"UTC",JSON.stringify({offeringOrderId:row.id,weeklySubscription:true}),row.id])).rows[0];
      if(event)await client.query("INSERT INTO calendar_event_attendees(event_id,learner_profile_id,response_status) VALUES($1,$2,'ACCEPTED') ON CONFLICT DO NOTHING",[event.id,row.learner_profile_id]);
    }}
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

module.exports = { listPublished, getPublished, getJourneyPublished, getPublicJourneyStructure, getPublicPreviewStep, listOpenCohorts, listAvailability, findBookingConflicts, createOrder, attachCheckout, saveCustomer, fulfillOrder, listSubscriptions, listPendingOrders, listOrders, updateSubscription, cancelSubscriptionEvents, extendWeeklySchedule:extendWeeklyScheduleSafe, recordSubscriptionRenewal };
