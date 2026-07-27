const learningJourneyService = require("../services/learningJourneyService");

async function create(req, res, next) {
  try {
    const journey = await learningJourneyService.createLearningJourney(
      req.user.id,
      req.body
    );

    res.status(201).json({
      message: "Learning Journey created successfully",
      journey,
    });
  } catch (error) {
    next(error);
  }
}

async function getMine(req, res, next) {
  try {
    const journeys =
      await learningJourneyService.getMyLearningJourneys(req.user.id);

    res.json({ journeys });
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const journey = await learningJourneyService.getLearningJourney(
      req.user.id,
      req.params.id
    );

    res.json({ journey });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const journey = await learningJourneyService.updateLearningJourney(
      req.user.id,
      req.params.id,
      req.body
    );

    res.json({
      message: "Learning Journey updated successfully",
      journey,
    });
  } catch (error) {
    next(error);
  }
}

async function archive(req, res, next) {
  try {
    const result =
      await learningJourneyService.archiveLearningJourney(
        req.user.id,
        req.params.id
      );

    res.json({
      message: "Learning Journey archived successfully",
      journey: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getBuilder(req, res, next) {
  try {
    const builder =
      await learningJourneyService.getLearningJourneyBuilder(
        req.user.id,
        req.params.id
      );

    res.json(builder);
  } catch (error) {
    next(error);
  }
}

async function uploadCover(req, res, next) {
  try {
    const journey =
      await learningJourneyService.uploadJourneyCover(
        req.user.id,
        req.params.id,
        req.file
      );

    res.json({
      message: "Journey cover updated successfully",
      journey,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCover(req, res, next) {
  try {
    const journey =
      await learningJourneyService.deleteJourneyCover(
        req.user.id,
        req.params.id
      );

    res.json({
      message: "Journey cover removed successfully",
      journey,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  getMine,
  getById,
  getBuilder,
  uploadCover,
  deleteCover,
  update,
  archive,
};