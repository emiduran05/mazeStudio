const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");
const stageController = require("../controllers/stageController");

const router = express.Router();

router.post(
  "/learning-journeys/:journeyId/stages",
  authMiddleware,
  educatorOnly,
  stageController.create
);

router.get(
  "/learning-journeys/:journeyId/stages",
  authMiddleware,
  educatorOnly,
  stageController.getByJourney
);

router.patch(
  "/learning-journeys/:journeyId/stages/reorder",
  authMiddleware,
  educatorOnly,
  stageController.reorder
);

router.put(
  "/stages/:stageId",
  authMiddleware,
  educatorOnly,
  stageController.update
);

router.delete(
  "/stages/:stageId",
  authMiddleware,
  educatorOnly,
  stageController.remove
);

module.exports = router;
