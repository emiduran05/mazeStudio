-- PROPOSAL ONLY — do not run automatically.
-- Adapted to Maze Studio's current PostgreSQL conventions: UUID identifiers,
-- JSONB content and TIMESTAMPTZ audit timestamps. Existing step_blocks are untouched.

ALTER TABLE steps
  ADD COLUMN IF NOT EXISTS content_mode TEXT NOT NULL DEFAULT 'BLOCKS'
  CHECK (content_mode IN ('BLOCKS', 'CANVAS'));

CREATE TABLE IF NOT EXISTS step_canvas_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL UNIQUE REFERENCES steps(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  document JSONB NOT NULL DEFAULT '{"schemaVersion":1,"width":1280,"height":720,"pages":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT step_canvas_documents_document_is_object
    CHECK (jsonb_typeof(document) = 'object')
);

CREATE INDEX IF NOT EXISTS step_canvas_documents_step_id_idx
  ON step_canvas_documents(step_id);

-- Rollback (manual and intentionally explicit):
-- DROP TABLE IF EXISTS step_canvas_documents;
-- ALTER TABLE steps DROP COLUMN IF EXISTS content_mode;
