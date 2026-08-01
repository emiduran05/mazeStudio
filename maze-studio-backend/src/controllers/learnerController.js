const learnerService = require("../services/learnerService");

async function getEnrollments(req, res, next) {
  try {
    const enrollments = await learnerService.getEnrollments(req.user.id);
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
}

async function getJourney(req, res, next) {
  try {
    const journey = await learnerService.getJourneyForUser(
      req.user.id,
      req.params.journeyId
    );
    res.json(journey);
  } catch (error) {
    next(error);
  }
}

async function getStep(req, res, next) {
  try {
    const step = await learnerService.getStep(
      req.user.id,
      req.params.journeyId,
      req.params.stepId
    );
    res.json(step);
  } catch (error) {
    next(error);
  }
}

async function updateProgress(req, res, next) {
  try {
    const progress = await learnerService.updateProgress(
      req.user.id,
      req.params.stepId,
      req.body.status
    );
    res.json({ progress });
  } catch (error) {
    next(error);
  }
}

async function updateLearningPathGoal(req, res, next) {
  try {
    res.json(await learnerService.updateLearningPathGoal(
      req.user.id,
      req.params.journeyId,
      req.body.goal
    ));
  } catch (error) {
    next(error);
  }
}

async function submitChallengeAttempt(req, res, next) {
  try {
    const attempt = await learnerService.submitChallengeAttempt(
      req.user.id,
      req.params.challengeId,
      req.body.answer
    );
    res.status(201).json({ attempt });
  } catch (error) {
    next(error);
  }
}

async function getChallengeAttempts(req, res, next) {
  try {
    const attempts = await learnerService.getChallengeAttempts(
      req.user.id,
      req.params.challengeId
    );
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
}

async function checkExerciseAnswer(req, res, next) {
  try {
    const result = await learnerService.checkExerciseAnswer(
      req.user.id,
      req.params.blockId,
      req.body.answer
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEnrollments,
  getJourney,
  getStep,
  updateProgress,
  submitChallengeAttempt,
  getChallengeAttempts,
  checkExerciseAnswer,
  updateLearningPathGoal,
};
