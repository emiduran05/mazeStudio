BEGIN;

ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_meeting_provider_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_meeting_provider_check
  CHECK (meeting_provider IN ('MANUAL','GOOGLE_MEET','ZOOM','TEAMS','MAZE_VIDEO','NONE'));

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS video_room_name VARCHAR(128);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS video_room_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_calendar_events_video_room_name
  ON calendar_events(video_room_name) WHERE video_room_name IS NOT NULL;

CREATE TABLE IF NOT EXISTS video_session_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL DEFAULT 'DAILY',
  provider_session_id VARCHAR(255),
  first_joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(event_id,user_id)
);

CREATE INDEX IF NOT EXISTS idx_video_participations_event
  ON video_session_participations(event_id,first_joined_at);

COMMIT;
