const express = require("express");
const passwordResetController = require("../controllers/passwordResetController");

const router = express.Router();

router.post("/forgot-password", passwordResetController.forgotPassword);
router.post("/reset-password", passwordResetController.resetPassword);

module.exports = router;