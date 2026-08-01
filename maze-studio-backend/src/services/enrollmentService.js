const crypto = require("crypto");
const pool = require("../config/db");

const enrollmentModel = require(
  "../models/enrollmentModel"
);

const emailService = require(
  "./emailService"
);

const learningJourneyModel = require(
  "../models/learningJourneyModel"
);
const journeyAccess = require("./journeyAccessService");
const notificationService = require("./notificationService");

const ALLOWED_LEARNER_ROLES = [
  "STUDENT",
  "EDUCATOR",
];

const ALLOWED_ENROLLMENT_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "COMPLETED",
  "CANCELLED",
];

function createInvitationToken() {
  const token = crypto
    .randomBytes(32)
    .toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return {
    token,
    tokenHash,
  };
}

async function getOwnedJourney(
  userId,
  journeyId
) {
  /*
   * Usa aquí el nombre real que tengas en
   * learningJourneyModel.
   *
   * Debe devolver owner_user_id.
   */
  const journey =
    await learningJourneyModel.findJourneyById(
      journeyId
    );

  if (!journey) {
    const error = new Error(
      "Learning Journey not found"
    );

    error.statusCode = 404;
    throw error;
  }

  await journeyAccess.requireAccess(userId, journeyId, "TEACH");

  if (journey.status === "ARCHIVED") {
    const error = new Error(
      "The Learning Journey is archived"
    );

    error.statusCode = 400;
    throw error;
  }

  return journey;
}

function validateLearnerAccount(user) {
  if (!ALLOWED_LEARNER_ROLES.includes(user.role)) {
    const error = new Error(
      "This account cannot be enrolled"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    user.status === "SUSPENDED" ||
    user.status === "DELETED" ||
    user.status === "PENDING_DELETION"
  ) {
    const error = new Error(
      "This account is not available"
    );

    error.statusCode = 400;
    throw error;
  }
}

async function enrollExistingUser({
  educatorUserId,
  journeyId,
  user,
}) {
  validateLearnerAccount(user);

  const existingEnrollment =
    await enrollmentModel.findEnrollment(
      journeyId,
      user.id
    );

  if (existingEnrollment) {
    if (
      existingEnrollment.status ===
      "CANCELLED"
    ) {
      const enrollment =
        await enrollmentModel
          .reactivateEnrollment(
            existingEnrollment.id,
            educatorUserId
          );

      return {
        invited: false,
        reactivated: true,
        enrollment,
        user,
      };
    }

    const error = new Error(
      "This user is already enrolled in this Learning Journey"
    );

    error.statusCode = 409;
    throw error;
  }

  const enrollment =
    await enrollmentModel.createEnrollment({
      journeyId,
      learnerUserId: user.id,
      enrolledByUserId: educatorUserId,
      enrollmentSource: "MANUAL",
      status: "ACTIVE",
    });

  await notificationService.create({recipientUserId:user.id,actorUserId:educatorUserId,type:"ENROLLED",title:"You joined a Learning Journey",body:"A new Learning Journey is ready in My Learning.",actionUrl:`/learn/journeys/${journeyId}`,entityType:"LEARNING_JOURNEY",entityId:journeyId,deduplicationKey:`enrolled:${enrollment.id}`});

  return {
    invited: false,
    reactivated: false,
    enrollment,
    user,
  };
}

async function createJourneyInvitation({
  educatorUserId,
  journey,
  email,
}) {
  const journeyId = journey.id;

  const existingInvitation =
    await enrollmentModel.findPendingInvitation(
      journeyId,
      email
    );

  if (existingInvitation) {
    const error = new Error(
      "A pending invitation already exists for this email"
    );

    error.statusCode = 409;
    throw error;
  }

  const { token, tokenHash } =
    createInvitationToken();

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  const invitation =
    await enrollmentModel.createInvitation({
      journeyId,
      email,
      invitedByUserId: educatorUserId,
      tokenHash,
      expiresAt,
    });

  if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is missing");
  }

  const invitationUrl =
    `${process.env.FRONTEND_URL}/register` +
    `?invitation=${encodeURIComponent(token)}`;

  const emailResult =
    await emailService.sendJourneyInvitation({
      recipientEmail: email,
      invitationUrl,
      journeyTitle:
        journey.title || "a Learning Journey",
      educatorName: "Your educator",
    });

  return {
    invited: true,
    invitation,
    invitationUrl,
    emailSent: true,
    emailResult,
  };
}

async function enrollOrInviteUser(
  educatorUserId,
  journeyId,
  data = {}
) {
  const email =
    typeof data.email === "string"
      ? data.email.toLowerCase().trim()
      : "";

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const journey = await getOwnedJourney(
    educatorUserId,
    journeyId
  );

  const user =
    await enrollmentModel.findUserByEmail(email);

  if (user) {
    return enrollExistingUser({
      educatorUserId,
      journeyId,
      user,
    });
  }

  return createJourneyInvitation({
    educatorUserId,
    journey,
    email,
  });
}

async function getJourneyEnrollments(
  educatorUserId,
  journeyId
) {
  await getOwnedJourney(
    educatorUserId,
    journeyId
  );

  const [enrollments, invitations] =
    await Promise.all([
      enrollmentModel.findJourneyEnrollments(
        journeyId
      ),

      enrollmentModel.findJourneyInvitations(
        journeyId
      ),
    ]);

  return {
    enrollments,
    invitations,
  };
}

async function getMyEnrollments(user) {
  if (
    !ALLOWED_LEARNER_ROLES.includes(
      user.role
    )
  ) {
    const error = new Error(
      "This account cannot access Learning Journeys"
    );

    error.statusCode = 403;
    throw error;
  }

  return enrollmentModel.findUserEnrollments(
    user.id
  );
}

async function changeEnrollmentStatus(
  educatorUserId,
  enrollmentId,
  data = {}
) {
  const status =
    typeof data.status === "string"
      ? data.status.toUpperCase()
      : "";

  if (
    !ALLOWED_ENROLLMENT_STATUSES.includes(
      status
    )
  ) {
    const error = new Error(
      "Invalid enrollment status"
    );

    error.statusCode = 400;
    throw error;
  }

  const enrollment =
    await enrollmentModel.findEnrollmentById(
      enrollmentId
    );

  if (!enrollment) {
    const error = new Error(
      "Enrollment not found"
    );

    error.statusCode = 404;
    throw error;
  }

  await journeyAccess.requireAccess(
    educatorUserId,
    enrollment.learning_journey_id,
    "TEACH"
  );

  const updated =
    await enrollmentModel
      .updateEnrollmentStatus(
        enrollmentId,
        status
      );

  if (!updated) {
    const error = new Error(
      "Enrollment could not be updated"
    );

    error.statusCode = 400;
    throw error;
  }

  return updated;
}

async function acceptInvitationForUser(
  user,
  invitationToken,
  transactionClient = null
) {
  if (
    typeof invitationToken !== "string" ||
    !invitationToken.trim()
  ) {
    return null;
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(invitationToken.trim())
    .digest("hex");

  validateLearnerAccount(user);

  const client = transactionClient || await pool.connect();
  const ownsTransaction = !transactionClient;

  try {
    if (ownsTransaction) {
      await client.query("BEGIN");
    }

    const invitationResult = await client.query(
      `
      SELECT *
      FROM journey_invitations
      WHERE token_hash = $1
      FOR UPDATE
      `,
      [tokenHash]
    );
    const invitation = invitationResult.rows[0];

    if (!invitation) {
      const error = new Error("The invitation is invalid");
      error.statusCode = 404;
      throw error;
    }

    if (
      invitation.email.toLowerCase() !==
      user.email.toLowerCase()
    ) {
      const error = new Error(
        "This invitation belongs to another email address"
      );
      error.statusCode = 403;
      throw error;
    }

    if (
      invitation.status === "ACCEPTED" &&
      invitation.accepted_by_user_id === user.id
    ) {
      const existingResult = await client.query(
        `
        SELECT *
        FROM journey_enrollments
        WHERE learning_journey_id = $1
          AND learner_user_id = $2
        LIMIT 1
        `,
        [invitation.learning_journey_id, user.id]
      );

      if (ownsTransaction) {
        await client.query("COMMIT");
      }
      return existingResult.rows[0] || null;
    }

    if (invitation.status !== "PENDING") {
      const error = new Error("The invitation is no longer available");
      error.statusCode = 409;
      throw error;
    }

    if (new Date(invitation.expires_at) <= new Date()) {
      const error = new Error("The invitation has expired");
      error.statusCode = 410;
      throw error;
    }

    const enrollmentResult = await client.query(
      `
      INSERT INTO journey_enrollments (
        learning_journey_id,
        learner_user_id,
        enrolled_by_user_id,
        enrollment_source,
        status,
        started_at
      )
      VALUES ($1, $2, $3, 'INVITATION', 'ACTIVE', NOW())
      ON CONFLICT (learning_journey_id, learner_user_id)
      DO UPDATE SET
        status = 'ACTIVE',
        enrollment_source = 'INVITATION',
        enrolled_by_user_id = EXCLUDED.enrolled_by_user_id,
        started_at = COALESCE(journey_enrollments.started_at, NOW()),
        completed_at = NULL,
        updated_at = NOW()
      RETURNING *
      `,
      [
        invitation.learning_journey_id,
        user.id,
        invitation.invited_by_user_id,
      ]
    );

    await client.query(
      `
      UPDATE journey_invitations
      SET
        status = 'ACCEPTED',
        accepted_by_user_id = $1,
        accepted_at = COALESCE(accepted_at, NOW()),
        updated_at = NOW()
      WHERE id = $2
      `,
      [user.id, invitation.id]
    );

    if (ownsTransaction) {
      await client.query("COMMIT");
    }

    return enrollmentResult.rows[0];
  } catch (error) {
    if (ownsTransaction) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    if (ownsTransaction) {
      client.release();
    }
  }
}

module.exports = {
  enrollOrInviteUser,
  getJourneyEnrollments,
  getMyEnrollments,
  changeEnrollmentStatus,
  acceptInvitationForUser,
};
