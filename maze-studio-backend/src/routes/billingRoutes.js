const express = require("express");
const billingController = require("../controllers/billingController");

const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

router.get(
  "/me",
  authMiddleware,
  billingController.getMyBilling
);

router.get(
  "/checkout-session/:sessionId",
  billingController.getCheckoutSession
);

router.post(
    "/portal",
    authMiddleware,
    billingController.createPortal
);

module.exports = router;