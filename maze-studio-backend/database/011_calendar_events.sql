BEGIN;

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_journey_id UUID REFERENCES learning_journeys(id) ON DELETE SET NULL,
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT,
  event_type VARCHAR(30) NOT NULL DEFAULT 'CUSTOM'
    CHECK (event_type IN ('LIVE_CLASS','ONE_TO_ONE','WEBINAR','CUSTOM','OFFICE_HOURS')),
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
    CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
  location_type VARCHAR(20) NOT NULL DEFAULT 'ONLINE'
    CHECK (location_type IN ('ONLINE','IN_PERSON','NONE')),
  meeting_provider VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
    CHECK (meeting_provider IN ('MANUAL','GOOGLE_MEET','ZOOM','TEAMS','NONE')),
  meeting_url TEXT,
  location_text VARCHAR(255),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  recurrence_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS calendar_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id) ON DELETE CASCADE,
  response_status VARCHAR(20) NOT NULL DEFAULT 'INVITED'
    CHECK (response_status IN ('INVITED','ACCEPTED','DECLINED','ATTENDED','ABSENT')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id,learner_profile_id)
);

CREATE TABLE IF NOT EXISTS calendar_event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  minutes_before INTEGER NOT NULL CHECK (minutes_before >= 0),
  channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP'
    CHECK (channel IN ('IN_APP','EMAIL','PUSH')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id,minutes_before,channel)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer_date ON calendar_events(organizer_user_id,starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_profile ON calendar_event_attendees(learner_profile_id,event_id);

COMMIT;
