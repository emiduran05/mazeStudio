BEGIN;
ALTER TABLE offering_orders ADD COLUMN IF NOT EXISTS session_count INTEGER CHECK(session_count IS NULL OR session_count>0);
ALTER TABLE offering_orders ADD COLUMN IF NOT EXISTS first_session_at TIMESTAMPTZ;
ALTER TABLE offering_orders ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20)
  CHECK(recurrence_frequency IS NULL OR recurrence_frequency IN ('NONE','WEEKLY','BIWEEKLY'));
ALTER TABLE offering_orders ADD COLUMN IF NOT EXISTS booking_timezone VARCHAR(80);
ALTER TABLE offering_orders ADD COLUMN IF NOT EXISTS booking_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMIT;
