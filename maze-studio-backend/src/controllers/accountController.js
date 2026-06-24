const accountService = require("../services/accountService");

async function deleteAccount(req, res, next) {
  try {
    const result = await accountService.deleteUserAccount(req.user.id, req.body);

    res.json({
      message: "Account scheduled for deletion",
      account: result,
    });
  } catch (error) {
    next(error);
  }
}

async function restoreAccount(req, res, next) {
  try {
    const user = await accountService.restoreUserAccount(req.user.id);

    res.json({
      message: "Account restored successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  deleteAccount,
  restoreAccount,
};