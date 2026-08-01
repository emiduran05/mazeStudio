BEGIN;

CREATE TABLE IF NOT EXISTS learner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120),
  contact_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'MANAGED'
    CHECK (status IN ('MANAGED','INVITED','LINKED','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS educator_learner_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','ARCHIVED')),
  private_notes TEXT,
  external_reference VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(educator_user_id,learner_profile_id)
);

ALTER TABLE journey_enrollments
  ADD COLUMN IF NOT EXISTS learner_profile_id UUID REFERENCES learner_profiles(id);

ALTER TABLE journey_enrollments
  ALTER COLUMN learner_user_id DROP NOT NULL;

INSERT INTO learner_profiles (
  linked_user_id,first_name,last_name,contact_email,status,linked_at
)
SELECT user_account.id,user_account.first_name,
       user_account.last_name,user_account.email,'LINKED',NOW()
FROM users user_account
WHERE EXISTS (
  SELECT 1 FROM journey_enrollments enrollment
  WHERE enrollment.learner_user_id=user_account.id
)
ON CONFLICT(linked_user_id) DO NOTHING;

UPDATE journey_enrollments enrollment
SET learner_profile_id=profile.id
FROM learner_profiles profile
WHERE enrollment.learner_profile_id IS NULL
  AND profile.linked_user_id=enrollment.learner_user_id;

ALTER TABLE journey_enrollments
  ALTER COLUMN learner_profile_id SET NOT NULL;

INSERT INTO educator_learner_relationships (
  educator_user_id,learner_profile_id,status
)
SELECT DISTINCT journey.owner_user_id,enrollment.learner_profile_id,'ACTIVE'
FROM journey_enrollments enrollment
JOIN learning_journeys journey ON journey.id=enrollment.learning_journey_id
ON CONFLICT(educator_user_id,learner_profile_id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS uq_journey_enrollment_profile
  ON journey_enrollments(learning_journey_id,learner_profile_id);

CREATE INDEX IF NOT EXISTS idx_learner_profiles_email
  ON learner_profiles(LOWER(contact_email));

CREATE TABLE IF NOT EXISTS learner_profile_link_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_profile_id UUID NOT NULL REFERENCES learner_profiles(id) ON DELETE CASCADE,
  educator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_user_id UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_profile_link
  ON learner_profile_link_invitations(learner_profile_id)
  WHERE status='PENDING';

CREATE OR REPLACE FUNCTION ensure_enrollment_learner_profile()
RETURNS TRIGGER AS $$
DECLARE resolved_profile_id UUID;
BEGIN
  IF NEW.learner_profile_id IS NULL AND NEW.learner_user_id IS NOT NULL THEN
    SELECT id INTO resolved_profile_id
    FROM learner_profiles WHERE linked_user_id=NEW.learner_user_id;

    IF resolved_profile_id IS NULL THEN
      INSERT INTO learner_profiles(
        linked_user_id,first_name,last_name,contact_email,status,linked_at
      )
      SELECT id,first_name,last_name,email,'LINKED',NOW()
      FROM users WHERE id=NEW.learner_user_id
      RETURNING id INTO resolved_profile_id;
    END IF;

    NEW.learner_profile_id := resolved_profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enrollment_learner_profile ON journey_enrollments;
CREATE TRIGGER trg_enrollment_learner_profile
BEFORE INSERT OR UPDATE OF learner_user_id,learner_profile_id
ON journey_enrollments
FOR EACH ROW EXECUTE FUNCTION ensure_enrollment_learner_profile();

COMMIT;
