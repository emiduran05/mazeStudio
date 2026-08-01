BEGIN;
ALTER TABLE offering_orders DROP CONSTRAINT IF EXISTS offering_orders_recurrence_frequency_check;
ALTER TABLE offering_orders ADD CONSTRAINT offering_orders_recurrence_frequency_check
  CHECK(recurrence_frequency IS NULL OR recurrence_frequency IN ('NONE','WEEKLY','BIWEEKLY','CUSTOM'));
COMMIT;
