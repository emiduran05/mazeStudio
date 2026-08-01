BEGIN;
CREATE TABLE IF NOT EXISTS learning_journey_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_journey_id UUID NOT NULL REFERENCES learning_journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('EDITOR','INSTRUCTOR','VIEWER')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (learning_journey_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_journey_collaborators_user
  ON learning_journey_collaborators(user_id, status);
COMMIT;
