const pool = require("../config/db");

async function activateEducator({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  subscriptionStatus,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        UPDATE users
        SET
          role = 'EDUCATOR',
          status = 'ACTIVE',
        stripe_customer_id = $1,
        updated_at = NOW()
        WHERE id = $2
      `,
      [stripeCustomerId, userId]
    );

    await client.query(
      `
      INSERT INTO subscriptions (
        user_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

      ON CONFLICT (user_id)
      DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        stripe_price_id = EXCLUDED.stripe_price_id,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = NOW()
      `,
      [
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        subscriptionStatus.toUpperCase(),
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateSubscription({
  stripeSubscriptionId,
  status,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}) {
  await pool.query(
    `
    UPDATE subscriptions
    SET
      status = $1,
      current_period_start = $2,
      current_period_end = $3,
      cancel_at_period_end = $4,
      updated_at = NOW()
    WHERE stripe_subscription_id = $5
    `,
    [
      status.toUpperCase(),
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      stripeSubscriptionId,
    ]
  );
}

async function deactivateEducatorBySubscription(stripeSubscriptionId) {
  await pool.query(
    `
    UPDATE users
    SET
      status = 'INACTIVE',
      updated_at = NOW()
    WHERE id = (
      SELECT user_id
      FROM subscriptions
      WHERE stripe_subscription_id = $1
    )
    `,
    [stripeSubscriptionId]
  );
}

async function upsertPaymentMethod({
  userId,
  stripePaymentMethodId,
  brand,
  last4,
  expMonth,
  expYear,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE user_payment_methods
      SET
        is_default = FALSE,
        updated_at = NOW()
      WHERE user_id = $1
      `,
      [userId]
    );

    const result = await client.query(
      `
      INSERT INTO user_payment_methods (
        user_id,
        stripe_payment_method_id,
        brand,
        last4,
        exp_month,
        exp_year,
        is_default
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)

      ON CONFLICT (stripe_payment_method_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        brand = EXCLUDED.brand,
        last4 = EXCLUDED.last4,
        exp_month = EXCLUDED.exp_month,
        exp_year = EXCLUDED.exp_year,
        is_default = TRUE,
        updated_at = NOW()

      RETURNING *
      `,
      [
        userId,
        stripePaymentMethodId,
        brand,
        last4,
        expMonth,
        expYear,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findUserByStripeCustomerId(stripeCustomerId) {
  const result = await pool.query(
    `
    SELECT
      id,
      stripe_customer_id
    FROM users
    WHERE stripe_customer_id = $1
    `,
    [stripeCustomerId]
  );

  return result.rows[0];
}

async function findUserIdBySubscriptionId(
  stripeSubscriptionId
) {
  const result = await pool.query(
    `
    SELECT user_id
    FROM subscriptions
    WHERE stripe_subscription_id = $1
    `,
    [stripeSubscriptionId]
  );

  return result.rows[0]?.user_id || null;
}
async function updateOfferingSubscription(stripeSubscriptionId,status,cancelAtPeriodEnd,currentPeriodEnd){await pool.query("UPDATE offering_subscriptions SET status=$1,cancel_at_period_end=$2,current_period_end=$3,updated_at=NOW() WHERE stripe_subscription_id=$4",[String(status).toUpperCase(),cancelAtPeriodEnd,currentPeriodEnd,stripeSubscriptionId]);}

module.exports = {
  activateEducator,
  updateSubscription,
  deactivateEducatorBySubscription,
  upsertPaymentMethod,
  findUserByStripeCustomerId,
  findUserIdBySubscriptionId,
  updateOfferingSubscription,
};
