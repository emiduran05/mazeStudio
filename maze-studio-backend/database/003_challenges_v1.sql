BEGIN;

-- The existing Maze Studio schema uses UUID primary keys.
CREATE TABLE IF NOT EXISTS challenge_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  question_type VARCHAR(30) NOT NULL CHECK (question_type IN
    ('SINGLE_CHOICE','MULTIPLE_CHOICE','TRUE_FALSE','FILL_BLANK',
     'SHORT_ANSWER','LONG_ANSWER','FILE_UPLOAD','CODING','MATCHING','ORDERING')),
  prompt_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  points NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (points >= 0),
  position INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_answer_keys (
  question_id UUID PRIMARY KEY REFERENCES challenge_questions(id) ON DELETE CASCADE,
  answer_key_json JSONB NOT NULL,
  grading_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id);
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS grading_mode VARCHAR(20) NOT NULL DEFAULT 'AUTO';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS passing_percentage NUMERIC(5,2) DEFAULT 70;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS total_points NUMERIC(10,2) NOT NULL DEFAULT 100;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS config_json JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE challenge_steps ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE challenge_steps ADD COLUMN IF NOT EXISTS is_required_for_step BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_steps ON challenge_steps(challenge_id, step_id);

-- The v1 attempt tables are separate from the legacy JSON attempt table so the
-- migration preserves all existing submissions.
CREATE TABLE IF NOT EXISTS challenge_v1_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES journey_enrollments(id) ON DELETE CASCADE,
  private_access_session_id UUID,
  result_token_hash CHAR(64) UNIQUE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status VARCHAR(25) NOT NULL DEFAULT 'SUBMITTED',
  grading_status VARCHAR(25) NOT NULL DEFAULT 'NOT_GRADED',
  raw_score NUMERIC(10,2),
  max_score NUMERIC(10,2) NOT NULL,
  percentage NUMERIC(5,2),
  passed BOOLEAN,
  teacher_feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  graded_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((enrollment_id IS NOT NULL) <> (private_access_session_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_v1_registered_attempt
  ON challenge_v1_attempts(challenge_id, enrollment_id, attempt_number)
  WHERE enrollment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS challenge_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES challenge_v1_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES challenge_questions(id) ON DELETE RESTRICT,
  answer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_is_correct BOOLEAN,
  auto_points_awarded NUMERIC(10,2),
  final_points_awarded NUMERIC(10,2),
  grader_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS learner_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES journey_enrollments(id) ON DELETE CASCADE,
  status VARCHAR(25) NOT NULL DEFAULT 'NOT_STARTED',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  best_attempt_id UUID REFERENCES challenge_v1_attempts(id),
  latest_attempt_id UUID REFERENCES challenge_v1_attempts(id),
  best_score NUMERIC(10,2),
  best_percentage NUMERIC(5,2),
  passed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, enrollment_id)
);

CREATE TABLE IF NOT EXISTS challenge_private_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  token_hash CHAR(64) NOT NULL UNIQUE,
  label VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  use_count INTEGER NOT NULL DEFAULT 0,
  allowed_email VARCHAR(320),
  access_code_hash CHAR(64),
  collect_guest_name BOOLEAN NOT NULL DEFAULT TRUE,
  collect_guest_email BOOLEAN NOT NULL DEFAULT TRUE,
  max_attempts_override INTEGER CHECK (max_attempts_override IS NULL OR max_attempts_override > 0),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_private_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  private_link_id UUID NOT NULL REFERENCES challenge_private_links(id) ON DELETE CASCADE,
  session_token_hash CHAR(64) NOT NULL UNIQUE,
  guest_name VARCHAR(180),
  guest_email VARCHAR(320),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE challenge_v1_attempts
  ADD CONSTRAINT fk_challenge_v1_private_session
  FOREIGN KEY (private_access_session_id)
  REFERENCES challenge_private_access_sessions(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_v1_private_attempt
  ON challenge_v1_attempts(challenge_id, private_access_session_id, attempt_number)
  WHERE private_access_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS challenge_attempt_grade_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES challenge_v1_attempts(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(30) NOT NULL,
  previous_score NUMERIC(10,2),
  new_score NUMERIC(10,2),
  previous_percentage NUMERIC(5,2),
  new_percentage NUMERIC(5,2),
  feedback TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_questions_order ON challenge_questions(challenge_id, position);
CREATE INDEX IF NOT EXISTS idx_challenge_v1_attempts_actor ON challenge_v1_attempts(challenge_id, enrollment_id, attempt_number DESC);
COMMIT;
