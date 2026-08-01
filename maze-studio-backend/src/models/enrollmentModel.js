const pool = require("../config/db");

/* =========================================================
   USERS
========================================================= */

async function findUserByEmail(email) {
  const result = await pool.query(
    `
    SELECT
      id,
      first_name,
      last_name,
      email,
      role,
      status
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

/* =========================================================
   ENROLLMENTS
========================================================= */

async function findEnrollment(
  journeyId,
  learnerUserId
) {
  const result = await pool.query(
    `
    SELECT *
    FROM journey_enrollments
    WHERE learning_journey_id = $1
      AND learner_user_id = $2
    LIMIT 1
    `,
    [journeyId, learnerUserId]
  );

  return result.rows[0] || null;
}

async function createEnrollment({
  journeyId,
  learnerUserId,
  enrolledByUserId = null,
  enrollmentSource = "MANUAL",
  status = "ACTIVE",
}) {
  const result = await pool.query(
    `
    INSERT INTO journey_enrollments (
      learning_journey_id,
      learner_user_id,
      status,
      enrollment_source,
      enrolled_by_user_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      journeyId,
      learnerUserId,
      status,
      enrollmentSource,
      enrolledByUserId,
    ]
  );

  return result.rows[0];
}

async function findEnrollmentById(enrollmentId) {
  const result = await pool.query(
    `
    SELECT
      enrollment.*,

      journey.title AS journey_title,
      journey.owner_user_id,

      profile.first_name,
      profile.last_name,
      profile.contact_email AS email,
      profile.status AS learner_profile_status,
      learner.role,
      learner.status AS learner_account_status

    FROM journey_enrollments AS enrollment

    INNER JOIN learning_journeys AS journey
      ON journey.id =
        enrollment.learning_journey_id

    INNER JOIN learner_profiles AS profile
      ON profile.id = enrollment.learner_profile_id

    LEFT JOIN users AS learner
      ON learner.id =
        profile.linked_user_id

    WHERE enrollment.id = $1
    LIMIT 1
    `,
    [enrollmentId]
  );

  return result.rows[0] || null;
}

async function findJourneyEnrollments(journeyId) {
  const result = await pool.query(
    `
    SELECT
      enrollment.*,

      profile.id AS learner_profile_id,
      profile.first_name,
      profile.last_name,
      profile.contact_email AS email,
      profile.status AS learner_profile_status,
      profile.linked_user_id,
      learner.role,
      learner.status AS learner_account_status

    FROM journey_enrollments AS enrollment

    INNER JOIN learner_profiles AS profile
      ON profile.id = enrollment.learner_profile_id

    LEFT JOIN users AS learner
      ON learner.id =
        profile.linked_user_id

    WHERE enrollment.learning_journey_id = $1

    ORDER BY
      enrollment.enrolled_at DESC,
      enrollment.created_at DESC
    `,
    [journeyId]
  );

  return result.rows;
}

async function findUserEnrollments(learnerUserId) {
  const result = await pool.query(
    `
    SELECT
      enrollment.*,

      journey.title,
      journey.description,
      journey.cover_url,
      journey.visual_type,
      journey.icon,
      journey.emoji,
      journey.difficulty,
      journey.language,
      journey.estimated_minutes,
      journey.status AS journey_status,

      educator.first_name AS educator_first_name,
      educator.last_name AS educator_last_name

    FROM journey_enrollments AS enrollment

    INNER JOIN learning_journeys AS journey
      ON journey.id =
        enrollment.learning_journey_id

    INNER JOIN users AS educator
      ON educator.id =
        journey.owner_user_id

    WHERE enrollment.learner_user_id = $1
      AND enrollment.status IN (
        'ACTIVE',
        'COMPLETED'
      )
      AND journey.status <> 'ARCHIVED'

    ORDER BY enrollment.enrolled_at DESC
    `,
    [learnerUserId]
  );

  return result.rows;
}

async function updateEnrollmentStatus(
  enrollmentId,
  status
) {
  const result = await pool.query(
    `
    WITH input AS (
      SELECT
        $1::varchar AS new_status,
        $2::uuid AS enrollment_id
    )

    UPDATE journey_enrollments AS enrollment
    SET
      status = input.new_status,

      started_at = CASE
        WHEN input.new_status = 'ACTIVE'
          THEN COALESCE(
            enrollment.started_at,
            NOW()
          )
        ELSE enrollment.started_at
      END,

      completed_at = CASE
        WHEN input.new_status = 'COMPLETED'
          THEN COALESCE(
            enrollment.completed_at,
            NOW()
          )
        ELSE NULL
      END,

      updated_at = NOW()

    FROM input

    WHERE enrollment.id =
      input.enrollment_id

    RETURNING enrollment.*
    `,
    [status, enrollmentId]
  );

  return result.rows[0] || null;
}

async function reactivateEnrollment(
  enrollmentId,
  enrolledByUserId
) {
  const result = await pool.query(
    `
    UPDATE journey_enrollments
    SET
      status = 'ACTIVE',
      enrollment_source = 'MANUAL',
      enrolled_by_user_id = $1,
      enrolled_at = NOW(),
      completed_at = NULL,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [enrolledByUserId, enrollmentId]
  );

  return result.rows[0] || null;
}

/* =========================================================
   INVITATIONS
========================================================= */

async function findPendingInvitation(
  journeyId,
  email
) {
  const result = await pool.query(
    `
    SELECT *
    FROM journey_invitations
    WHERE learning_journey_id = $1
      AND LOWER(email) = LOWER($2)
      AND status = 'PENDING'
      AND expires_at > NOW()
    LIMIT 1
    `,
    [journeyId, email]
  );

  return result.rows[0] || null;
}

async function createInvitation({
  journeyId,
  email,
  invitedByUserId,
  tokenHash,
  expiresAt,
}) {
  const result = await pool.query(
    `
    INSERT INTO journey_invitations (
      learning_journey_id,
      email,
      invited_by_user_id,
      status,
      token_hash,
      expires_at
    )
    VALUES (
      $1,
      $2,
      $3,
      'PENDING',
      $4,
      $5
    )
    RETURNING *
    `,
    [
      journeyId,
      email,
      invitedByUserId,
      tokenHash,
      expiresAt,
    ]
  );

  return result.rows[0];
}

async function findValidInvitationByTokenHash(
  tokenHash
) {
  const result = await pool.query(
    `
    SELECT *
    FROM journey_invitations
    WHERE token_hash = $1
      AND status = 'PENDING'
      AND expires_at > NOW()
    LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows[0] || null;
}

async function acceptInvitation(
  invitationId,
  userId
) {
  const result = await pool.query(
    `
    UPDATE journey_invitations
    SET
      status = 'ACCEPTED',
      accepted_by_user_id = $1,
      accepted_at = NOW(),
      updated_at = NOW()
    WHERE id = $2
      AND status = 'PENDING'
    RETURNING *
    `,
    [userId, invitationId]
  );

  return result.rows[0] || null;
}

async function findJourneyInvitations(journeyId) {
  const result = await pool.query(
    `
    SELECT
      invitation.*,

      inviter.first_name AS invited_by_first_name,
      inviter.last_name AS invited_by_last_name

    FROM journey_invitations AS invitation

    LEFT JOIN users AS inviter
      ON inviter.id =
        invitation.invited_by_user_id

    WHERE invitation.learning_journey_id = $1

    ORDER BY invitation.created_at DESC
    `,
    [journeyId]
  );

  return result.rows;
}

module.exports = {
  findUserByEmail,

  findEnrollment,
  createEnrollment,
  findEnrollmentById,
  findJourneyEnrollments,
  findUserEnrollments,
  updateEnrollmentStatus,
  reactivateEnrollment,

  findPendingInvitation,
  createInvitation,
  findValidInvitationByTokenHash,
  acceptInvitation,
  findJourneyInvitations,
};
