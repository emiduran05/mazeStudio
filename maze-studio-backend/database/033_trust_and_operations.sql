BEGIN;
CREATE TABLE IF NOT EXISTS learning_journey_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_journey_id UUID NOT NULL REFERENCES learning_journeys(id) ON DELETE CASCADE,
  learner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offering_order_id UUID REFERENCES offering_orders(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(learning_journey_id,learner_user_id)
);
CREATE TABLE IF NOT EXISTS educator_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offering_order_id UUID REFERENCES offering_orders(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(educator_user_id,learner_user_id)
);
CREATE INDEX IF NOT EXISTS idx_journey_reviews_summary ON learning_journey_reviews(learning_journey_id,rating);
CREATE INDEX IF NOT EXISTS idx_educator_reviews_summary ON educator_reviews(educator_user_id,rating);
ALTER TABLE calendar_event_reminders ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE calendar_event_reminders ADD COLUMN IF NOT EXISTS error_message TEXT;
INSERT INTO calendar_event_reminders(event_id,minutes_before,channel)
SELECT event.id,minutes.value,'EMAIL' FROM calendar_events event CROSS JOIN (VALUES(1440),(60)) minutes(value)
WHERE event.status='SCHEDULED' AND event.starts_at>NOW() ON CONFLICT DO NOTHING;
COMMIT;
