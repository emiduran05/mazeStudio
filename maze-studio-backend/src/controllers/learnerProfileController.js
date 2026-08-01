const service = require("../services/learnerProfileService");

const action = (handler, status = 200) => async (req, res, next) => {
  try { res.status(status).json(await handler(req)); }
  catch (error) { next(error); }
};

module.exports = {
  create: action((req) => service.createManagedLearner(req.user.id, req.params.journeyId, req.body), 201),
  list: action(async (req) => ({ learners: await service.listEducatorLearners(req.user.id) })),
  invite: action((req) => service.createLinkInvitation(req.user.id, req.params.profileId, req.body), 201),
  invitation: action((req) => service.getLinkInvitation(req.query.token)),
  accept: action((req) => service.acceptLinkInvitation(req.user, req.body.token)),
  progress: action((req) => service.getEnrollmentProgress(req.user.id, req.params.enrollmentId)),
  recordProgress: action((req) => service.recordStepProgress(
    req.user.id, req.params.enrollmentId, req.params.stepId, req.body.status
  )),
  cancelInvite: action((req) => service.cancelLinkInvitation(
    req.user.id, req.params.profileId
  )),
};
