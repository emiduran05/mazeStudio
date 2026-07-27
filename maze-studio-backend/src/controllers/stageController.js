const stageService = require("../services/stageService");

async function create(req, res, next) {
  try {
    const stage = await stageService.createStage(
      req.user.id,
      req.params.journeyId,
      req.body
    );

    res.status(201).json({
      message: "Stage created successfully",
      stage,
    });
  } catch (error) {
    next(error);
  }
}

async function getByJourney(req, res, next) {
  try {
    const stages =
      await stageService.getJourneyStages(
        req.user.id,
        req.params.journeyId
      );

    res.json({ stages });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const stage = await stageService.updateStage(
      req.user.id,
      req.params.stageId,
      req.body
    );

    res.json({
      message: "Stage updated successfully",
      stage,
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const stage = await stageService.deleteStage(
      req.user.id,
      req.params.stageId
    );

    res.json({
      message: "Stage deleted successfully",
      stage,
    });
  } catch (error) {
    next(error);
  }
}

async function reorder(req, res, next) {
  try {
    const stages = await stageService.reorderStages(
      req.user.id,
      req.params.journeyId,
      req.body
    );

    res.json({
      message: "Stages reordered successfully",
      stages,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  getByJourney,
  update,
  remove,
  reorder,
};