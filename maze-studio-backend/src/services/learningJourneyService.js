const learningJourneyModel = require("../models/learningJourneyModel");
const storageService = require("./storageService");
const journeyAccess = require("./journeyAccessService");
const pool = require("../config/db");
async function uploadJourneyCover(
  userId,
  journeyId,
  file
) {
  const journey = await getLearningJourney(
    userId,
    journeyId
  );
  await journeyAccess.requireAccess(userId, journeyId, "EDIT");

  const uploaded = await storageService.uploadImage({
    file,
    folder: "journeys/covers",
    ownerId: userId,
  });

  try {
    const updated =
      await learningJourneyModel.updateJourneyCover(
        journeyId,
        userId,
        {
          coverUrl: uploaded.publicUrl,
          coverObjectKey: uploaded.objectKey,
        }
      );

    if (journey.cover_object_key) {
      await storageService.deleteImage(
        journey.cover_object_key
      );
    }

    return updated;
  } catch (error) {
    await storageService.deleteImage(
      uploaded.objectKey
    );

    throw error;
  }
}

async function deleteJourneyCover(
  userId,
  journeyId
) {
  const journey = await getLearningJourney(
    userId,
    journeyId
  );
  await journeyAccess.requireAccess(userId, journeyId, "EDIT");

  const updated =
    await learningJourneyModel.removeJourneyCover(
      journeyId,
      userId
    );

  if (journey.cover_object_key) {
    await storageService.deleteImage(
      journey.cover_object_key
    );
  }

  return updated;
}


function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createLearningJourney(userId, data = {}) {
const {
  title,
  description = null,
  coverUrl = null,
  visibility = "PRIVATE",
  status = "DRAFT",
  enrollmentMode = "INVITE_ONLY",
  estimatedMinutes = null,
  difficulty = null,
  language = null,
} = data;

  if (!title?.trim()) {
    const error = new Error("Title is required");
    error.statusCode = 400;
    throw error;
  }
  const allowedDifficulties = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
];

if (
  difficulty &&
  !allowedDifficulties.includes(difficulty)
) {
  const error = new Error("Invalid difficulty");
  error.statusCode = 400;
  throw error;
}

if (
  estimatedMinutes !== null &&
  (
    !Number.isInteger(estimatedMinutes) ||
    estimatedMinutes < 0
  )
) {
  const error = new Error(
    "Estimated minutes must be a positive integer"
  );
  error.statusCode = 400;
  throw error;
}

  const allowedVisibility = ["PRIVATE", "UNLISTED", "PUBLIC"];
  const allowedStatus = ["DRAFT", "PUBLISHED"];
  const allowedEnrollmentModes = [
    "INVITE_ONLY",
    "PRIVATE_LINK",
    "OPEN",
    "PURCHASE",
  ];

  if (!allowedVisibility.includes(visibility)) {
    const error = new Error("Invalid visibility");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedStatus.includes(status)) {
    const error = new Error("Invalid status");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedEnrollmentModes.includes(enrollmentMode)) {
    const error = new Error("Invalid enrollment mode");
    error.statusCode = 400;
    throw error;
  }

  if (status === "PUBLISHED") {
    const payout = (await pool.query(`SELECT connect_details_submitted,connect_charges_enabled,connect_payouts_enabled
      FROM users WHERE id=$1::uuid`, [userId])).rows[0];
    if (!payout?.connect_details_submitted || !payout.connect_charges_enabled || !payout.connect_payouts_enabled) {
      const error = new Error("Complete Stripe payout onboarding before publishing a Learning Journey");
      error.statusCode = 409;
      throw error;
    }
  }

return learningJourneyModel.createJourney({
  ownerUserId: userId,
  title: title.trim(),
  slug: createSlug(title),
  description,
  coverUrl,
  visibility,
  status,
  enrollmentMode,
  estimatedMinutes,
  difficulty,
  language,
});
}

async function getMyLearningJourneys(userId) {
  return learningJourneyModel.findJourneysByOwner(userId);
}

async function getLearningJourney(userId, journeyId) {
  const journey = await learningJourneyModel.findJourneyById(journeyId);

  if (!journey || journey.status === "ARCHIVED") {
    const error = new Error("Learning Journey not found");
    error.statusCode = 404;
    throw error;
  }

  await journeyAccess.requireAccess(userId, journeyId, "VIEW");

  return journey;
}

async function updateLearningJourney(
  userId,
  journeyId,
  data = {}
) {
  const journey = await getLearningJourney(userId, journeyId);
  await journeyAccess.requireAccess(userId, journeyId, "EDIT");

  if (data.status === "PUBLISHED" && journey.status !== "PUBLISHED") {
    const payout = (await pool.query(`SELECT connect_details_submitted,connect_charges_enabled,connect_payouts_enabled
      FROM users WHERE id=$1::uuid`, [journey.owner_user_id])).rows[0];
    if (!payout?.connect_details_submitted || !payout.connect_charges_enabled || !payout.connect_payouts_enabled) {
      const error = new Error("Complete Stripe payout onboarding before publishing a Learning Journey");
      error.statusCode = 409;
      throw error;
    }
  }

  const allowedVisualTypes = [
    "ICON",
    "EMOJI",
    "IMAGE",
  ];

  if (
    data.visualType !== undefined &&
    !allowedVisualTypes.includes(data.visualType)
  ) {
    const error = new Error("Invalid visual type");
    error.statusCode = 400;
    throw error;
  }

  const updateData = {
    title: data.title,
    slug: data.title
      ? createSlug(data.title)
      : journey.slug,

    description: data.description,
    coverUrl: data.coverUrl,
    visibility: data.visibility,
    status: data.status,
    enrollmentMode: data.enrollmentMode,
    estimatedMinutes: data.estimatedMinutes,
    difficulty: data.difficulty,
    language: data.language,

    visualType: data.visualType,
    icon: data.icon,
    emoji: data.emoji,
  };

  const updated =
    await learningJourneyModel.updateJourney(
      journeyId,
      userId,
      updateData
    );

  if (!updated) {
    const error = new Error(
      "Learning Journey could not be updated"
    );
    error.statusCode = 400;
    throw error;
  }

  return updated;
}

async function archiveLearningJourney(userId, journeyId) {
  await journeyAccess.requireAccess(userId, journeyId, "OWNER");

  const archived = await learningJourneyModel.archiveJourney(
    journeyId,
    userId
  );

  if (!archived) {
    const error = new Error("Learning Journey could not be archived");
    error.statusCode = 400;
    throw error;
  }

  return archived;
}


async function getLearningJourneyBuilder(userId, journeyId) {
  const builder =
    await learningJourneyModel.findJourneyBuilderById(
      journeyId
    );

  if (!builder) {
    const error = new Error("Learning Journey not found");
    error.statusCode = 404;
    throw error;
  }

  const access = await journeyAccess.requireAccess(userId, journeyId, "VIEW");
  builder.accessRole = access.access_role;

  return builder;
}

module.exports = {
  createLearningJourney,
  getMyLearningJourneys,
  getLearningJourney,
  getLearningJourneyBuilder,
  updateLearningJourney,
  archiveLearningJourney,
  uploadJourneyCover,
  deleteJourneyCover
};
