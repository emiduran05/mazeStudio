BEGIN;

CREATE TABLE IF NOT EXISTS challenge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES journey_enrollments(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED'
    CHECK (status IN ('ASSIGNED', 'COMPLETED', 'REVOKED')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_assignments_enrollment
  ON challenge_assignments(enrollment_id, status);

COMMIT;
