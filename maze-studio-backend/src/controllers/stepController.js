const stepService = require("../services/stepService");

async function create(req, res, next) {
  try {
    const step = await stepService.createStep(
      req.user.id,
      req.params.stageId,
      req.body
    );

    res.status(201).json({
      message: "Step created successfully",
      step,
    });
  } catch (error) {
    next(error);
  }
}

async function getByStage(req, res, next) {
  try {
    const steps = await stepService.getStageSteps(
      req.user.id,
      req.params.stageId
    );

    res.json({ steps });
  } catch (error) {
    next(error);
  }
}

async function uploadImage(req, res, next) {
  try {
    const step = await stepService.uploadStepImage(
      req.user.id,
      req.params.stepId,
      req.file
    );

    res.json({
      message: "Step image uploaded successfully",
      step,
    });
  } catch (error) {
    next(error);
  }
}

async function removeImage(req, res, next) {
  try {
    const step = await stepService.deleteStepImage(
      req.user.id,
      req.params.stepId
    );

    res.json({
      message: "Step image removed successfully",
      step,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  getByStage,
  getById,
  update,
  remove,
  reorder,
  uploadImage,
  removeImage,
};

async function update(req, res, next) {
  try {
    const step = await stepService.updateStep(
      req.user.id,
      req.params.stepId,
      req.body
    );

    res.json({
      message: "Step updated successfully",
      step,
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const step = await stepService.deleteStep(
      req.user.id,
      req.params.stepId
    );

    res.json({
      message: "Step deleted successfully",
      step,
    });
  } catch (error) {
    next(error);
  }
}

async function reorder(req, res, next) {
  try {
    const steps = await stepService.reorderSteps(
      req.user.id,
      req.params.stageId,
      req.body
    );

    res.json({
      message: "Steps reordered successfully",
      steps,
    });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const step = await stepService.getStep(
      req.user.id,
      req.params.stepId
    );

    res.json({ step });
  } catch (error) {
    next(error);
  }
}



module.exports = {
  create,
  removeImage,
  getByStage,
  getById,
  update,
  remove,
  reorder,
  uploadImage
};