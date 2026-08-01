const stripe = require("../config/stripe");
const pool = require("../config/db");
const model = require("../models/marketplaceModel");
const connectService=require("./connectService");

const GROUP_TYPES = new Set(["COHORT", "HYBRID", "WEBINAR"]);

function zonedParts(date,timeZone){const parts=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);return Object.fromEntries(parts.map(part=>[part.type,part.value]));}
function zonedLocalToUtc(year,month,day,hour,minute,timeZone){const desired=Date.UTC(year,month-1,day,hour,minute);let guess=new Date(desired);for(let i=0;i<2;i++){const p=zonedParts(guess,timeZone),represented=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);guess=new Date(guess.getTime()+desired-represented)}return guess;}
async function buildAvailableSlots(offering,from,to){
  const availability=offering.settings?.bookingAvailability,weekly=availability?.weekly||[],timeZone=availability?.timezone;
  if(!timeZone||!weekly.length)return[];const start=new Date(from),finish=new Date(to),duration=Number(offering.session_duration_minutes)||60,step=Number(availability.slotIntervalMinutes)||30;
  const busy=await model.listAvailability(offering.id,start.toISOString(),finish.toISOString()),slots=[];
  for(let cursor=new Date(start);cursor<finish;cursor.setUTCDate(cursor.getUTCDate()+1)){
    const local=zonedParts(cursor,timeZone),weekday=new Date(Date.UTC(+local.year,+local.month-1,+local.day)).getUTCDay();
    for(const rule of weekly.filter(item=>Number(item.day)===weekday)){
      const [startHour,startMinute]=rule.start.split(":").map(Number),[endHour,endMinute]=rule.end.split(":").map(Number);const limit=endHour*60+endMinute;
      for(let minutes=startHour*60+startMinute;minutes+duration<=limit;minutes+=step){const slotStart=zonedLocalToUtc(+local.year,+local.month,+local.day,Math.floor(minutes/60),minutes%60,timeZone),slotEnd=new Date(slotStart.getTime()+duration*60000);if(slotStart<=new Date()||slotStart<start||slotStart>=finish)continue;if(!busy.some(event=>new Date(event.starts_at)<slotEnd&&new Date(event.ends_at)>slotStart))slots.push(slotStart.toISOString())}
    }
  }
  return [...new Set(slots)].sort();
}

async function catalog(query) {
  const offers=await model.listPublished({ search: String(query.search || ""), type: String(query.type || "") });
  const grouped=new Map();
  for(const offer of offers){
    if(!grouped.has(offer.learning_journey_id)) grouped.set(offer.learning_journey_id,{id:offer.learning_journey_id,title:offer.journey_title,description:offer.journey_description,cover_url:offer.cover_url,difficulty:offer.difficulty,language:offer.language,estimated_minutes:offer.estimated_minutes,educator_name:offer.educator_name,educator_id:offer.educator_id,educator_avatar_url:offer.educator_avatar_url,educator_slug:offer.educator_slug,minimum_price:offer.price_amount,currency:offer.currency,experiences:[]});
    const journey=grouped.get(offer.learning_journey_id);journey.minimum_price=Math.min(journey.minimum_price,offer.price_amount);journey.experiences.push({id:offer.id,title:offer.title,offering_type:offer.offering_type,price_amount:offer.price_amount,currency:offer.currency,session_count:offer.session_count});
  }
  return [...grouped.values()];
}

async function detail(journeyId, userId = null) {
  const offerings=await model.getJourneyPublished(journeyId,userId);
  if(!offerings.length) throw Object.assign(new Error("This Learning Journey is not available"),{statusCode:404});
  const experiences=await Promise.all(offerings.map(async offering=>({...offering,cohorts:GROUP_TYPES.has(offering.offering_type)?await model.listOpenCohorts(offering.id):[]})));
  const first=offerings[0];
  const rows=await model.getPublicJourneyStructure(journeyId),stagesById=new Map();
  for(const row of rows){if(!stagesById.has(row.stage_id))stagesById.set(row.stage_id,{id:row.stage_id,parentStageId:row.parent_stage_id,title:row.stage_title,description:row.stage_description,position:row.stage_position,steps:[],children:[]});if(row.step_id)stagesById.get(row.stage_id).steps.push({id:row.step_id,title:row.step_title,description:row.step_description,position:row.step_position,estimatedMinutes:row.estimated_minutes,isPreview:Boolean(row.is_preview),icon:row.icon,emoji:row.emoji})}
  for(const stage of stagesById.values())if(stage.parentStageId&&stagesById.has(stage.parentStageId))stagesById.get(stage.parentStageId).children.push(stage);
  const structure=[...stagesById.values()].filter(stage=>!stage.parentStageId||!stagesById.has(stage.parentStageId));
  return {journey:{id:journeyId,title:first.journey_title,description:first.journey_description,cover_url:first.cover_url,difficulty:first.difficulty,language:first.language,estimated_minutes:first.estimated_minutes,educator_name:first.educator_name,educator_id:first.educator_id,educator_avatar_url:first.educator_avatar_url,educator_slug:first.educator_slug},experiences,structure};
}

async function previewStep(journeyId,stepId){const step=await model.getPublicPreviewStep(journeyId,stepId);if(!step)throw Object.assign(new Error("This Step is not available as a free preview"),{statusCode:404});return step;}

async function beginEnrollment(user, offeringId, cohortId = null, booking = {}) {
  const offering=await model.getPublished(offeringId,user.id);
  if(!offering) throw Object.assign(new Error("This offer is not available"),{statusCode:404});
  const cohorts=GROUP_TYPES.has(offering.offering_type)?await model.listOpenCohorts(offeringId):[];
  if (GROUP_TYPES.has(offering.offering_type)) {
    const selected = cohorts.find(item => item.id === cohortId);
    if (!selected) throw Object.assign(new Error("Select an available group"), { statusCode: 400 });
  } else cohortId = null;
  if(offering.offering_type==="ONE_TO_ONE"){
    booking.sessionCount=Number(booking.sessionCount);
    if(!Number.isInteger(booking.sessionCount)||booking.sessionCount<1||booking.sessionCount>52) throw Object.assign(new Error("Choose between 1 and 52 private classes"),{statusCode:400});
    if(!["CUSTOM","WEEKLY"].includes(booking.frequency)) throw Object.assign(new Error("Choose a flexible or weekly schedule"),{statusCode:400});
    if(booking.frequency==="WEEKLY"){const active=(await model.listSubscriptions(user.id)).find(item=>item.offering_id===offering.id&&["ACTIVE","TRIALING"].includes(item.status));if(active)throw Object.assign(new Error("You already have an active weekly subscription for this experience"),{statusCode:409});}
    if(!Array.isArray(booking.sessionDates)||booking.sessionDates.length!==booking.sessionCount) throw Object.assign(new Error("Choose one calendar date for every private class"),{statusCode:400});
    const dates=booking.sessionDates.map(value=>new Date(value));if(dates.some(date=>Number.isNaN(date.getTime())||date<=new Date()))throw Object.assign(new Error("All private classes must use valid future dates"),{statusCode:400});
    if(new Set(dates.map(date=>date.toISOString())).size!==dates.length)throw Object.assign(new Error("Private classes cannot share the same date and time"),{statusCode:400});
    booking.sessionDates=dates.sort((a,b)=>a-b).map(date=>date.toISOString());booking.firstSessionAt=booking.sessionDates[0];
    const offered=await buildAvailableSlots(offering,new Date().toISOString(),new Date(Date.now()+730*86400000).toISOString()),offeredSet=new Set(offered);
    if(booking.sessionDates.some(value=>!offeredSet.has(value)))throw Object.assign(new Error("One or more selected times are outside the educator's current availability"),{statusCode:409});
    const duration=Number(offering.session_duration_minutes)||60;
    const slots=booking.sessionDates.map(value=>{const startsAt=new Date(value);return{starts_at:startsAt.toISOString(),ends_at:new Date(startsAt.getTime()+duration*60000).toISOString()}});
    const conflicts=await model.findBookingConflicts(offering.id,slots);
    if(conflicts.length) throw Object.assign(new Error("One or more selected class times are unavailable. Choose another first date or frequency."),{statusCode:409,conflicts});
  }
  let order;
  try { order = await model.createOrder(offering, user.id, cohortId, offering.price_amount === 0 ? "FREE" : "PENDING",booking); }
  catch (error) {
    if (error.code === "23505") throw Object.assign(new Error("You already started or completed enrollment for this offer"), { statusCode: 409 });
    throw error;
  }
  if (offering.price_amount === 0) {
    await model.fulfillOrder(order.id, null, true);
    return { enrolled: true, redirectUrl: `/learn/journeys/${offering.learning_journey_id}` };
  }
  if (!process.env.FRONTEND_URL) throw new Error("FRONTEND_URL is missing");
  const base = process.env.FRONTEND_URL.replace(/\/+$/, "");
  const recurring=order.billing_type==="MONTHLY";
  const destination=await connectService.destinationForEducator(offering.owner_user_id),platformFee=Math.round(order.amount*destination.feePercent/100);
  const buyer=(await pool.query("SELECT stripe_customer_id,first_name,last_name,email FROM users WHERE id=$1::uuid",[user.id])).rows[0];
  let stripeCustomerId=buyer?.stripe_customer_id;
  if(!stripeCustomerId){
    const customer=await stripe.customers.create({email:buyer?.email||user.email,name:`${buyer?.first_name||""} ${buyer?.last_name||""}`.trim()||undefined,metadata:{mazeStudioUserId:user.id,role:"LEARNER"}});
    stripeCustomerId=customer.id;
    await model.saveCustomer(user.id,stripeCustomerId);
  }
  const session = await stripe.checkout.sessions.create({
    mode: recurring?"subscription":"payment",
    customer: stripeCustomerId,
    client_reference_id: user.id,
    line_items: [{ quantity: 1, price_data: { currency: offering.currency.toLowerCase(), unit_amount: order.amount,
      ...(recurring?{recurring:{interval:"month"}}:{}),product_data: { name: recurring?`${offering.title} · ${order.session_count} classes every week`:offering.offering_type==="ONE_TO_ONE"?`${offering.title} · ${order.session_count} classes`:offering.title, description: (offering.description || offering.journey_description || "Maze Studio Learning Journey").slice(0, 500) } } }],
    success_url: `${base}/marketplace/journeys/${offering.learning_journey_id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/marketplace/journeys/${offering.learning_journey_id}?checkout=cancelled`,
    metadata: { mazeStudioCheckoutKind: recurring?"OFFERING_WEEKLY_SUBSCRIPTION":"OFFERING_PURCHASE", mazeStudioOrderId: order.id, mazeStudioUserId: user.id },
    ...(recurring?{subscription_data:{application_fee_percent:destination.feePercent,transfer_data:{destination:destination.accountId},metadata:{mazeStudioCheckoutKind:"OFFERING_WEEKLY_SUBSCRIPTION",mazeStudioOrderId:order.id,mazeStudioUserId:user.id}}}:{payment_intent_data:{application_fee_amount:platformFee,transfer_data:{destination:destination.accountId},metadata:{mazeStudioOrderId:order.id,mazeStudioOfferingId:offering.id}}}),
    allow_promotion_codes: true,
  });
  await model.attachCheckout(order.id, session.id);
  return { checkoutUrl: session.url, orderId: order.id };
}

async function availability(offeringId,query){
  const offering=await model.getPublished(offeringId,null);if(!offering||offering.offering_type!=="ONE_TO_ONE")throw Object.assign(new Error("Private class availability was not found"),{statusCode:404});
  const from=query.from||new Date().toISOString(),to=query.to||new Date(Date.now()+90*86400000).toISOString();
  return {slots:await buildAvailableSlots(offering,from,to),educatorTimezone:offering.settings?.bookingAvailability?.timezone||null};
}

async function confirm(userId, sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!["OFFERING_PURCHASE","OFFERING_WEEKLY_SUBSCRIPTION"].includes(session.metadata?.mazeStudioCheckoutKind) || session.metadata?.mazeStudioUserId !== userId) {
    throw Object.assign(new Error("Checkout does not belong to this account"), { statusCode: 403 });
  }
  if (session.payment_status !== "paid") return { enrolled: false, paymentStatus: session.payment_status };
  if(session.customer)await model.saveCustomer(userId,typeof session.customer==="string"?session.customer:session.customer.id);
  const order = await model.fulfillOrder(session.metadata.mazeStudioOrderId, session.payment_intent, false,session.subscription||null);
  const destination = (await pool.query(`SELECT offering.learning_journey_id FROM offering_orders orders JOIN offerings offering ON offering.id=orders.offering_id WHERE orders.id=$1::uuid`, [order.id])).rows[0];
  return { enrolled: true, paymentStatus: session.payment_status, redirectUrl: `/learn/journeys/${destination.learning_journey_id}` };
}

async function reconcilePurchases(userId){
  const pending=await model.listPendingOrders(userId);
  for(const order of pending){
    try{
      const session=await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
      if(session.status==="complete"&&session.payment_status==="paid"){
        if(session.customer)await model.saveCustomer(userId,typeof session.customer==="string"?session.customer:session.customer.id);
        await model.fulfillOrder(order.id,session.payment_intent||null,false,session.subscription||null);
      }
    }catch(error){console.error(`Could not reconcile Marketplace order ${order.id}:`,error.message);}
  }
}
async function subscriptions(userId){await reconcilePurchases(userId);return model.listSubscriptions(userId);}
async function orders(userId){await reconcilePurchases(userId);return model.listOrders(userId);}
async function cancelSubscription(userId,id){const rows=await model.listSubscriptions(userId),item=rows.find(row=>row.id===id);if(!item)throw Object.assign(new Error("Subscription not found"),{statusCode:404});if(!item.stripe_subscription_id)throw Object.assign(new Error("Stripe subscription is not ready"),{statusCode:409});const subscription=await stripe.subscriptions.update(item.stripe_subscription_id,{cancel_at_period_end:true});const end=subscription.current_period_end?new Date(subscription.current_period_end*1000):new Date();await model.updateSubscription(subscription.id,subscription.status,true,end);await model.cancelSubscriptionEvents(subscription.id,end);return{cancelAtPeriodEnd:true,currentPeriodEnd:subscription.current_period_end};}

module.exports = { catalog, detail, previewStep, beginEnrollment, confirm, availability, subscriptions, orders, cancelSubscription, reconcilePurchases, buildAvailableSlots };
