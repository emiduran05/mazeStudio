const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const accountController = require("../controllers/accountController");

const router = express.Router();

router.delete("/account", authMiddleware, accountController.deleteAccount);
router.post("/account/restore", authMiddleware, accountController.restoreAccount);

module.exports = router;