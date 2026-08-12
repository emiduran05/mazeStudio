BEGIN;
CREATE TABLE IF NOT EXISTS calendar_event_lesson_steps(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,learner_profile_id UUID REFERENCES learner_profiles(id) ON DELETE CASCADE,step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,position INTEGER NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_lesson_general_step ON calendar_event_lesson_steps(event_id,step_id) WHERE learner_profile_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_event_lesson_learner_step ON calendar_event_lesson_steps(event_id,learner_profile_id,step_id) WHERE learner_profile_id IS NOT NULL;
COMMIT;
