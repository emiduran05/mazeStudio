const model=require("../models/notificationModel");
async function list(req,res,next){try{res.json(await model.list(req.user.id,{unread:req.query.unread==="true",limit:req.query.limit}));}catch(e){next(e)}}
async function markRead(req,res,next){try{const item=await model.markRead(req.user.id,req.params.id);if(!item){const e=new Error("Notification not found");e.statusCode=404;throw e}res.json({notification:item});}catch(e){next(e)}}
async function markAll(req,res,next){try{res.json({updated:await model.markAllRead(req.user.id)});}catch(e){next(e)}}
async function preferences(req,res,next){try{res.json({preferences:await model.getPreferences(req.user.id)});}catch(e){next(e)}}
async function updatePreferences(req,res,next){try{res.json({preferences:await model.updatePreferences(req.user.id,req.body)});}catch(e){next(e)}}
module.exports={list,markRead,markAll,preferences,updatePreferences};
