const service=require("../services/sessionIncidentService");
async function report(req,res,next){try{res.status(201).json({incident:await service.report(req.user.id,req.params.eventId,req.body)});}catch(e){next(e)}}
async function list(req,res,next){try{res.json({incidents:await service.list(req.user,req.query.audience)});}catch(e){next(e)}}
async function respond(req,res,next){try{res.json(await service.respond(req.user.id,req.params.id,req.body));}catch(e){next(e)}}
module.exports={report,list,respond};
