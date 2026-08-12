BEGIN;
CREATE TABLE IF NOT EXISTS calendar_event_whiteboards(event_id UUID PRIMARY KEY REFERENCES calendar_events(id) ON DELETE CASCADE,data JSONB NOT NULL DEFAULT '{"strokes":[]}'::jsonb,updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
COMMIT;
