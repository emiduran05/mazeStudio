const express = require("express");
const controller = require("../controllers/challengeController");
const rateLimit = require("../middlewares/publicRateLimit");
const blockAssetUpload = require("../middlewares/blockAssetUploadMiddleware");

const router = express.Router();
router.use(rateLimit);
router.get("/challenges/private/:token", controller.privateMetadata);
router.post("/challenges/private/:token/session", controller.privateSession);
router.post("/challenges/private/:token/attempts", controller.privateSubmit);
router.post("/challenges/private/:token/speaking-upload", blockAssetUpload.single("file"), controller.privateSpeakingUpload);
router.get("/challenges/private/:token/attempts/:attemptToken", controller.privateAttempt);
module.exports = router;
