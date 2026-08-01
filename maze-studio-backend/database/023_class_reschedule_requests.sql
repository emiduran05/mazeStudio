BEGIN;
CREATE TABLE IF NOT EXISTS class_reschedule_requests(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_starts_at TIMESTAMPTZ NOT NULL,
  original_ends_at TIMESTAMPTZ NOT NULL,
  proposed_starts_at TIMESTAMPTZ NOT NULL,
  proposed_ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','APPROVED','REJECTED','CANCELLED')),
  response_note TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(proposed_ends_at>proposed_starts_at),
  CHECK(requested_by_user_id<>requested_to_user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_reschedule_event ON class_reschedule_requests(event_id) WHERE status='PENDING';
CREATE INDEX IF NOT EXISTS idx_reschedule_recipient ON class_reschedule_requests(requested_to_user_id,status,created_at DESC);
COMMIT;
