const model=require("../models/calendarModel");
async function list(req,res,next){try{if(req.user.role!=="EDUCATOR")await require("../services/marketplaceService").reconcilePurchases(req.user.id);const from=req.query.from||new Date().toISOString();const to=req.query.to||new Date(Date.now()+31*86400000).toISOString();res.json({events:await model.list(req.user,from,to)});}catch(e){next(e)}}
async function create(req,res,next){try{if(!req.body.title?.trim()||!req.body.startsAt||!req.body.endsAt){const e=new Error("Title, start and end are required");e.statusCode=400;throw e}res.status(201).json({event:await model.create(req.user.id,req.body)});}catch(e){next(e)}}
async function remove(req,res,next){try{const event=await model.remove(req.user.id,req.params.eventId);if(!event){const e=new Error("Event not found");e.statusCode=404;throw e}res.json({message:"Event deleted"});}catch(e){next(e)}}
module.exports={list,create,remove};
