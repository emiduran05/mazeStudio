const stripe = require("../config/stripe");
const webhookService = require("../services/webhookService");

async function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error.message);

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    );
  }

  try {
    await webhookService.processStripeEvent(event);

    return res.json({
      received: true,
    });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return res.status(500).json({
      message: "Webhook processing failed",
    });
  }
}

module.exports = {
  stripeWebhook,
};