const bcrypt = require("bcryptjs");
const securityModel = require("../models/securityModel");

async function changePassword(userId, data = {}) {
  const { currentPassword, newPassword } = data;

  if (!currentPassword || !newPassword) {
    const error = new Error("Current password and new password are required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("New password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error("New password must be different from current password");
    error.statusCode = 400;
    throw error;
  }

  const user = await securityModel.findPasswordByUserId(userId);

  if (!user || !user.password_hash) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password_hash
  );

  if (!isCurrentPasswordValid) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 401;
    throw error;
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  return await securityModel.updatePassword(userId, newPasswordHash);
}

module.exports = {
  changePassword,
};