const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const billingService = require("./billingService");

async function registerUser(data = {}) {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
  } = data;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !password ||
    !role
  ) {
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

  if (password.length < 8) {
    const error = new Error(
      "Password must be at least 8 characters long"
    );

    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser =
  await userModel.findUserByEmail(normalizedEmail);

if (existingUser) {
  if (existingUser.status === "PENDING_PAYMENT") {
    if (existingUser.role !== "EDUCATOR") {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    if (!existingUser.password_hash) {
      const error = new Error("Unable to resume this registration");
      error.statusCode = 400;
      throw error;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      existingUser.password_hash
    );

    if (!passwordMatches) {
      const error = new Error(
        "An educator registration already exists for this email. Enter the original password to continue payment."
      );

      error.statusCode = 401;
      throw error;
    }

    const checkout =
      await billingService.createEducatorCheckoutForNewUser(
        existingUser
      );

    delete existingUser.password_hash;

    return {
      message: "Continue your educator subscription payment.",
      user: {
        ...existingUser,
        stripe_customer_id: checkout.stripeCustomerId,
      },
      token: null,
      requiresPayment: true,
      resumedRegistration: true,
      checkoutUrl: checkout.checkoutUrl,
    };
  }

  if (existingUser.status === "PENDING_DELETION") {
    const error = new Error(
      "This email belongs to an account scheduled for deletion. Restore the account before registering again."
    );

    error.statusCode = 409;
    throw error;
  }

  const error = new Error("Email already registered");
  error.statusCode = 409;
  throw error;
}

  const passwordHash = await bcrypt.hash(password, 12);

  const initialStatus =
    role === "EDUCATOR"
      ? "PENDING_PAYMENT"
      : "ACTIVE";

  const user = await userModel.createUser({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    status: initialStatus,
  });

  if (role === "STUDENT") {
    const token = generateToken(user);

    return {
      message: "Student registered successfully",
      user,
      token,
      requiresPayment: false,
      checkoutUrl: null,
    };
  }

  try {
    const checkout =
      await billingService.createEducatorCheckoutForNewUser(
        user
      );

    return {
      message:
        "Educator account created. Subscription payment is required.",
      user: {
        ...user,
        stripe_customer_id: checkout.stripeCustomerId,
      },
      token: null,
      requiresPayment: true,
      checkoutUrl: checkout.checkoutUrl,
    };
  } catch (error) {
    console.error(
      "Could not create Stripe Checkout Session:",
      error
    );

    const checkoutError = new Error(
      "Your account was created, but the payment page could not be prepared."
    );

    checkoutError.statusCode = 502;
    checkoutError.code = "CHECKOUT_CREATION_FAILED";
    throw checkoutError;
  }
}

async function loginUser(data = {}) {
  const { email, password, stayLogged } = data;

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
    user.status === "DELETED" ||
    !user.password_hash
  ) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (user.status === "PENDING_PAYMENT") {
    const error = new Error(
      "Your educator registration is pending payment."
    );
    error.statusCode = 403;
    error.code = "PAYMENT_REQUIRED";
    error.userId = user.id;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  delete user.password_hash;

  const token = generateToken(user, stayLogged);

  return {
    user,
    token,
  };
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