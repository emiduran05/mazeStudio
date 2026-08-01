BEGIN;

CREATE TABLE IF NOT EXISTS offering_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE RESTRICT,
  cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
  learner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES journey_enrollments(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PAID','FREE','CANCELLED','REFUNDED','FAILED')),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  stripe_checkout_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_open_offering_order
  ON offering_orders(offering_id, learner_user_id)
  WHERE status IN ('PENDING','PAID','FREE');

CREATE INDEX IF NOT EXISTS idx_offering_orders_learner
  ON offering_orders(learner_user_id, created_at DESC);

COMMIT;
