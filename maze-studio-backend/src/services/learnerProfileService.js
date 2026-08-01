const crypto = require("crypto");
const pool = require("../config/db");
const emailService = require("./emailService");

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

async function assertJourneyOwner(userId, journeyId, client = pool) {
  const result = await client.query(
    `SELECT id FROM learning_journeys
     WHERE id=$1 AND owner_user_id=$2 AND status<>'ARCHIVED'`,
    [journeyId, userId]
  );
  if (!result.rows[0]) throw httpError("Learning Journey not found", 404);
}

async function assertProfileOwner(userId, profileId, client = pool) {
  const result = await client.query(
    `SELECT profile.*,relationship.private_notes,relationship.external_reference
     FROM learner_profiles profile
     JOIN educator_learner_relationships relationship
       ON relationship.learner_profile_id=profile.id
     WHERE profile.id=$1 AND relationship.educator_user_id=$2
       AND relationship.status='ACTIVE'`,
    [profileId, userId]
  );
  if (!result.rows[0]) throw httpError("Learner profile not found", 404);
  return result.rows[0];
}

async function createManagedLearner(userId, journeyId, input) {
  const firstName = String(input.firstName || "").trim();
  const lastName = String(input.lastName || "").trim() || null;
  const email = String(input.email || "").trim().toLowerCase() || null;
  if (!firstName) throw httpError("First name is required", 400);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertJourneyOwner(userId, journeyId, client);
    const profile = await client.query(
      `INSERT INTO learner_profiles
       (first_name,last_name,contact_email,status)
       VALUES($1,$2,$3,'MANAGED') RETURNING *`,
      [firstName, lastName, email]
    );
    await client.query(
      `INSERT INTO educator_learner_relationships
       (educator_user_id,learner_profile_id,private_notes,external_reference)
       VALUES($1,$2,$3,$4)`,
      [userId, profile.rows[0].id, input.privateNotes || null, input.externalReference || null]
    );
    const enrollment = await client.query(
      `INSERT INTO journey_enrollments
       (learning_journey_id,learner_profile_id,learner_user_id,status,
        enrollment_source,enrolled_by_user_id,started_at)
       VALUES($1,$2,NULL,'ACTIVE','MANUAL',$3,NOW()) RETURNING *`,
      [journeyId, profile.rows[0].id, userId]
    );
    await client.query("COMMIT");
    return { profile: profile.rows[0], enrollment: enrollment.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function listEducatorLearners(userId) {
  const result = await pool.query(
    `SELECT profile.*,relationship.private_notes,relationship.external_reference,
      COUNT(DISTINCT enrollment.id)::integer enrollment_count,
      COUNT(DISTINCT progress.step_id)
        FILTER(WHERE progress.status='COMPLETED')::integer completed_steps
     FROM educator_learner_relationships relationship
     JOIN learner_profiles profile ON profile.id=relationship.learner_profile_id
     LEFT JOIN journey_enrollments enrollment
       ON enrollment.learner_profile_id=profile.id
     LEFT JOIN learning_journeys journey
       ON journey.id=enrollment.learning_journey_id
      AND journey.owner_user_id=$1
     LEFT JOIN step_progress progress ON progress.enrollment_id=enrollment.id
     WHERE relationship.educator_user_id=$1 AND relationship.status='ACTIVE'
     GROUP BY profile.id,relationship.private_notes,relationship.external_reference
     ORDER BY profile.first_name,profile.last_name`,
    [userId]
  );
  return result.rows;
}

async function createLinkInvitation(userId, profileId, input) {
  const profile = await assertProfileOwner(userId, profileId);
  if (profile.linked_user_id) throw httpError("Learner is already linked to an account", 409);
  const email = String(input.email || profile.contact_email || "").trim().toLowerCase();
  if (!email) throw httpError("Email is required", 400);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `UPDATE learner_profile_link_invitations
     SET status='REVOKED',updated_at=NOW()
     WHERE learner_profile_id=$1 AND status='PENDING'`,
    [profileId]
  );
  const invitation = await pool.query(
    `INSERT INTO learner_profile_link_invitations
     (learner_profile_id,educator_user_id,email,token_hash,expires_at)
     VALUES($1,$2,$3,$4,$5) RETURNING id,email,status,expires_at`,
    [profileId, userId, email, hash(rawToken), expiresAt]
  );
  await pool.query(
    "UPDATE learner_profiles SET contact_email=$1,status='INVITED',updated_at=NOW() WHERE id=$2",
    [email, profileId]
  );
  const frontendUrl = (
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/+$/, "");
  let emailSent = false;
  try {
    await emailService.sendLearnerProfileLink({
      recipientEmail: email,
      invitationUrl: `${frontendUrl}/link-learner-profile?token=${encodeURIComponent(rawToken)}`,
      learnerName: [profile.first_name, profile.last_name].filter(Boolean).join(" "),
    });
    emailSent = true;
  } catch (error) {
    console.error("Could not send learner profile link:", error.message);
  }
  return {
    invitation: invitation.rows[0],
    invitationUrl: `${frontendUrl}/link-learner-profile?token=${encodeURIComponent(rawToken)}`,
    emailSent,
  };
}

async function cancelLinkInvitation(userId, profileId) {
  const profile = await assertProfileOwner(userId, profileId);
  if (profile.linked_user_id) {
    throw httpError("Learner is already linked to an account", 409);
  }
  await pool.query(
    `UPDATE learner_profile_link_invitations
     SET status='REVOKED',updated_at=NOW()
     WHERE learner_profile_id=$1 AND status='PENDING'`,
    [profileId]
  );
  await pool.query(
    `UPDATE learner_profiles SET status='MANAGED',updated_at=NOW()
     WHERE id=$1 AND linked_user_id IS NULL`,
    [profileId]
  );
  return { cancelled: true };
}

async function getLinkInvitation(rawToken) {
  const result = await pool.query(
    `SELECT invitation.id,invitation.email,invitation.expires_at,
      profile.first_name,profile.last_name
     FROM learner_profile_link_invitations invitation
     JOIN learner_profiles profile ON profile.id=invitation.learner_profile_id
     WHERE invitation.token_hash=$1 AND invitation.status='PENDING'`,
    [hash(rawToken || "")]
  );
  const invitation = result.rows[0];
  if (!invitation) throw httpError("Link invitation is invalid", 404);
  if (new Date(invitation.expires_at) <= new Date()) throw httpError("Link invitation has expired", 410);
  return invitation;
}

async function acceptLinkInvitation(user, rawToken) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT invitation.*,profile.linked_user_id
       FROM learner_profile_link_invitations invitation
       JOIN learner_profiles profile ON profile.id=invitation.learner_profile_id
       WHERE invitation.token_hash=$1 FOR UPDATE OF invitation,profile`,
      [hash(rawToken || "")]
    );
    const invitation = result.rows[0];
    if (!invitation || invitation.status !== "PENDING") throw httpError("Link invitation is invalid", 404);
    if (new Date(invitation.expires_at) <= new Date()) throw httpError("Link invitation has expired", 410);
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw httpError("This invitation belongs to another email address", 403);
    }
    if (invitation.linked_user_id && invitation.linked_user_id !== user.id) {
      throw httpError("Learner profile is already linked", 409);
    }
    const duplicate = await client.query(
      "SELECT id FROM learner_profiles WHERE linked_user_id=$1 AND id<>$2",
      [user.id, invitation.learner_profile_id]
    );
    if (duplicate.rows[0]) throw httpError("This account already has another learner profile", 409);
    await client.query(
      `UPDATE learner_profiles SET linked_user_id=$1,status='LINKED',
       linked_at=NOW(),updated_at=NOW() WHERE id=$2`,
      [user.id, invitation.learner_profile_id]
    );
    await client.query(
      `UPDATE journey_enrollments SET learner_user_id=$1,updated_at=NOW()
       WHERE learner_profile_id=$2`,
      [user.id, invitation.learner_profile_id]
    );
    await client.query(
      `UPDATE learner_profile_link_invitations SET status='ACCEPTED',
       accepted_by_user_id=$1,accepted_at=NOW(),updated_at=NOW() WHERE id=$2`,
      [user.id, invitation.id]
    );
    await client.query("COMMIT");
    return { linked: true, learnerProfileId: invitation.learner_profile_id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function assertEnrollmentOwner(userId, enrollmentId, client = pool) {
  const result = await client.query(
    `SELECT enrollment.*,profile.first_name,profile.last_name
     FROM journey_enrollments enrollment
     JOIN learning_journeys journey ON journey.id=enrollment.learning_journey_id
     JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
     WHERE enrollment.id=$1 AND journey.owner_user_id=$2`,
    [enrollmentId, userId]
  );
  if (!result.rows[0]) throw httpError("Enrollment not found", 404);
  return result.rows[0];
}

async function getEnrollmentProgress(userId, enrollmentId) {
  const enrollment = await assertEnrollmentOwner(userId, enrollmentId);
  const steps = await pool.query(
    `SELECT step.id,step.title,stage.title stage_title,
      COALESCE(progress.status,'NOT_STARTED') progress_status,
      progress.completed_at,progress.last_accessed_at
     FROM stages stage
     JOIN steps step ON step.stage_id=stage.id
     LEFT JOIN step_progress progress
       ON progress.step_id=step.id AND progress.enrollment_id=$1
     WHERE stage.learning_journey_id=$2 AND step.status<>'ARCHIVED'
     ORDER BY stage.position,step.position`,
    [enrollmentId, enrollment.learning_journey_id]
  );
  return { enrollment, steps: steps.rows };
}

async function recordStepProgress(userId, enrollmentId, stepId, status) {
  const allowed = new Set(["NOT_STARTED","IN_PROGRESS","COMPLETED"]);
  if (!allowed.has(status)) throw httpError("Invalid progress status", 400);
  const enrollment = await assertEnrollmentOwner(userId, enrollmentId);
  const step = await pool.query(
    `SELECT step.id FROM steps step JOIN stages stage ON stage.id=step.stage_id
     WHERE step.id=$1 AND stage.learning_journey_id=$2`,
    [stepId, enrollment.learning_journey_id]
  );
  if (!step.rows[0]) throw httpError("Step does not belong to this Journey", 400);
  if (status === "NOT_STARTED") {
    await pool.query(
      "DELETE FROM step_progress WHERE enrollment_id=$1 AND step_id=$2",
      [enrollmentId, stepId]
    );
    return { stepId, status };
  }
  const result = await pool.query(
    `INSERT INTO step_progress
     (enrollment_id,step_id,status,progress_percentage,started_at,completed_at,last_accessed_at)
     VALUES($1,$2,$3,$4,NOW(),CASE WHEN $3='COMPLETED' THEN NOW() END,NOW())
     ON CONFLICT(enrollment_id,step_id) DO UPDATE SET
       status=$3,progress_percentage=$4,
       started_at=COALESCE(step_progress.started_at,NOW()),
       completed_at=CASE WHEN $3='COMPLETED' THEN COALESCE(step_progress.completed_at,NOW()) ELSE NULL END,
       last_accessed_at=NOW()
     RETURNING *`,
    [enrollmentId, stepId, status, status === "COMPLETED" ? 100 : 0]
  );
  return result.rows[0];
}

module.exports = {
  createManagedLearner,
  listEducatorLearners,
  createLinkInvitation,
  getLinkInvitation,
  acceptLinkInvitation,
  getEnrollmentProgress,
  recordStepProgress,
  cancelLinkInvitation,
};
