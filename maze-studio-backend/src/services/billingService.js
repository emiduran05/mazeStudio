const stripe = require("../config/stripe");
const billingModel = require("../models/billingModel");

async function createEducatorCheckoutForNewUser(user) {
  if (!user) {
    const error = new Error("User is required to create checkout");
    error.statusCode = 400;
    throw error;
  }

  if (user.role !== "EDUCATOR") {
    const error = new Error("Only educators require a subscription");
    error.statusCode = 400;
    throw error;
  }

  if (!process.env.STRIPE_EDUCATOR_PRICE_ID) {
    throw new Error("STRIPE_EDUCATOR_PRICE_ID is missing");
  }

  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is missing");
  }

  let stripeCustomerId = user.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.first_name} ${user.last_name}`.trim(),
      metadata: {
        mazeStudioUserId: user.id,
        role: user.role,
      },
    });

    stripeCustomerId = customer.id;

    await billingModel.saveStripeCustomerId(
      user.id,
      stripeCustomerId
    );
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    client_reference_id: user.id,

    line_items: [
      {
        price: process.env.STRIPE_EDUCATOR_PRICE_ID,
        quantity: 1,
      },
    ],

    success_url:
      `${process.env.FRONTEND_URL}/register/success` +
      `?session_id={CHECKOUT_SESSION_ID}`,

    cancel_url:
      `${process.env.FRONTEND_URL}/register` +
      `?payment=cancelled`,

    metadata: {
      mazeStudioUserId: user.id,
    },

    subscription_data: {
      metadata: {
        mazeStudioUserId: user.id,
      },
    },

    allow_promotion_codes: true,
  });

  return {
    checkoutSessionId: checkoutSession.id,
    checkoutUrl: checkoutSession.url,
    stripeCustomerId,
  };
}

async function getCheckoutSessionStatus(sessionId) {
  if (!sessionId) {
    const error = new Error("Checkout session ID is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    {
      expand: ["customer", "subscription"],
    }
  );

  return {
    sessionId: session.id,
    status: session.status,
    paymentStatus: session.payment_status,

    customerEmail:
      session.customer_details?.email ||
      session.customer?.email ||
      null,

    subscriptionStatus:
      typeof session.subscription === "object"
        ? session.subscription.status
        : null,
  };
}

async function getUserBilling(userId) {
  const billing =
    await billingModel.getUserBillingDetails(userId);

  if (!billing) {
    const error = new Error("Billing information not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    accountStatus: billing.account_status,

    plan: {
      name:
        billing.role === "EDUCATOR"
          ? "Educator Plan"
          : "Learner Plan",

      price:
        billing.role === "EDUCATOR"
          ? 10
          : 0,

      currency: "USD",

      interval:
        billing.role === "EDUCATOR"
          ? "month"
          : null,
    },

    subscription: billing.stripe_subscription_id
      ? {
          id: billing.stripe_subscription_id,
          priceId: billing.stripe_price_id,
          status: billing.subscription_status,
          currentPeriodStart:
            billing.current_period_start,
          currentPeriodEnd:
            billing.current_period_end,
          cancelAtPeriodEnd:
            billing.cancel_at_period_end,
        }
      : null,

    paymentMethod: billing.stripe_payment_method_id
      ? {
          id: billing.stripe_payment_method_id,
          brand: billing.brand,
          last4: billing.last4,
          expMonth: billing.exp_month,
          expYear: billing.exp_year,
          isDefault: billing.is_default,
        }
      : null,
  };
}

async function createCustomerPortal(userId) {
  const user =
    await billingModel.findStripeCustomerByUserId(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!user.stripe_customer_id) {
    const error = new Error(
      "This account does not have a Stripe customer associated."
    );
    error.statusCode = 400;
    throw error;
  }

  const session =
    await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url:
        `${process.env.FRONTEND_URL}/my-settings/billing`,
    });

  return {
    url: session.url,
  };
}

module.exports = {
  createEducatorCheckoutForNewUser,
  getCheckoutSessionStatus,
  getUserBilling,
  createCustomerPortal,
};