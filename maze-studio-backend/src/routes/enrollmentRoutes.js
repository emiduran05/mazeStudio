const express = require("express");

const authMiddleware = require(
  "../middlewares/authMiddleware"
);
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");

const enrollmentController = require(
  "../controllers/enrollmentController"
);

const router = express.Router();

/*
 * Educator owner:
 * enroll existing user or invite an email.
 */
router.post(
  "/learning-journeys/:journeyId/enrollments",
  authMiddleware,
  educatorOnly,
  enrollmentController.enrollOrInvite
);

/*
 * Educator owner:
 * see enrollments and invitations.
 */
router.get(
  "/learning-journeys/:journeyId/enrollments",
  authMiddleware,
  educatorOnly,
  enrollmentController.getJourneyEnrollments
);

/*
 * Student or Educator:
 * see Journeys where the current user is a learner.
 */
router.get(
  "/me/enrollments",
  authMiddleware,
  enrollmentController.getMyEnrollments
);

/*
 * Educator owner:
 * activate, suspend, complete or cancel.
 */
router.patch(
  "/enrollments/:enrollmentId/status",
  authMiddleware,
  educatorOnly,
  enrollmentController.changeStatus
);

module.exports = router;
