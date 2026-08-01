const service = require("../services/learningPathService");

async function getEditor(req, res, next) {
  try {
    res.json(await service.getEditor(req.user.id, req.params.enrollmentId));
  } catch (error) { next(error); }
}

async function save(req, res, next) {
  try {
    res.json(await service.save(
      req.user.id,
      req.params.enrollmentId,
      req.body
    ));
  } catch (error) { next(error); }
}

async function remove(req, res, next) {
  try {
    res.json(await service.remove(req.user.id, req.params.enrollmentId));
  } catch (error) { next(error); }
}

module.exports = { getEditor, save, remove };
