const passwordResetService = require("../services/passwordResetService");

async function forgotPassword(req, res, next) {
  try {
    const result = await passwordResetService.forgotPassword(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await passwordResetService.resetPassword(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
};