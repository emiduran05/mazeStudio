const service = require("../services/educatorProfileService");
async function mine(req,res,next){try{res.json({profile:await service.getMine(req.user.id)});}catch(e){next(e)}}
async function save(req,res,next){try{res.json({profile:await service.save(req.user.id,req.body)});}catch(e){next(e)}}
async function upload(req,res,next){try{res.json({asset:await service.uploadAsset(req.user.id,req.file)});}catch(e){next(e)}}
async function publicProfile(req,res,next){try{res.json({profile:await service.getPublic(req.params.identifier)});}catch(e){next(e)}}
module.exports={mine,save,upload,publicProfile};
