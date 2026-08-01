BEGIN;
CREATE TABLE IF NOT EXISTS offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_journey_id UUID REFERENCES learning_journeys(id) ON DELETE SET NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  offering_type VARCHAR(30) NOT NULL CHECK(offering_type IN ('SELF_PACED','ONE_TO_ONE','COHORT','WEBINAR','HYBRID')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','PAUSED','ARCHIVED')),
  price_amount INTEGER NOT NULL DEFAULT 0 CHECK(price_amount>=0),
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  access_duration_days INTEGER CHECK(access_duration_days IS NULL OR access_duration_days>0),
  session_count INTEGER CHECK(session_count IS NULL OR session_count>0),
  session_duration_minutes INTEGER CHECK(session_duration_minutes IS NULL OR session_duration_minutes>0),
  schedule_mode VARCHAR(20) CHECK(schedule_mode IS NULL OR schedule_mode IN ('FIXED','FLEXIBLE')),
  recurrence_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  capacity INTEGER CHECK(capacity IS NULL OR capacity>0),
  sales_start_at TIMESTAMPTZ,
  sales_end_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS offering_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  label VARCHAR(120),amount INTEGER NOT NULL CHECK(amount>=0),currency CHAR(3) NOT NULL DEFAULT 'MXN',
  billing_type VARCHAR(20) NOT NULL DEFAULT 'ONE_TIME' CHECK(billing_type IN ('ONE_TIME','RECURRING')),
  billing_interval VARCHAR(20),stripe_price_id VARCHAR(255),is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offerings_journey ON offerings(learning_journey_id,status);
CREATE INDEX IF NOT EXISTS idx_offerings_owner ON offerings(owner_user_id,status);
COMMIT;
