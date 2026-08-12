const service=require("../services/aiContentService"),journeys=require("../services/aiJourneyService");
async function generate(req,res,next){try{res.json({draft:await service.generate(req.user.id,req.params.stepId,{...req.body,file:req.file})})}catch(error){next(error)}}
async function apply(req,res,next){try{res.status(201).json({blocks:await service.apply(req.user.id,req.params.stepId,req.body.blocks)})}catch(error){next(error)}}
async function generateJourney(req,res,next){try{res.json({draft:await journeys.generate(req.user.id,req.params.journeyId,req.body)})}catch(error){next(error)}}
async function applyJourney(req,res,next){try{res.status(201).json(await journeys.apply(req.user.id,req.params.journeyId,req.body))}catch(error){next(error)}}
module.exports={generate,apply,generateJourney,applyJourney};
