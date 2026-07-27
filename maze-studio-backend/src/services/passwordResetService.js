const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const passwordResetModel = require("../models/passwordResetModel");
const transporter = require("../config/mailer");

async function forgotPassword(data = {}) {
  const { email } = data;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await userModel.findUserByEmail(normalizedEmail);

  if (!user || user.status === "DELETED") {
    return {
      message: "If this email exists, a reset link has been sent.",
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await passwordResetModel.createResetToken(user.id, token, expiresAt);

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"Maze Studio" <${process.env.EMAIL_USER}>`,
    to: normalizedEmail,
    subject: "Reset your Maze Studio password",
    html: `
      <h2>Reset your password</h2>
      <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#4642ff;color:#fff;text-decoration:none;border-radius:10px;">
        Reset password
      </a>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });

  return {
    message: "If this email exists, a reset link has been sent.",
  };
}

async function resetPassword(data = {}) {
  const { token, newPassword } = data;

  if (!token || !newPassword) {
    const error = new Error("Token and new password are required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("Password must be at least 8 characters long");
    error.statusCode = 400;
    throw error;
  }

  const resetToken = await passwordResetModel.findValidToken(token);

  if (!resetToken) {
    const error = new Error("Invalid or expired reset token");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await passwordResetModel.updateUserPassword(resetToken.user_id, passwordHash);
  await passwordResetModel.markTokenUsed(resetToken.id);

  return {
    message: "Password reset successfully",
  };
}

module.exports = {
  forgotPassword,
  resetPassword,
};