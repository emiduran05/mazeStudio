const service = require("../services/challengeService");

const action = (handler, status = 200) => async (req, res, next) => {
  try {
    const result = await handler(req);
    if (status === 204) return res.status(204).end();
    return res.status(status).json(result);
  } catch (error) { return next(error); }
};

module.exports = {
  create: action((req) => service.createChallenge(req.user.id, req.body), 201),
  list: action(async (req) => ({ challenges: await service.listJourneyChallenges(req.user.id, req.params.journeyId) })),
  get: action((req) => service.getEducatorChallenge(req.user.id, req.params.challengeId)),
  update: action((req) => service.updateChallenge(req.user.id, req.params.challengeId, req.body)),
  remove: action((req) => service.archiveChallenge(req.user.id, req.params.challengeId), 204),
  attachStep: action((req) => service.attachStep(req.user.id, req.params.challengeId, req.body), 201),
  detachStep: action((req) => service.detachStep(req.user.id, req.params.challengeId, req.params.stepId), 204),
  createBlock: action((req) => service.createChallengeBlock(req.user.id, req.params.challengeId, req.body), 201),
  updateBlock: action((req) => service.updateChallengeBlock(req.user.id, req.params.blockId, req.body)),
  deleteBlock: action((req) => service.deleteChallengeBlock(req.user.id, req.params.blockId), 204),
  reorderBlocks: action((req) => service.reorderChallengeBlocks(req.user.id, req.params.challengeId, req.body.blockIds || [])),
  uploadBlockAsset: action((req) => service.uploadChallengeBlockAsset(req.user.id, req.params.blockId, req.file)),
  assignments: action(async (req) => ({
    assignments: await service.listAssignments(req.user.id, req.params.challengeId),
  })),
  assignableLearners: action(async (req) => ({
    learners: await service.listAssignableLearners(req.user.id, req.params.challengeId),
  })),
  assignLearner: action((req) =>
    service.assignLearner(
      req.user.id,
      req.params.challengeId,
      req.body.enrollmentId
    ), 201),
  revokeAssignment: action((req) =>
    service.revokeAssignment(
      req.user.id,
      req.params.challengeId,
      req.params.enrollmentId
    )),
  attempts: action(async (req) => ({ attempts: await service.educatorAttempts(req.user.id, req.params.challengeId, req.query) })),
  attempt: action((req) => service.educatorAttempt(req.user.id, req.params.attemptId)),
  review: action((req) => service.reviewAttempt(req.user.id, req.params.attemptId, req.body)),
  createLink: action((req) => service.createPrivateLink(req.user.id, req.params.challengeId, req.body), 201),
  links: action(async (req) => ({ links: await service.listPrivateLinks(req.user.id, req.params.challengeId) })),
  updateLink: action((req) => service.updatePrivateLink(req.user.id, req.params.linkId, req.body)),
  revokeLink: action((req) => service.revokePrivateLink(req.user.id, req.params.linkId), 204),
  learnerGet: action((req) => service.getLearnerChallenge(req.user.id, req.params.challengeId)),
  learnerList: action(async (req) => ({
    challenges: await service.listAssignedChallenges(
      req.user.id,
      req.query.journeyId || null
    ),
  })),
  learnerSubmit: action(async (req) => ({ attempt: await service.submitLearnerAttempt(req.user.id, req.params.challengeId, req.body.answers || {}) }), 201),
  learnerSpeakingUpload: action(async (req) => ({ asset: await service.uploadSpeakingResponse(req.user.id, req.params.challengeId, req.file) }), 201),
  learnerAttempts: action(async (req) => ({ attempts: await service.learnerAttempts(req.user.id, req.params.challengeId) })),
  learnerAttempt: action((req) => service.learnerAttempt(req.user.id, req.params.attemptId)),
  privateMetadata: action((req) => service.getPrivateMetadata(req.params.token)),
  privateSession: action((req) => service.createPrivateSession(req.params.token, req.body), 201),
  privateSubmit: action((req) => service.submitPrivateAttempt(req.params.token, req.body), 201),
  privateSpeakingUpload: action(async (req) => ({ asset: await service.uploadPrivateSpeakingResponse(req.params.token, req.body.sessionToken, req.file) }), 201),
  privateAttempt: action((req) => service.privateAttempt(req.params.token, req.params.attemptToken, req.headers["x-challenge-session"])),
};
