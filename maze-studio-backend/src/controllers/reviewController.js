const service=require("../services/reviewService");
async function save(req,res,next){try{res.json({review:await service.save(req.user.id,req.params.journeyId,req.body)})}catch(e){next(e)}}
async function journey(req,res,next){try{res.json(await service.journey(req.params.journeyId,req.user?.id||null))}catch(e){next(e)}}
async function educator(req,res,next){try{res.json(await service.educator(req.params.educatorId))}catch(e){next(e)}}
module.exports={save,journey,educator};
