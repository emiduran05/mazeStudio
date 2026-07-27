const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const stageController = require("../controllers/stageController");

const router = express.Router();

router.post(
  "/learning-journeys/:journeyId/stages",
  authMiddleware,
  stageController.create
);

router.get(
  "/learning-journeys/:journeyId/stages",
  authMiddleware,
  stageController.getByJourney
);

router.patch(
  "/learning-journeys/:journeyId/stages/reorder",
  authMiddleware,
  stageController.reorder
);

router.put(
  "/stages/:stageId",
  authMiddleware,
  stageController.update
);

router.delete(
  "/stages/:stageId",
  authMiddleware,
  stageController.remove
);

module.exports = router;