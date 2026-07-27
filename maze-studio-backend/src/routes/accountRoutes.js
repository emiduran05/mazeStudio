const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const accountController = require("../controllers/accountController");

const router = express.Router();

router.delete("/account", authMiddleware, accountController.deleteAccount);
router.post("/account/restore", authMiddleware, accountController.restoreAccount);
router.patch(
  "/account/deactivate",
  authMiddleware,
  accountController.deactivateAccount
);
router.post("/account/reactivate", authMiddleware, accountController.reactivateAccount);

module.exports = router;