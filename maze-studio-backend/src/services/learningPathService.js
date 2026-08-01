const learningPathModel = require("../models/learningPathModel");
const journeyAccess = require("./journeyAccessService");

async function requireOwnedEnrollment(educatorUserId, enrollmentId) {
  const enrollment =
    await learningPathModel.findEnrollmentContext(enrollmentId);
  if (!enrollment) {
    const error = new Error("Enrollment not found");
    error.statusCode = 404;
    throw error;
  }
  await journeyAccess.requireAccess(
    educatorUserId,
    enrollment.learning_journey_id,
    "TEACH"
  );
  return enrollment;
}

async function getEditor(educatorUserId, enrollmentId) {
  const enrollment = await requireOwnedEnrollment(
    educatorUserId,
    enrollmentId
  );
  const [steps, path] = await Promise.all([
    learningPathModel.findJourneySteps(enrollment.learning_journey_id),
    learningPathModel.findCurrentPath(enrollmentId),
  ]);
  return { enrollment, steps, path };
}

async function save(educatorUserId, enrollmentId, data = {}) {
  const enrollment = await requireOwnedEnrollment(
    educatorUserId,
    enrollmentId
  );
  if (enrollment.status !== "ACTIVE") {
    const error = new Error("The enrollment must be active");
    error.statusCode = 409;
    throw error;
  }
  const availableSteps = await learningPathModel.findJourneySteps(
    enrollment.learning_journey_id
  );
  const availableIds = new Set(availableSteps.map((step) => step.id));
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    const error = new Error("Select at least one Step");
    error.statusCode = 400;
    throw error;
  }
  const uniqueIds = new Set();
  for (const item of items) {
    if (!availableIds.has(item.stepId) || uniqueIds.has(item.stepId)) {
      const error = new Error("Learning Path contains an invalid Step");
      error.statusCode = 400;
      throw error;
    }
    uniqueIds.add(item.stepId);
  }
  const status = data.status === "DRAFT" ? "DRAFT" : "ACTIVE";
  await learningPathModel.savePath({
    enrollmentId,
    educatorUserId,
    title: String(data.title || "Personalized Learning Path").trim(),
    status,
    source: "MANUAL",
    items,
  });
  return getEditor(educatorUserId, enrollmentId);
}

async function remove(educatorUserId, enrollmentId) {
  await requireOwnedEnrollment(educatorUserId, enrollmentId);
  await learningPathModel.archivePath(enrollmentId);
  return { removed: true };
}

module.exports = { getEditor, save, remove };
