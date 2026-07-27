const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const securityController = require("../controllers/securityController");

const router = express.Router();

router.put("/change-password", authMiddleware, securityController.changePassword);

module.exports = router;