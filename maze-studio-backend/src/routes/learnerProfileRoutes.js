const express = require("express");
const auth = require("../middlewares/authMiddleware");
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");
const controller = require("../controllers/learnerProfileController");

const router = express.Router();
router.post("/learning-journeys/:journeyId/managed-learners", auth, educatorOnly, controller.create);
router.get("/learner-profiles", auth, educatorOnly, controller.list);
router.post("/learner-profiles/:profileId/link-invitations", auth, educatorOnly, controller.invite);
router.delete("/learner-profiles/:profileId/link-invitations", auth, educatorOnly, controller.cancelInvite);
router.get("/learner-profile-link", controller.invitation);
router.post("/learner-profile-link/accept", auth, controller.accept);
router.get("/enrollments/:enrollmentId/managed-progress", auth, educatorOnly, controller.progress);
router.put("/enrollments/:enrollmentId/managed-progress/:stepId", auth, educatorOnly, controller.recordProgress);

module.exports = router;
