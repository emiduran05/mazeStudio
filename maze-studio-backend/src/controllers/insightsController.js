const insightsModel = require("../models/insightsModel");

async function overview(req, res, next) {
  try {
    res.json(await insightsModel.getOverview(req.user.id, {
      journeyId: req.query.journeyId || null,
      pathId: req.query.pathId || null,
    }));
  } catch (error) {
    next(error);
  }
}

module.exports = { overview };
