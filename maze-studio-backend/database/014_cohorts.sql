BEGIN;
CREATE TABLE IF NOT EXISTS cohorts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),offering_id UUID NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
 title VARCHAR(180) NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','OPEN','ACTIVE','COMPLETED','CANCELLED')),
 starts_at TIMESTAMPTZ,ends_at TIMESTAMPTZ,timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',capacity INTEGER NOT NULL CHECK(capacity>0),
 recurrence_rule JSONB NOT NULL DEFAULT '{}'::jsonb,meeting_provider VARCHAR(20) NOT NULL DEFAULT 'MANUAL',meeting_url TEXT,
 instructor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS cohort_members (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
 enrollment_id UUID NOT NULL REFERENCES journey_enrollments(id) ON DELETE CASCADE,status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','COMPLETED','CANCELLED')),
 joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(cohort_id,enrollment_id)
);
CREATE INDEX IF NOT EXISTS idx_cohorts_offering ON cohorts(offering_id,status);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members(cohort_id,status);
COMMIT;
