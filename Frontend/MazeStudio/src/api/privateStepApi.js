import { apiRequest } from "./api";
export const createPrivateStepLink=(stepId,body)=>apiRequest(`/steps/${stepId}/private-links`,{method:"POST",body:JSON.stringify(body)});
export const listPrivateStepLinks=(stepId)=>apiRequest(`/steps/${stepId}/private-links`);
export const revokePrivateStepLink=(linkId)=>apiRequest(`/step-private-links/${linkId}`,{method:"DELETE"});
export const getPrivateStepMetadata=(token)=>apiRequest(`/public/steps/private/${token}`);
export const startPrivateStepSession=(token)=>apiRequest(`/public/steps/private/${token}/session`,{method:"POST"});
export const completePrivateStep=(token,sessionToken)=>apiRequest(`/public/steps/private/${token}/complete`,{method:"PUT",headers:{"X-Step-Session":sessionToken}});
export const checkPrivateStepAnswer=(token,sessionToken,blockId,answer)=>apiRequest(`/public/steps/private/${token}/blocks/${blockId}/check-answer`,{method:"POST",headers:{"X-Step-Session":sessionToken},body:JSON.stringify({answer})});
