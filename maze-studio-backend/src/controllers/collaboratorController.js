const service=require("../services/collaboratorService");
async function list(req,res,next){try{res.json({collaborators:await service.list(req.user.id,req.params.journeyId)})}catch(e){next(e)}}
async function add(req,res,next){try{res.status(201).json(await service.add(req.user.id,req.params.journeyId,req.body))}catch(e){next(e)}}
async function update(req,res,next){try{res.json(await service.update(req.user.id,req.params.journeyId,req.params.collaboratorId,req.body.role))}catch(e){next(e)}}
async function remove(req,res,next){try{res.json(await service.remove(req.user.id,req.params.journeyId,req.params.collaboratorId))}catch(e){next(e)}}
module.exports={list,add,update,remove};
