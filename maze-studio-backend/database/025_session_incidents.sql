BEGIN;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS duration INTERVAL GENERATED ALWAYS AS (ends_at-starts_at) STORED;
CREATE TABLE IF NOT EXISTS session_incidents(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
 learner_user_id UUID NOT NULL REFERENCES users(id),learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id),educator_user_id UUID NOT NULL REFERENCES users(id),
 offering_order_id UUID NOT NULL REFERENCES offering_orders(id),incident_type VARCHAR(30) NOT NULL CHECK(incident_type IN('EDUCATOR_NO_SHOW','TECHNICAL_ISSUE','SESSION_ENDED_EARLY','OTHER')),
 description TEXT NOT NULL,requested_resolution VARCHAR(20) NOT NULL CHECK(requested_resolution IN('REPLACEMENT','CREDIT','REFUND')),
 status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','DISPUTED','RESOLVED_REPLACEMENT','RESOLVED_CREDIT','RESOLVED_REFUND','RESOLVED_HELD','CANCELLED')),
 session_value INTEGER NOT NULL DEFAULT 0 CHECK(session_value>=0),currency CHAR(3) NOT NULL,respond_by TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '48 hours',
 educator_response TEXT,resolution_type VARCHAR(20),replacement_event_id UUID REFERENCES calendar_events(id),stripe_refund_id VARCHAR(255),stripe_credit_id VARCHAR(255),
 resolved_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(event_id,learner_user_id)
);
CREATE INDEX IF NOT EXISTS idx_session_incidents_educator ON session_incidents(educator_user_id,status,respond_by);
CREATE INDEX IF NOT EXISTS idx_session_incidents_learner ON session_incidents(learner_user_id,created_at DESC);
COMMIT;
