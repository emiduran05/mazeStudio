const stageModel = require("../models/stageModel");
const learningJourneyModel = require("../models/learningJourneyModel");

async function verifyJourneyOwnership(userId, journeyId) {
  const journey =
    await learningJourneyModel.findJourneyById(journeyId);

  if (!journey || journey.status === "ARCHIVED") {
    const error = new Error("Learning Journey not found");
    error.statusCode = 404;
    throw error;
  }

  if (journey.owner_user_id !== userId) {
    const error = new Error(
      "You do not have permission to modify this Learning Journey"
    );
    error.statusCode = 403;
    throw error;
  }

  return journey;
}

async function createStage(userId, journeyId, data = {}) {
  const {
    title,
    description = null,
    parentStageId = null,
  } = data;

  if (!title?.trim()) {
    const error = new Error("Stage title is required");
    error.statusCode = 400;
    throw error;
  }

  await verifyJourneyOwnership(userId, journeyId);

  if (parentStageId) {
    const parentStage = await stageModel.findStageInJourney(
      parentStageId,
      journeyId
    );

    if (!parentStage) {
      const error = new Error(
        "Parent Stage does not belong to this Learning Journey"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const position = await stageModel.getNextPosition(
    journeyId,
    parentStageId
  );

  return stageModel.createStage({
    learningJourneyId: journeyId,
    parentStageId,
    title: title.trim(),
    description,
    position,
  });
}
async function getJourneyStages(userId, journeyId) {
  await verifyJourneyOwnership(userId, journeyId);

  return stageModel.findStagesByJourneyId(journeyId);
}

async function getStageForOwner(userId, stageId) {
  const stage = await stageModel.findStageById(stageId);

  if (!stage) {
    const error = new Error("Stage not found");
    error.statusCode = 404;
    throw error;
  }

  if (stage.owner_user_id !== userId) {
    const error = new Error(
      "You do not have permission to modify this Stage"
    );
    error.statusCode = 403;
    throw error;
  }

  return stage;
}

async function updateStage(userId, stageId, data = {}) {
  await getStageForOwner(userId, stageId);

  if (
    data.title !== undefined &&
    !data.title?.trim()
  ) {
    const error = new Error("Stage title cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  const updated = await stageModel.updateStage(
    stageId,
    {
      title:
        data.title !== undefined
          ? data.title.trim()
          : undefined,

      description: data.description,
    }
  );

  if (!updated) {
    const error = new Error("Stage could not be updated");
    error.statusCode = 400;
    throw error;
  }

  return updated;
}

async function deleteStage(userId, stageId) {
  const stage = await getStageForOwner(
    userId,
    stageId
  );

  const deleted = await stageModel.deleteStage(stageId);

  if (!deleted) {
    const error = new Error("Stage could not be deleted");
    error.statusCode = 400;
    throw error;
  }

  await stageModel.compactPositions(
    stage.learning_journey_id
  );

  return deleted;
}

async function reorderStages(
  userId,
  journeyId,
  data = {}
) {
  const {
    parentStageId = null,
    stageIds,
  } = data;

  if (!Array.isArray(stageIds) || stageIds.length === 0) {
    const error = new Error(
      "stageIds must be a non-empty array"
    );
    error.statusCode = 400;
    throw error;
  }

  const uniqueIds = new Set(stageIds);

  if (uniqueIds.size !== stageIds.length) {
    const error = new Error(
      "stageIds cannot contain duplicates"
    );
    error.statusCode = 400;
    throw error;
  }

  await verifyJourneyOwnership(userId, journeyId);

  if (parentStageId) {
    const parentStage =
      await stageModel.findStageInJourney(
        parentStageId,
        journeyId
      );

    if (!parentStage) {
      const error = new Error(
        "Parent Stage does not belong to this Learning Journey"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const siblingStages =
    await stageModel.findSiblingStages(
      journeyId,
      parentStageId
    );

  const siblingIds = siblingStages.map(
    (stage) => stage.id
  );

  if (siblingIds.length !== stageIds.length) {
    const error = new Error(
      "You must include every sibling Stage in the new order"
    );
    error.statusCode = 400;
    throw error;
  }

  const allAreSiblings = stageIds.every(
    (stageId) => siblingIds.includes(stageId)
  );

  if (!allAreSiblings) {
    const error = new Error(
      "One or more Stages do not belong to the specified parent"
    );
    error.statusCode = 400;
    throw error;
  }

  return stageModel.reorderStages(
    journeyId,
    parentStageId,
    stageIds
  );
}

const { randomUUID } = require("crypto");
const path = require("path");
const bucket = require("../config/gcs");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateImage(file) {
  if (!file) {
    const error = new Error("Image file is required");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error(
      "Only JPG, PNG and WEBP images are allowed"
    );
    error.statusCode = 400;
    throw error;
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    const error = new Error(
      "Image must be smaller than 5 MB"
    );
    error.statusCode = 400;
    throw error;
  }
}

function getExtension(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension) {
    return extension;
  }

  const extensionsByMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  return extensionsByMime[file.mimetype] || "";
}




module.exports = {
  createStage,
  getJourneyStages,
  updateStage,
  deleteStage,
  reorderStages,
};