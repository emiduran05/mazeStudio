const bcrypt = require("bcryptjs");
const accountModel = require("../models/accountModel");
const userModel = require("../models/userModel");

async function deleteUserAccount(userId, data = {}) {
  const { password, reason } = data;

  if (!password) {
    const error = new Error("Password is required");
    error.statusCode = 400;
    throw error;
  }

  const account = await accountModel.findAccountForDelete(userId);

  if (!account || account.status !== "ACTIVE") {
    const error = new Error("Account not found or cannot be deleted");
    error.statusCode = 404;
    throw error;
  }

  const validPassword = await bcrypt.compare(password, account.password_hash);

  if (!validPassword) {
    const error = new Error("Invalid password");
    error.statusCode = 401;
    throw error;
  }

  return await accountModel.markAccountForDeletion(userId, reason || null);
}

async function restoreUserAccount(userId) {
  const restored = await accountModel.restoreAccount(userId);

  if (!restored) {
    const error = new Error("Account cannot be restored");
    error.statusCode = 400;
    throw error;
  }

  return await userModel.findUserById(userId, true);
}

module.exports = {
  deleteUserAccount,
  restoreUserAccount,
};