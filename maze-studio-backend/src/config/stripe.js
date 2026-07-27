const Stripe = require("stripe");
require("dotenv").config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;