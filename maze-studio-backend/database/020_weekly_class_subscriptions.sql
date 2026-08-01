BEGIN;
ALTER TABLE offering_orders ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME'
  CHECK(billing_type IN ('ONE_TIME','MONTHLY'));
ALTER TABLE offering_orders ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
CREATE TABLE IF NOT EXISTS offering_subscriptions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),offering_order_id UUID NOT NULL UNIQUE REFERENCES offering_orders(id) ON DELETE CASCADE,
 learner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE RESTRICT,
 stripe_subscription_id VARCHAR(255) UNIQUE,status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 weekly_class_count INTEGER NOT NULL CHECK(weekly_class_count>0),monthly_amount INTEGER NOT NULL CHECK(monthly_amount>=0),currency CHAR(3) NOT NULL,
 cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,current_period_end TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offering_subscriptions_learner ON offering_subscriptions(learner_user_id,status);
COMMIT;
