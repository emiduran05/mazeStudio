const express = require("express");
const controller = require("../controllers/challengeController");
const rateLimit = require("../middlewares/publicRateLimit");

const router = express.Router();
router.use(rateLimit);
router.get("/challenges/private/:token", controller.privateMetadata);
router.post("/challenges/private/:token/session", controller.privateSession);
router.post("/challenges/private/:token/attempts", controller.privateSubmit);
router.get("/challenges/private/:token/attempts/:attemptToken", controller.privateAttempt);
module.exports = router;
