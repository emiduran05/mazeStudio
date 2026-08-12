const model = require("../models/offeringModel");
const access = require("../services/journeyAccessService");
const TYPES = new Set(["SELF_PACED","ONE_TO_ONE","COHORT"]);
const PAYMENT_MODELS = new Set(["ONE_TIME","MONTHLY","PER_SESSION","FLEXIBLE"]);
const ACCESS_POLICIES = new Set(["LIFETIME","WHILE_ACTIVE","FIXED_DAYS"]);
const httpError = (message,statusCode=400) => Object.assign(new Error(message),{statusCode});

function validate(input) {
  if (!input.title?.trim()) throw httpError("Title is required");
  if (!TYPES.has(input.offeringType)) throw httpError("Invalid offering type");
  if (Number(input.priceAmount)<0) throw httpError("Price cannot be negative");
  const paymentModel=input.paymentModel||"ONE_TIME",accessPolicy=input.accessPolicy||"LIFETIME";
  if (!PAYMENT_MODELS.has(paymentModel)) throw httpError("Invalid payment model");
  if (!ACCESS_POLICIES.has(accessPolicy)) throw httpError("Invalid content access policy");
  if (accessPolicy==="FIXED_DAYS"&&!Number(input.accessDurationDays)) throw httpError("Set how many days content remains available");
  if (input.offeringType==="ONE_TO_ONE"&&paymentModel!=="FLEXIBLE") throw httpError("1:1 experiences use flexible package or monthly billing");
  if (input.offeringType==="SELF_PACED"&&paymentModel!=="ONE_TIME") throw httpError("Self-paced experiences use one complete payment");
  if (input.offeringType==="SELF_PACED"&&accessPolicy!=="LIFETIME") throw httpError("Self-paced purchases always include permanent content access");
  if (paymentModel==="MONTHLY"&&accessPolicy==="LIFETIME") throw httpError("Monthly experiences must use active-subscription or fixed-duration access");
  if (input.offeringType==="ONE_TO_ONE"&&input.settings?.bookingAvailability) {
    const availability=input.settings.bookingAvailability;
    try { new Intl.DateTimeFormat("en",{timeZone:availability.timezone}).format(); }
    catch { throw httpError("Choose a valid IANA timezone for private bookings"); }
    if (!Array.isArray(availability.weekly)||!availability.weekly.length) throw httpError("Choose at least one available weekday");
    if (availability.weekly.some(rule=>!Number.isInteger(Number(rule.day))||Number(rule.day)<0||Number(rule.day)>6||!/^\d{2}:\d{2}$/.test(rule.start)||!/^\d{2}:\d{2}$/.test(rule.end)||rule.start>=rule.end)) throw httpError("Choose valid private booking hours");
  }
}

function validatePublishing(item) {
  if (item.price_amount<0) throw httpError("Set a valid price before publishing");
  if (item.offering_type==="ONE_TO_ONE"&&!item.session_duration_minutes) throw httpError("Set the duration of each private class before publishing");
  if (item.offering_type==="ONE_TO_ONE"&&(!item.settings?.bookingAvailability?.timezone||!item.settings?.bookingAvailability?.weekly?.length)) throw httpError("Set your weekly availability and timezone before publishing private classes");
  if (item.offering_type==="COHORT"&&(!item.session_count||!item.session_duration_minutes)) throw httpError("Cohort experiences need a session count and duration before publishing");
  if (item.offering_type==="COHORT"&&!item.capacity) throw httpError("Set cohort capacity before publishing this offer");
}

async function list(req,res,next){try{await access.requireAccess(req.user.id,req.params.journeyId,"VIEW");res.json({offerings:await model.list(req.params.journeyId)})}catch(error){next(error)}}
async function create(req,res,next){try{await access.requireAccess(req.user.id,req.params.journeyId,"OWNER");validate(req.body);res.status(201).json({offering:await model.create(req.user.id,req.params.journeyId,{...req.body,title:req.body.title.trim()})})}catch(error){next(error)}}
async function update(req,res,next){try{if(req.body.offeringType)validate(req.body);if(req.body.status==="PUBLISHED"){const current=await model.getById(req.user.id,req.params.offeringId);if(!current)throw httpError("Offering not found",404);validatePublishing(current)}const offering=await model.update(req.user.id,req.params.offeringId,req.body);if(!offering)throw httpError("Offering not found",404);res.json({offering})}catch(error){next(error)}}
async function remove(req,res,next){try{const item=await model.archive(req.user.id,req.params.offeringId);if(!item)throw httpError("Offering not found",404);res.json({message:"Offering archived"})}catch(error){next(error)}}
module.exports={list,create,update,remove};
