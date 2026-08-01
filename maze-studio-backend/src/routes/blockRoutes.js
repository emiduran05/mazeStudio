const express = require("express");

const authMiddleware = require(
  "../middlewares/authMiddleware"
);

const blockController = require(
  "../controllers/blockController"
);

const blockAssetUpload = require(
  "../middlewares/blockAssetUploadMiddleware"
);

const router = express.Router();
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");

router.post(
  "/steps/:stepId/blocks",
  authMiddleware,
  educatorOnly,
  blockController.create
);

router.get(
  "/steps/:stepId/blocks",
  authMiddleware,
  educatorOnly,
  blockController.getByStep
);

router.patch(
  "/steps/:stepId/blocks/reorder",
  authMiddleware,
  educatorOnly,
  blockController.reorder
);

router.post(
  "/blocks/:blockId/asset",
  authMiddleware,
  educatorOnly,
  blockAssetUpload.single("file"),
  blockController.uploadAsset
);

router.delete(
  "/blocks/:blockId/asset",
  authMiddleware,
  educatorOnly,
  blockController.removeAsset
);

router.post(
  "/steps/:stepId/layouts",
  authMiddleware,
  educatorOnly,
  blockController.createLayout
);

router.put(
  "/blocks/:blockId",
  authMiddleware,
  educatorOnly,
  blockController.update
);

router.delete(
  "/blocks/:blockId",
  authMiddleware,
  educatorOnly,
  blockController.remove
);

module.exports = router;
