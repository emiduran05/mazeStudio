const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
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
  stepController.create
);

router.get(
  "/stages/:stageId/steps",
  authMiddleware,
  stepController.getByStage
);

router.patch(
  "/stages/:stageId/steps/reorder",
  authMiddleware,
  stepController.reorder
);

router.get(
  "/steps/:stepId",
  authMiddleware,
  stepController.getById
);
router.post(
  "/steps/:stepId/image",
  authMiddleware,
  imageUpload.single("image"),
  stepController.uploadImage
);

router.delete(
  "/steps/:stepId/image",
  authMiddleware,
  stepController.removeImage
);

router.put(
  "/steps/:stepId",
  authMiddleware,
  stepController.update
);

router.delete(
  "/steps/:stepId",
  authMiddleware,
  stepController.remove
);

module.exports = router;