const express = require("express");
const auth = require("../middlewares/authMiddleware");
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");
const controller = require("../controllers/insightsController");

const router = express.Router();
router.get("/insights/overview", auth, educatorOnly, controller.overview);

module.exports = router;
