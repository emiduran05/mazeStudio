BEGIN;
CREATE TABLE IF NOT EXISTS calendar_event_series (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,offering_id UUID REFERENCES offerings(id) ON DELETE SET NULL,
 title VARCHAR(180) NOT NULL,event_type VARCHAR(30) NOT NULL DEFAULT 'LIVE_CLASS',timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
 first_starts_at TIMESTAMPTZ NOT NULL,duration_minutes INTEGER NOT NULL CHECK(duration_minutes>0),recurrence_rule JSONB NOT NULL,
 meeting_provider VARCHAR(20) NOT NULL DEFAULT 'MANUAL',meeting_url TEXT,status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES calendar_event_series(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS occurrence_index INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_series_occurrence ON calendar_events(series_id,occurrence_index) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_series ON calendar_events(series_id,starts_at);
COMMIT;
