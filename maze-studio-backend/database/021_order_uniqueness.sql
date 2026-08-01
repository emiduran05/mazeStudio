BEGIN;
DROP INDEX IF EXISTS uq_open_offering_order;
CREATE UNIQUE INDEX uq_pending_offering_order ON offering_orders(offering_id,learner_user_id) WHERE status='PENDING';
COMMIT;
