const service=require("../services/privateStepService");
const action=(handler,status=200)=>async(req,res,next)=>{try{const value=await handler(req);if(status===204)return res.status(204).end();res.status(status).json(value)}catch(error){next(error)}};
module.exports={
  create:action((req)=>service.createLink(req.user.id,req.params.stepId,req.body),201),
  list:action(async(req)=>({links:await service.listLinks(req.user.id,req.params.stepId)})),
  revoke:action((req)=>service.revokeLink(req.user.id,req.params.linkId),204),
  metadata:action((req)=>service.metadata(req.params.token)),
  session:action((req)=>service.startSession(req.params.token),201),
  complete:action((req)=>service.complete(req.params.token,req.headers["x-step-session"])),
  check:action((req)=>service.checkAnswer(req.params.token,req.headers["x-step-session"],req.params.blockId,req.body.answer)),
};
