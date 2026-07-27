const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const learningJourneyController = require(
  "../controllers/learningJourneyController"
);
const imageUpload = require(
  "../middlewares/uploadMiddleware"
);

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  learningJourneyController.create
);

router.get(
  "/",
  authMiddleware,
  learningJourneyController.getMine
);

router.get(
  "/:id/builder",
  authMiddleware,
  learningJourneyController.getBuilder
);

router.post(
  "/:id/cover",
  authMiddleware,
  imageUpload.single("image"),
  learningJourneyController.uploadCover
);

router.delete(
  "/:id/cover",
  authMiddleware,
  learningJourneyController.deleteCover
);

router.get(
  "/:id",
  authMiddleware,
  learningJourneyController.getById
);

router.put(
  "/:id",
  authMiddleware,
  learningJourneyController.update
);

router.delete(
  "/:id",
  authMiddleware,
  learningJourneyController.archive
);

module.exports = router;