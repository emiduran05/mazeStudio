BEGIN;
UPDATE cohorts cohort
SET status='OPEN',updated_at=NOW()
FROM offerings offering
WHERE offering.id=cohort.offering_id
  AND offering.status='PUBLISHED'
  AND cohort.status='DRAFT'
  AND (cohort.ends_at IS NULL OR cohort.ends_at>NOW());
COMMIT;
