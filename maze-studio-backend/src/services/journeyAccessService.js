const model=require("../models/collaboratorModel");
const EDIT_ROLES=new Set(["OWNER","EDITOR"]);
const TEACH_ROLES=new Set(["OWNER","EDITOR","INSTRUCTOR"]);

async function requireAccess(userId,journeyId,capability="VIEW") {
  const access=await model.getAccess(userId,journeyId);
  if(!access||!access.has_access){const error=new Error("You do not have access to this Learning Journey");error.statusCode=403;throw error}
  if(capability==="EDIT"&&!EDIT_ROLES.has(access.access_role)){const error=new Error("Editor permission is required");error.statusCode=403;throw error}
  if(capability==="TEACH"&&!TEACH_ROLES.has(access.access_role)){const error=new Error("Instructor permission is required");error.statusCode=403;throw error}
  if(capability==="OWNER"&&access.access_role!=="OWNER"){const error=new Error("Only the Journey owner can do this");error.statusCode=403;throw error}
  return access;
}
module.exports={requireAccess};
