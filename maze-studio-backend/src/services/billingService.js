const stripe = require("../config/stripe");
const billingModel = require("../models/billingModel");
const pool = require("../config/db");

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
  const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, "");

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
      `${frontendUrl}/register/success` +
      `?session_id={CHECKOUT_SESSION_ID}`,

    cancel_url:
      `${frontendUrl}/register` +
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

async function createEducatorUpgradeCheckout(userId) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.first_name,
       u.last_name,
       u.email,
       u.role,
       u.status,
       u.stripe_customer_id,
       (
         SELECT s.status
         FROM subscriptions s
         WHERE s.user_id = u.id
         LIMIT 1
       ) AS subscription_status
     FROM users u
     WHERE u.id = $1`,
    [userId]
  );
  const user = result.rows[0];
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  const hasActiveSubscription =
    ["ACTIVE", "TRIALING"].includes(
      String(user.subscription_status || "").toUpperCase()
    );

  if (user.role === "EDUCATOR" && hasActiveSubscription) {
    const error = new Error(
      "This account already has an active Educator subscription"
    );
    error.statusCode = 409;
    throw error;
  }
  return createEducatorCheckoutForNewUser({ ...user, role: "EDUCATOR" });
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
  let user =
    await billingModel.findStripeCustomerByUserId(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!user.stripe_customer_id) {
    const previousCheckout = (await pool.query(`SELECT stripe_checkout_session_id
      FROM offering_orders WHERE learner_user_id=$1::uuid AND stripe_checkout_session_id IS NOT NULL
      ORDER BY paid_at DESC NULLS LAST,created_at DESC LIMIT 1`,[userId])).rows[0];
    if(previousCheckout){
      const checkout=await stripe.checkout.sessions.retrieve(previousCheckout.stripe_checkout_session_id);
      const customerId=typeof checkout.customer==="string"?checkout.customer:checkout.customer?.id;
      if(customerId){
        await billingModel.saveStripeCustomerId(userId,customerId);
        user={...user,stripe_customer_id:customerId};
      }
    }
    if (!user.stripe_customer_id) {
      const error = new Error("Your Stripe billing profile will be created with your first paid purchase.");
      error.statusCode = 400;
      throw error;
    }
  }

  const session =
    await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url:
        `${process.env.FRONTEND_URL}${user.role === "EDUCATOR" ? "/my-settings/billing" : "/student/settings/billing"}`,
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
  createEducatorUpgradeCheckout,
};
