const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");
const imageUpload = require(
  "../middlewares/imageUploadMiddleware"
);
const stepController = require(
  "../controllers/stepController"
);

const router = express.Router();

router.post(
  "/stages/:stageId/steps",
  authMiddleware,
  educatorOnly,
  stepController.create
);

router.get(
  "/stages/:stageId/steps",
  authMiddleware,
  educatorOnly,
  stepController.getByStage
);

router.patch(
  "/stages/:stageId/steps/reorder",
  authMiddleware,
  educatorOnly,
  stepController.reorder
);

router.get(
  "/steps/:stepId",
  authMiddleware,
  educatorOnly,
  stepController.getById
);
router.post(
  "/steps/:stepId/image",
  authMiddleware,
  educatorOnly,
  imageUpload.single("image"),
  stepController.uploadImage
);

router.delete(
  "/steps/:stepId/image",
  authMiddleware,
  educatorOnly,
  stepController.removeImage
);

router.put(
  "/steps/:stepId",
  authMiddleware,
  educatorOnly,
  stepController.update
);

router.delete(
  "/steps/:stepId",
  authMiddleware,
  educatorOnly,
  stepController.remove
);

module.exports = router;
