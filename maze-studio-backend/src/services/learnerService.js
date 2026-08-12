const learnerModel = require("../models/learnerModel");
const notificationService = require("./notificationService");

const VALID_PROGRESS = new Set(["IN_PROGRESS", "COMPLETED"]);
const EXERCISE_TYPES = new Set([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "FILL_BLANKS",
  "MATCHING",
  "CLASSIFICATION",
  "ORDERING",
]);

function buildStages(rows) {
  const allStages = [];
  const stagesById = new Map();

  for (const row of rows) {
    if (!stagesById.has(row.stage_id)) {
      const stage = {
        id: row.stage_id,
        title: row.stage_title,
        description: row.stage_description,
        position: row.stage_position,
        parentStageId: row.parent_stage_id,
        steps: [],
        children: [],
      };
      stagesById.set(row.stage_id, stage);
      allStages.push(stage);
    }

    if (row.step_id) {
      stagesById.get(row.stage_id).steps.push({
        id: row.step_id,
        title: row.step_title,
        description: row.step_description,
        position: row.step_position,
        estimatedMinutes: row.estimated_minutes,
        visualType: row.visual_type,
        icon: row.icon,
        emoji: row.emoji,
        imageUrl: row.image_url,
        color: row.color,
        pathPosition: row.path_position,
        isRequired: row.path_is_required,
        unlockRule: row.path_unlock_rule,
        pathReason: row.path_reason,
        learningPathId: row.learning_path_id,
        learningPathTitle: row.learning_path_title,
        learningPathSettings: row.learning_path_settings,
        progressStatus: row.progress_status,
      });
    }
  }

  for (const stage of allStages) {
    if (
      stage.parentStageId &&
      stagesById.has(stage.parentStageId)
    ) {
      stagesById
        .get(stage.parentStageId)
        .children.push(stage);
    }
  }

  const sortStages = (stages) => {
    stages.sort((left, right) => left.position - right.position);

    for (const stage of stages) {
      sortStages(stage.children);
    }
  };
  const stages = allStages.filter(
    (stage) =>
      !stage.parentStageId ||
      !stagesById.has(stage.parentStageId)
  );
  sortStages(stages);

  for (const step of flattenStageSteps(stages)) {
    step.locked = false;
  }

  return stages;
}

function flattenStageSteps(stages) {
  const steps = [];

  for (const stage of stages) {
    steps.push(...stage.steps);
    steps.push(...flattenStageSteps(stage.children));
  }

  return steps;
}

function summarize(stages) {
  const steps = flattenStageSteps(stages);
  const completedSteps = steps.filter(
    (step) => step.progressStatus === "COMPLETED"
  ).length;
  const nextStep =
    steps.find(
      (step) =>
        !step.locked &&
        step.progressStatus !== "COMPLETED"
    ) || null;

  return {
    completedSteps,
    totalSteps: steps.length,
    progress: steps.length
      ? Math.round((completedSteps / steps.length) * 100)
      : 0,
    nextStep,
  };
}

async function getJourneyForUser(userId, journeyId) {
  const journey = await learnerModel.findJourney(userId, journeyId);

  if (!journey) {
    const error = new Error("Learning Journey not found or not available");
    error.statusCode = 403;
    throw error;
  }

  const rows = await learnerModel.findJourneyStructure(
    journey.enrollment_id,
    journeyId
  );
  const stages = buildStages(rows);
  const pathSteps = flattenStepsWithStage(stages)
    .filter((step) => step.learningPathId)
    .sort(
      (left, right) =>
        Number(left.pathPosition) - Number(right.pathPosition)
    );
  const nextPathStep =
    pathSteps.find((step) => step.progressStatus !== "COMPLETED") || null;
  const learningPath = pathSteps.length
    ? {
        id: pathSteps[0].learningPathId,
        title: pathSteps[0].learningPathTitle,
        steps: pathSteps,
        nextStep: nextPathStep,
        completedSteps: pathSteps.filter(
          (step) => step.progressStatus === "COMPLETED"
        ).length,
        totalSteps: pathSteps.length,
        learnerGoal:
          pathSteps[0].learningPathSettings?.learnerGoal || "",
      }
    : null;

  return {
    id: journey.id,
    title: journey.title,
    description: journey.description,
    coverImageUrl: journey.cover_image_url,
    educatorName: journey.educator_name,
    educatorId: journey.educator_id,
    educatorAvatarUrl: journey.educator_avatar_url,
    educatorSlug: journey.educator_slug,
    stages,
    learningPath,
    ...summarize(stages),
  };
}

async function getEnrollments(userId) {
  const enrollments = await learnerModel.findEnrollments(userId);

  return Promise.all(
    enrollments.map(async (enrollment) => {
      const rows = await learnerModel.findJourneyStructure(
        enrollment.enrollment_id,
        enrollment.learning_journey_id
      );
      const stages = buildStages(rows);
      const summary = summarize(stages);

      return {
        enrollmentId: enrollment.enrollment_id,
        learningJourneyId: enrollment.learning_journey_id,
        title: enrollment.title,
        description: enrollment.description,
        coverImageUrl: enrollment.cover_image_url,
        educatorName: [
          enrollment.educator_first_name,
          enrollment.educator_last_name,
        ].filter(Boolean).join(" "),
        educatorId: enrollment.educator_id,
        educatorAvatarUrl: enrollment.educator_avatar_url,
        educatorSlug: enrollment.educator_slug,
        status: enrollment.status,
        updatedAt: enrollment.updated_at,
        ...summary,
      };
    })
  );
}

async function getStep(userId, journeyId, stepId) {
  const journey = await getJourneyForUser(userId, journeyId);
  const steps = flattenStepsWithStage(journey.stages);
  const index = steps.findIndex((step) => step.id === stepId);
  const stepMeta = steps[index];

  if (!stepMeta) {
    const error = new Error("Step not found");
    error.statusCode = 404;
    throw error;
  }

  if (stepMeta.locked) {
    const error = new Error(
      "Complete the previous Step before opening this one"
    );
    error.statusCode = 403;
    throw error;
  }

  const enrollment = await learnerModel.findActiveEnrollment(
    userId,
    journeyId
  );
  const [step, blocks, challenges] = await Promise.all([
    learnerModel.findStep(stepId, journeyId),
    learnerModel.findStepBlocks(stepId, enrollment.id),
    learnerModel.findStepChallenges(stepId, journeyId),
  ]);

  if (!step || !enrollment) {
    const error = new Error("Step not found or not available");
    error.statusCode = 403;
    throw error;
  }

  if (stepMeta.progressStatus === "NOT_STARTED") {
    await learnerModel.upsertStepProgress(
      enrollment.id,
      stepId,
      "IN_PROGRESS"
    );
    stepMeta.progressStatus = "IN_PROGRESS";
  }

  return {
    id: step.id,
    title: step.title,
    description: step.description,
    stageId: step.stage_id,
    stageTitle: step.stage_title,
    learningJourneyId: step.learning_journey_id,
    progressStatus: stepMeta.progressStatus,
    visualType: step.visual_type,
    icon: step.icon,
    emoji: step.emoji,
    imageUrl: step.image_url,
    color: step.color,
    content: { blocks: blocks.map(sanitizeLearnerBlock) },
    challenges,
    previousStep: steps[index - 1] || null,
    nextStep: steps[index + 1] || null,
  };
}

async function updateLearningPathGoal(userId, journeyId, rawGoal) {
  const goal = String(rawGoal || "").trim();
  if (!goal) {
    const error = new Error("Write a personal objective first");
    error.statusCode = 400;
    throw error;
  }
  if (goal.length > 500) {
    const error = new Error("The objective cannot exceed 500 characters");
    error.statusCode = 400;
    throw error;
  }
  const updated = await learnerModel.updateLearningPathGoal(
    userId,
    journeyId,
    goal
  );
  if (!updated) {
    const error = new Error("Active Learning Path not found");
    error.statusCode = 404;
    throw error;
  }
  return { goal: updated.settings.learnerGoal };
}

function flattenStepsWithStage(stages) {
  const steps = [];

  for (const stage of stages) {
    steps.push(
      ...stage.steps.map((step) => ({
        ...step,
        stageId: stage.id,
        stageTitle: stage.title,
      }))
    );
    steps.push(...flattenStepsWithStage(stage.children));
  }

  return steps;
}

function sanitizeLearnerBlock(block) {
  const content = { ...(block.content || {}) };

  delete content.correctAnswer;
  delete content.acceptedAnswers;
  delete content.explanation;

  if (Array.isArray(content.options)) {
    content.options = content.options.map((option) => {
      const safeOption = { ...option };
      delete safeOption.isCorrect;
      return safeOption;
    });
  }
  if (Array.isArray(content.items) && block.block_type === "CLASSIFICATION") {
    content.items = content.items.map(({ correctCategoryId, categoryId, ...item }) => item);
  }

  return {
    ...block,
    content,
  };
}

async function updateProgress(userId, stepId, status) {
  if (!VALID_PROGRESS.has(status)) {
    const error = new Error("Invalid progress status");
    error.statusCode = 400;
    throw error;
  }

  const step = await learnerModel.findStep(stepId, null);

  if (!step) {
    const error = new Error("Step not found");
    error.statusCode = 404;
    throw error;
  }

  const journey = await getJourneyForUser(userId, step.learning_journey_id);
  const current = flattenStageSteps(journey.stages)
    .find((item) => item.id === stepId);

  if (!current || current.locked) {
    const error = new Error("This Step is locked");
    error.statusCode = 403;
    throw error;
  }

  const enrollment = await learnerModel.findActiveEnrollment(
    userId,
    step.learning_journey_id
  );

  if (status === "COMPLETED") {
    const incompleteChallenges =
      await learnerModel.countIncompleteChallengeBlocks(
        enrollment.id,
        stepId
      );

    if (incompleteChallenges > 0) {
      const error = new Error(
        "Complete the required Challenge before advancing to the next Step"
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const updatedProgress = await learnerModel.upsertStepProgress(
    enrollment.id,
    stepId,
    status
  );
  if(status==="COMPLETED"){
    const context=await require("../config/db").query(`SELECT journey.owner_user_id,journey.title journey_title,step.title step_title FROM steps step JOIN stages stage ON stage.id=step.stage_id JOIN learning_journeys journey ON journey.id=stage.learning_journey_id WHERE step.id=$1`,[stepId]);
    const row=context.rows[0];if(row)await notificationService.create({recipientUserId:row.owner_user_id,actorUserId:userId,type:"STEP_COMPLETED",title:"Step completed",body:`A learner completed ${row.step_title} in ${row.journey_title}.`,actionUrl:"/insights",entityType:"STEP",entityId:stepId,deduplicationKey:`step-completed:${enrollment.id}:${stepId}`});
  }
  return updatedProgress;
}

async function checkExerciseAnswer(userId, blockId, answer) {
  const block = await learnerModel.findExerciseBlockAccess(userId, blockId);

  if (!block || !EXERCISE_TYPES.has(block.block_type)) {
    const error = new Error("Exercise not found or not available");
    error.statusCode = 403;
    throw error;
  }

  return gradeExerciseBlock(block,answer);
}

function gradeExerciseBlock(block,answer) {
  const content = block.content || {};
  const normalized = (value) => String(value ?? "").trim().toLowerCase();
  let correct = false;
  let correctAnswer = null;

  switch (block.block_type) {
    case "MULTIPLE_CHOICE": {
      const expected = (content.options || [])
        .filter((option) => option.isCorrect)
        .map((option) => option.id)
        .sort();
      const received = (Array.isArray(answer) ? answer : [answer])
        .filter(Boolean)
        .sort();
      correct =
        expected.length === received.length &&
        expected.every((value, index) => value === received[index]);
      correctAnswer = (content.options || [])
        .filter((option) => option.isCorrect)
        .map((option) => option.text)
        .join(", ");
      break;
    }
    case "TRUE_FALSE":
      correct = answer === content.correctAnswer;
      correctAnswer = content.correctAnswer ? "True" : "False";
      break;
    case "SHORT_ANSWER": {
      const accepted = (content.acceptedAnswers || []).map(normalized);
      correct = accepted.includes(normalized(answer));
      correctAnswer = (content.acceptedAnswers || []).join(", ");
      break;
    }
    case "FILL_BLANKS": {
      const expected = content.acceptedAnswers || [];
      const received = Array.isArray(answer) ? answer : [];
      correct =
        expected.length === received.length &&
        expected.every(
          (value, index) => normalized(value) === normalized(received[index])
        );
      correctAnswer = expected.join(", ");
      break;
    }
    case "MATCHING": {
      const pairs = content.pairs || [];
      correct = pairs.every((pair) => answer?.[pair.id] === pair.id);
      correctAnswer = pairs
        .map((pair) => `${pair.left} → ${pair.right}`)
        .join("; ");
      break;
    }
    case "ORDERING": {
      const expected = (content.items || []).map((item) => item.id);
      const received = (Array.isArray(answer) ? answer : []).map(
        (item) => item?.id || item
      );
      correct =
        expected.length === received.length &&
        expected.every((value, index) => value === received[index]);
      correctAnswer = (content.items || [])
        .map((item) => item.text)
        .join(" → ");
      break;
    }
    case "CLASSIFICATION": {
      const items=content.items||[],categories=content.categories||[];
      correct=items.length>0&&items.every(item=>answer?.[item.id]===(item.correctCategoryId||item.categoryId));
      correctAnswer=items.map(item=>`${item.text} → ${categories.find(category=>category.id===(item.correctCategoryId||item.categoryId))?.label||""}`).join("; ");
      break;
    }
    default:
      break;
  }

  return {
    correct,
    correctAnswer,
    explanation: content.explanation || null,
  };
}

module.exports = {
  getEnrollments,
  getJourneyForUser,
  getStep,
  updateProgress,
  checkExerciseAnswer,
  gradeExerciseBlock,
  submitChallengeAttempt: learnerModel.createChallengeAttempt,
  getChallengeAttempts: learnerModel.findChallengeAttempts,
  updateLearningPathGoal,
};
