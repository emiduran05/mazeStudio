BEGIN;

CREATE TABLE IF NOT EXISTS educator_profiles (
  educator_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  headline VARCHAR(180),
  short_bio TEXT,
  location VARCHAR(160),
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educator_profile_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_type VARCHAR(30) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(educator_user_id, position)
);

CREATE INDEX IF NOT EXISTS idx_educator_profile_blocks_owner
  ON educator_profile_blocks(educator_user_id, position);

COMMIT;
