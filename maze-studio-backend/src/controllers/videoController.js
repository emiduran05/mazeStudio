const service = require("../services/dailyVideoService");
async function access(req,res,next){try{res.json(await service.getAccess(req.params.eventId,req.user.id))}catch(error){next(error)}}
async function leave(req,res,next){try{res.json(await service.leave(req.params.eventId,req.user.id))}catch(error){next(error)}}
module.exports={access,leave};
