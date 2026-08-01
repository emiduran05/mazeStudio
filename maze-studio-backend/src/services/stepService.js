const stepModel = require("../models/stepModel");
const stageModel = require("../models/stageModel");
const storageService = require("./storageService");
const journeyAccess = require("./journeyAccessService");


const allowedStatuses = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];


async function uploadStepImage(
  userId,
  stepId,
  file
) {
  const step = await getStepForOwner(
    userId,
    stepId
  );

  const uploaded = await storageService.uploadImage({
    file,
    folder: "steps",
    ownerId: userId,
  });

  try {
    const updated = await stepModel.updateStepImage(
      stepId,
      {
        imageUrl: uploaded.publicUrl,
        imageObjectKey: uploaded.objectKey,
      }
    );

    if (step.image_object_key) {
      await storageService.deleteImage(
        step.image_object_key
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


async function uploadStepImage(userId, stepId, file) {
  if (!file) {
    const error = new Error("Image file is required");
    error.statusCode = 400;
    throw error;
  }

  const step = await getStepForOwner(userId, stepId);

  const uploaded = await storageService.uploadImage({
    file,
    folder: "steps",
    ownerId: userId,
  });

  try {
    const updated = await stepModel.updateStepImage(
      stepId,
      {
        imageUrl: uploaded.publicUrl,
        imageObjectKey: uploaded.objectKey,
      }
    );

    if (!updated) {
      const error = new Error(
        "Step image could not be saved"
      );
      error.statusCode = 400;
      throw error;
    }

    if (step.image_object_key) {
      await storageService.deleteImage(
        step.image_object_key
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

async function deleteStepImage(userId, stepId) {
  const step = await getStepForOwner(
    userId,
    stepId
  );

  const updated =
    await stepModel.removeStepImage(stepId);

  if (!updated) {
    const error = new Error(
      "Step image could not be removed"
    );
    error.statusCode = 400;
    throw error;
  }

  if (step.image_object_key) {
    await storageService.deleteImage(
      step.image_object_key
    );
  }

  return updated;
}

async function getStageForOwner(userId, stageId) {
  const stage = await stageModel.findStageById(stageId);

  if (!stage) {
    const error = new Error("Stage not found");
    error.statusCode = 404;
    throw error;
  }

  await journeyAccess.requireAccess(userId, stage.learning_journey_id, "EDIT");

  if (stage.journey_status === "ARCHIVED") {
    const error = new Error(
      "The Learning Journey is archived"
    );
    error.statusCode = 400;
    throw error;
  }

  return stage;
}

async function createStep(userId, stageId, data = {}) {
  const {
    title,
    description = null,
    status = "DRAFT",
    estimatedMinutes = null,
    isPreview = false,
    icon = null,
    color = null,
  } = data;

  if (!title?.trim()) {
    const error = new Error("Step title is required");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedStatuses.includes(status)) {
    const error = new Error("Invalid Step status");
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
      "Estimated minutes must be a non-negative integer"
    );
    error.statusCode = 400;
    throw error;
  }

  if (typeof isPreview !== "boolean") {
    const error = new Error(
      "isPreview must be a boolean"
    );
    error.statusCode = 400;
    throw error;
  }

  await getStageForOwner(userId, stageId);

  const position = await stepModel.getNextPosition(stageId);

  return stepModel.createStep({
    stageId,
    title: title.trim(),
    description,
    position,
    status,
    estimatedMinutes,
    isPreview,
    icon,
    color,
  });
}

async function getStageSteps(userId, stageId) {
  await getStageForOwner(userId, stageId);

  return stepModel.findStepsByStageId(stageId);
}

async function getStepForOwner(userId, stepId) {
  const step = await stepModel.findStepById(stepId);

  if (!step) {
    const error = new Error("Step not found");
    error.statusCode = 404;
    throw error;
  }

  await journeyAccess.requireAccess(userId, step.learning_journey_id, "EDIT");

  return step;
}

async function updateStep(userId, stepId, data = {}) {
  await getStepForOwner(userId, stepId);

  if (
    data.title !== undefined &&
    !data.title?.trim()
  ) {
    const error = new Error(
      "Step title cannot be empty"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    data.status !== undefined &&
    !allowedStatuses.includes(data.status)
  ) {
    const error = new Error("Invalid Step status");
    error.statusCode = 400;
    throw error;
  }

  if (
    data.estimatedMinutes !== undefined &&
    data.estimatedMinutes !== null &&
    (
      !Number.isInteger(data.estimatedMinutes) ||
      data.estimatedMinutes < 0
    )
  ) {
    const error = new Error(
      "Estimated minutes must be a non-negative integer"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    data.isPreview !== undefined &&
    typeof data.isPreview !== "boolean"
  ) {
    const error = new Error(
      "isPreview must be a boolean"
    );
    error.statusCode = 400;
    throw error;
  }

  const updated = await stepModel.updateStep(
    stepId,
    {
      title:
        data.title !== undefined
          ? data.title.trim()
          : undefined,
      description: data.description,
      status: data.status,
      estimatedMinutes: data.estimatedMinutes,
      isPreview: data.isPreview,
      icon: data.icon,
      color: data.color,
    }
  );

  if (!updated) {
    const error = new Error(
      "Step could not be updated"
    );
    error.statusCode = 400;
    throw error;
  }

  return updated;
}

async function deleteStep(userId, stepId) {
  const step = await getStepForOwner(userId, stepId);

  const deleted = await stepModel.deleteStep(stepId);

  if (!deleted) {
    const error = new Error(
      "Step could not be deleted"
    );
    error.statusCode = 400;
    throw error;
  }

  await stepModel.compactPositions(step.stage_id);

  return deleted;
}

async function reorderSteps(
  userId,
  stageId,
  data = {}
) {
  const { stepIds } = data;

  if (
    !Array.isArray(stepIds) ||
    stepIds.length === 0
  ) {
    const error = new Error(
      "stepIds must be a non-empty array"
    );
    error.statusCode = 400;
    throw error;
  }

  const uniqueIds = new Set(stepIds);

  if (uniqueIds.size !== stepIds.length) {
    const error = new Error(
      "stepIds cannot contain duplicates"
    );
    error.statusCode = 400;
    throw error;
  }

  await getStageForOwner(userId, stageId);

  const existingSteps =
    await stepModel.findStepsByStageId(stageId);

  const existingIds = existingSteps.map(
    (step) => step.id
  );

  if (existingIds.length !== stepIds.length) {
    const error = new Error(
      "You must include every Step in the new order"
    );
    error.statusCode = 400;
    throw error;
  }

  const allBelongToStage = stepIds.every(
    (stepId) => existingIds.includes(stepId)
  );

  if (!allBelongToStage) {
    const error = new Error(
      "One or more Steps do not belong to this Stage"
    );
    error.statusCode = 400;
    throw error;
  }

  return stepModel.reorderSteps(stageId, stepIds);
}

async function getStep(userId, stepId) {
  return getStepForOwner(userId, stepId);
}


module.exports = {
  createStep,
  getStageSteps,
  getStep,
  updateStep,
  deleteStep,
  reorderSteps,
  uploadStepImage,
  deleteStepImage,
};
