BEGIN;

ALTER TABLE challenge_private_links
  ADD COLUMN IF NOT EXISTS target_enrollment_id UUID
  REFERENCES journey_enrollments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_private_links_target_enrollment
  ON challenge_private_links(target_enrollment_id)
  WHERE target_enrollment_id IS NOT NULL;

ALTER TABLE challenge_v1_attempts
  DROP CONSTRAINT IF EXISTS challenge_v1_attempts_check;

ALTER TABLE challenge_v1_attempts
  ADD CONSTRAINT challenge_v1_attempt_actor_check
  CHECK (enrollment_id IS NOT NULL OR private_access_session_id IS NOT NULL);

COMMIT;
