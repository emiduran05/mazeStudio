import { apiRequest } from "./api";

export const listChallenges = (journeyId) =>
  apiRequest(`/learning-journeys/${journeyId}/challenges`);
export const getChallenge = (id) => apiRequest(`/challenges/${id}`);
export const createChallenge = (body) =>
  apiRequest("/challenges", { method: "POST", body: JSON.stringify(body) });
export const updateChallenge = (id, body) =>
  apiRequest(`/challenges/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteChallenge = (id) =>
  apiRequest(`/challenges/${id}`, { method: "DELETE" });
export const createChallengeBlock = (id, body) =>
  apiRequest(`/challenges/${id}/blocks`, { method: "POST", body: JSON.stringify(body) });
export const updateChallengeBlock = (id, body) =>
  apiRequest(`/challenge-blocks/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteChallengeBlock = (id) =>
  apiRequest(`/challenge-blocks/${id}`, { method: "DELETE" });
export const reorderChallengeBlocks = (id, blockIds) =>
  apiRequest(`/challenges/${id}/blocks/reorder`, {
    method: "PATCH", body: JSON.stringify({ blockIds }),
  });
export const uploadChallengeBlockAsset = (id, file) => {
  const body = new FormData();
  body.append("file", file);
  return apiRequest(`/challenge-blocks/${id}/asset`, { method: "POST", body });
};
export const attachChallengeStep = (id, body) =>
  apiRequest(`/challenges/${id}/steps`, { method: "POST", body: JSON.stringify(body) });
export const detachChallengeStep = (id, stepId) =>
  apiRequest(`/challenges/${id}/steps/${stepId}`, { method: "DELETE" });
export const getChallengeAssignments = (id) =>
  apiRequest(`/challenges/${id}/assignments`);
export const getAssignableLearners = (id) =>
  apiRequest(`/challenges/${id}/assignable-learners`);
export const assignChallengeLearner = (id, enrollmentId) =>
  apiRequest(`/challenges/${id}/assignments`, {
    method: "POST",
    body: JSON.stringify({ enrollmentId }),
  });
export const revokeChallengeAssignment = (id, enrollmentId) =>
  apiRequest(`/challenges/${id}/assignments/${enrollmentId}`, {
    method: "DELETE",
  });
export const getSubmissions = (id, query = "") =>
  apiRequest(`/challenges/${id}/attempts${query}`);
export const getSubmission = (id) => apiRequest(`/challenge-attempts/${id}`);
export const reviewSubmission = (id, body) =>
  apiRequest(`/challenge-attempts/${id}/review`, { method: "PUT", body: JSON.stringify(body) });
export const createPrivateLink = (id, body) =>
  apiRequest(`/challenges/${id}/private-links`, { method: "POST", body: JSON.stringify(body) });
export const getPrivateLinks = (id) => apiRequest(`/challenges/${id}/private-links`);
export const revokePrivateLink = (id) =>
  apiRequest(`/challenge-private-links/${id}`, { method: "DELETE" });
export const getLearnerChallenge = (id) => apiRequest(`/learner/challenges/${id}`);
export const getAssignedChallenges = (journeyId) =>
  apiRequest(`/learner/challenges${journeyId ? `?journeyId=${journeyId}` : ""}`);
export const submitLearnerChallenge = (id, answers) =>
  apiRequest(`/learner/challenges/${id}/attempts`, { method: "POST", body: JSON.stringify({ answers }) });
export const getPrivateChallenge = (token) => apiRequest(`/public/challenges/private/${token}`);
export const startPrivateSession = (token, body) =>
  apiRequest(`/public/challenges/private/${token}/session`, { method: "POST", body: JSON.stringify(body) });
export const submitPrivateChallenge = (token, body) =>
  apiRequest(`/public/challenges/private/${token}/attempts`, { method: "POST", body: JSON.stringify(body) });
export const getPrivateAttempt = (token, attemptToken, sessionToken) =>
  apiRequest(`/public/challenges/private/${token}/attempts/${attemptToken}`, {
    headers: { "X-Challenge-Session": sessionToken },
  });
