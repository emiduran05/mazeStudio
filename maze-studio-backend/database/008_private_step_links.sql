BEGIN;

CREATE TABLE IF NOT EXISTS step_private_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  target_enrollment_id UUID NOT NULL REFERENCES journey_enrollments(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  token_hash CHAR(64) NOT NULL UNIQUE,
  label VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE','REVOKED')),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER CHECK(max_uses IS NULL OR max_uses>0),
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS step_private_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  private_link_id UUID NOT NULL REFERENCES step_private_links(id) ON DELETE CASCADE,
  session_token_hash CHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_step_private_links_step
  ON step_private_links(step_id,created_at DESC);

COMMIT;
