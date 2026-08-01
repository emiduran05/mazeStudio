const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");
const learningJourneyController = require(
  "../controllers/learningJourneyController"
);
const imageUpload = require(
  "../middlewares/uploadMiddleware"
);

const router = express.Router();
router.use(authMiddleware, educatorOnly);

router.post(
  "/",
  learningJourneyController.create
);

router.get(
  "/",
  learningJourneyController.getMine
);

router.get(
  "/:id/builder",
  learningJourneyController.getBuilder
);

router.post(
  "/:id/cover",
  imageUpload.single("image"),
  learningJourneyController.uploadCover
);

router.delete(
  "/:id/cover",
  learningJourneyController.deleteCover
);

router.get(
  "/:id",
  learningJourneyController.getById
);

router.put(
  "/:id",
  learningJourneyController.update
);

router.delete(
  "/:id",
  learningJourneyController.archive
);

module.exports = router;
