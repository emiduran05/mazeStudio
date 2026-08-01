BEGIN;

CREATE INDEX IF NOT EXISTS idx_step_progress_enrollment_status
  ON step_progress (enrollment_id, status);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_enrollment_challenge
  ON challenge_attempts (enrollment_id, challenge_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_challenge_steps_step
  ON challenge_steps (step_id);

COMMIT;
