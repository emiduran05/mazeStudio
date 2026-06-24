const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");

async function registerUser(data = {}) {
  const { firstName, lastName, email, password, role } = data;

  if (!firstName || !lastName || !email || !password || !role) {
    const error = new Error("All fields are required");
    error.statusCode = 400;
    throw error;
  }

  const allowedRoles = ["EDUCATOR", "STUDENT"];

  if (!allowedRoles.includes(role)) {
    const error = new Error("Invalid role");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await userModel.findUserByEmail(normalizedEmail);

  if (existingUser && existingUser.status !== "PENDING_DELETION") {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  if (existingUser && existingUser.status === "PENDING_DELETION") {
    const error = new Error("This email belongs to an account scheduled for deletion. Restore it or wait until it is permanently deleted.");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await userModel.createUser({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
  });

  const token = generateToken(user);

  return { user, token };
}

async function loginUser(data = {}) {
  const { email, password } = data;

  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await userModel.findUserByEmail(normalizedEmail);

  if (
    !user ||
    user.status === "SUSPENDED" ||
    user.status === "INACTIVE" ||
    user.status === "DELETED" ||
    !user.password_hash
  ) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  delete user.password_hash;

  const token = generateToken(user);

  return { user, token };
}

async function getCurrentUser(userId) {
  const user = await userModel.findUserById(userId, true);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};