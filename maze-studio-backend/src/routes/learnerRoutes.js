const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const learnerController = require("../controllers/learnerController");
const challengeController = require("../controllers/challengeController");
const blockAssetUpload = require("../middlewares/blockAssetUploadMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/enrollments", learnerController.getEnrollments);
router.get("/journeys/:journeyId", learnerController.getJourney);
router.put(
  "/journeys/:journeyId/learning-path/goal",
  learnerController.updateLearningPathGoal
);
router.get(
  "/journeys/:journeyId/steps/:stepId",
  learnerController.getStep
);
router.put("/steps/:stepId/progress", learnerController.updateProgress);
router.get("/challenges", challengeController.learnerList);
router.get("/challenges/:challengeId", challengeController.learnerGet);
router.post(
  "/challenges/:challengeId/attempts",
  challengeController.learnerSubmit
);
router.post("/challenges/:challengeId/speaking-upload", blockAssetUpload.single("file"), challengeController.learnerSpeakingUpload);
router.get(
  "/challenges/:challengeId/attempts",
  challengeController.learnerAttempts
);
router.get("/challenge-attempts/:attemptId", challengeController.learnerAttempt);
router.post(
  "/blocks/:blockId/check-answer",
  learnerController.checkExerciseAnswer
);

module.exports = router;
