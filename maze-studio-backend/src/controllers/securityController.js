const securityService = require("../services/securityService");

async function changePassword(req, res, next) {
  try {
    await securityService.changePassword(req.user.id, req.body);

    res.json({
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  changePassword,
};