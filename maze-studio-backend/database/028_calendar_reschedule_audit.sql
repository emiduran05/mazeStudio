BEGIN;

CREATE TABLE IF NOT EXISTS calendar_event_reschedule_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  changed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_role VARCHAR(20) NOT NULL CHECK (actor_role IN ('EDUCATOR','LEARNER')),
  original_starts_at TIMESTAMPTZ NOT NULL,
  original_ends_at TIMESTAMPTZ NOT NULL,
  new_starts_at TIMESTAMPTZ NOT NULL,
  new_ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_reschedule_log_event
  ON calendar_event_reschedule_log(event_id,created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calendar_reschedule_log_actor
  ON calendar_event_reschedule_log(changed_by_user_id,created_at DESC);

COMMIT;
