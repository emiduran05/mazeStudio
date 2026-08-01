BEGIN;

CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES journey_enrollments(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL DEFAULT 'Personalized Learning Path',
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
  source VARCHAR(30) NOT NULL DEFAULT 'MANUAL'
    CHECK (source IN ('MANUAL','AI_DIAGNOSTIC','AI_ADAPTIVE')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (enrollment_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_learning_path_enrollment
  ON learning_paths(enrollment_id)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS learning_path_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  unlock_rule VARCHAR(30) NOT NULL DEFAULT 'PREVIOUS_REQUIRED'
    CHECK (unlock_rule IN ('PREVIOUS_REQUIRED','ALWAYS_AVAILABLE')),
  reason TEXT,
  source VARCHAR(30) NOT NULL DEFAULT 'MANUAL'
    CHECK (source IN ('MANUAL','AI_DIAGNOSTIC','AI_ADAPTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (learning_path_id, step_id),
  UNIQUE (learning_path_id, position)
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_enrollment
  ON learning_paths(enrollment_id, status);

CREATE INDEX IF NOT EXISTS idx_learning_path_items_path_position
  ON learning_path_items(learning_path_id, position);

COMMIT;
