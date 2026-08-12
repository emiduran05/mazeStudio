BEGIN;

CREATE TABLE IF NOT EXISTS enrollment_teaching_memory (
  enrollment_id UUID PRIMARY KEY REFERENCES journey_enrollments(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES steps(id) ON DELETE SET NULL,
  current_block_id UUID REFERENCES step_blocks(id) ON DELETE SET NULL,
  learning_status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (learning_status IN ('IN_PROGRESS','NEEDS_REVIEW','READY_TO_ADVANCE','PAUSED')),
  strengths TEXT,
  needs_review TEXT,
  homework TEXT,
  next_topic TEXT,
  private_note TEXT,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teaching_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES journey_enrollments(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  step_id UUID REFERENCES steps(id) ON DELETE SET NULL,
  block_id UUID REFERENCES step_blocks(id) ON DELETE SET NULL,
  summary TEXT,
  strengths TEXT,
  needs_review TEXT,
  homework TEXT,
  next_topic TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teaching_session_notes_enrollment
  ON teaching_session_notes(enrollment_id, occurred_at DESC);

COMMIT;
