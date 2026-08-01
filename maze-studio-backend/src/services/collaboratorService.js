const model=require("../models/collaboratorModel");
const accessService=require("./journeyAccessService");
const ROLES=new Set(["EDITOR","INSTRUCTOR","VIEWER"]);
function validRole(role){if(!ROLES.has(role)){const e=new Error("Invalid collaborator role");e.statusCode=400;throw e}}
async function list(ownerId,journeyId){await accessService.requireAccess(ownerId,journeyId,"OWNER");return model.list(journeyId)}
async function add(ownerId,journeyId,data={}){await accessService.requireAccess(ownerId,journeyId,"OWNER");validRole(data.role);const email=String(data.email||"").trim();const user=await model.findEligibleByEmail(email);if(!user){const e=new Error("No registered account was found for this email");e.statusCode=404;throw e}if(user.id===ownerId){const e=new Error("The owner is already part of this Journey");e.statusCode=409;throw e}if(user.role!=="EDUCATOR"||user.status!=="ACTIVE"||!["ACTIVE","TRIALING"].includes(String(user.subscription_status||"").toUpperCase())){const e=new Error("The collaborator needs an active Educator subscription");e.statusCode=409;throw e}await model.upsert(journeyId,user.id,data.role,ownerId);return {collaborators:await model.list(journeyId)}}
async function update(ownerId,journeyId,id,role){await accessService.requireAccess(ownerId,journeyId,"OWNER");validRole(role);if(!await model.updateRole(journeyId,id,role)){const e=new Error("Collaborator not found");e.statusCode=404;throw e}return {collaborators:await model.list(journeyId)}}
async function remove(ownerId,journeyId,id){await accessService.requireAccess(ownerId,journeyId,"OWNER");if(!await model.revoke(journeyId,id)){const e=new Error("Collaborator not found");e.statusCode=404;throw e}return {collaborators:await model.list(journeyId)}}
module.exports={list,add,update,remove};
