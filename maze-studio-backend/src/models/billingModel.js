const pool = require("../config/db");

async function findUserForCheckout(userId) {
  const result = await pool.query(
    `
    SELECT
      id,
      first_name,
      last_name,
      email,
      role,
      status,
      stripe_customer_id
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  return result.rows[0];
}


async function saveStripeCustomerId(userId, stripeCustomerId) {
  const result = await pool.query(
    `
      UPDATE users
      SET
        stripe_customer_id = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        stripe_customer_id
    `,
    [stripeCustomerId, userId]
  );

  return result.rows[0];
}

module.exports = {
  saveStripeCustomerId,
};

async function upsertSubscription({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  status,
}) {
  const result = await pool.query(
    `
    INSERT INTO subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5)

    ON CONFLICT (user_id)
    DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      status = EXCLUDED.status,
      updated_at = NOW()

    RETURNING *
    `,
    [
      userId,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      status,
    ]
  );

  return result.rows[0];
}

async function getUserBillingDetails(userId) {
  const result = await pool.query(
    `
    SELECT
      u.id AS user_id,
      u.role,
      u.status AS account_status,
      u.stripe_customer_id,

      s.stripe_subscription_id,
      s.stripe_price_id,
      s.status AS subscription_status,
      s.current_period_start,
      s.current_period_end,
      s.cancel_at_period_end,

      pm.stripe_payment_method_id,
      pm.brand,
      pm.last4,
      pm.exp_month,
      pm.exp_year,
      pm.is_default

    FROM users u

    LEFT JOIN subscriptions s
      ON s.user_id = u.id

    LEFT JOIN user_payment_methods pm
      ON pm.user_id = u.id
      AND pm.is_default = TRUE

    WHERE u.id = $1

    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0];
}

async function findStripeCustomerByUserId(userId) {
  const result = await pool.query(
    `
    SELECT
      id,
      role,
      status,
      stripe_customer_id
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

module.exports = {
  saveStripeCustomerId,
  getUserBillingDetails,
  findStripeCustomerByUserId,
};