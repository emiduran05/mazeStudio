const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const userModel = require("../models/userModel");

const generateToken = require(
  "../utils/generateToken"
);

const billingService = require(
  "./billingService"
);

const enrollmentService = require(
  "./enrollmentService"
);

const ALLOWED_ROLES = [
  "EDUCATOR",
  "STUDENT",
];

async function acceptInvitationIfPresent(
  user,
  invitationToken
) {
  if (
    typeof invitationToken !== "string" ||
    !invitationToken.trim()
  ) {
    return null;
  }

  return enrollmentService.acceptInvitationForUser(
    user,
    invitationToken.trim()
  );
}

async function registerUser(data = {}) {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    invitationToken = null,
  } = data;

  const normalizedFirstName =
    typeof firstName === "string"
      ? firstName.trim()
      : "";

  const normalizedLastName =
    typeof lastName === "string"
      ? lastName.trim()
      : "";

  const normalizedEmail =
    typeof email === "string"
      ? email.toLowerCase().trim()
      : "";

  if (
    !normalizedFirstName ||
    !normalizedLastName ||
    !normalizedEmail ||
    !password ||
    !role
  ) {
    const error = new Error(
      "All fields are required"
    );

    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_ROLES.includes(role)) {
    const error = new Error("Invalid role");

    error.statusCode = 400;
    throw error;
  }

  if (
    typeof password !== "string" ||
    password.length < 8
  ) {
    const error = new Error(
      "Password must be at least 8 characters long"
    );

    error.statusCode = 400;
    throw error;
  }

  const existingUser =
    await userModel.findUserByEmail(
      normalizedEmail
    );

  /*
   * Permite que un Educator cuya cuenta quedó
   * pendiente vuelva a generar el Checkout.
   */
  if (existingUser) {
    if (
      existingUser.status ===
      "PENDING_PAYMENT"
    ) {
      if (existingUser.role !== "EDUCATOR") {
        const error = new Error(
          "Email already registered"
        );

        error.statusCode = 409;
        throw error;
      }

      if (!existingUser.password_hash) {
        const error = new Error(
          "Unable to resume this registration"
        );

        error.statusCode = 400;
        throw error;
      }

      const passwordMatches =
        await bcrypt.compare(
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

      /*
       * Si volvió mediante una invitación,
       * la aceptamos para esta cuenta existente.
       *
       * La inscripción quedará guardada aunque
       * todavía necesite completar el pago.
       */
      await acceptInvitationIfPresent(
        existingUser,
        invitationToken
      );

      const checkout =
        await billingService
          .createEducatorCheckoutForNewUser(
            existingUser
          );

      const safeUser = {
        ...existingUser,
        stripe_customer_id:
          checkout.stripeCustomerId,
      };

      delete safeUser.password_hash;

      return {
        message:
          "Continue your educator subscription payment.",

        user: safeUser,

        token: null,
        requiresPayment: true,
        resumedRegistration: true,
        checkoutUrl: checkout.checkoutUrl,
      };
    }

    if (
      existingUser.status ===
      "PENDING_DELETION"
    ) {
      const error = new Error(
        "This email belongs to an account scheduled for deletion. Restore the account before registering again."
      );

      error.statusCode = 409;
      throw error;
    }

    if (
      typeof invitationToken === "string" &&
      invitationToken.trim() &&
      existingUser.status === "ACTIVE"
    ) {
      const passwordMatches =
        await bcrypt.compare(
          password,
          existingUser.password_hash
        );

      if (!passwordMatches) {
        const error = new Error(
          "This email already has an account. Log in with the correct password to accept the invitation."
        );
        error.statusCode = 401;
        throw error;
      }

      const acceptedEnrollment =
        await enrollmentService.acceptInvitationForUser(
          existingUser,
          invitationToken.trim()
        );
      const safeUser = { ...existingUser };
      delete safeUser.password_hash;

      return {
        message: "Invitation accepted successfully.",
        user: safeUser,
        token: generateToken(safeUser),
        requiresPayment: false,
        resumedRegistration: true,
        checkoutUrl: null,
        acceptedEnrollment,
      };
    }

    const error = new Error(
      "Email already registered"
    );

    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(
    password,
    12
  );

  const initialStatus =
    role === "EDUCATOR"
      ? "PENDING_PAYMENT"
      : "ACTIVE";

  const client = await pool.connect();
  let user;

  /*
   * Reclama la invitación después de crear
   * correctamente la cuenta.
   *
   * Funciona tanto para STUDENT como EDUCATOR.
   */
  let acceptedEnrollment = null;

  try {
    await client.query("BEGIN");

    user = await userModel.createUser({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      passwordHash,
      role,
      status: initialStatus,
    }, client);

    if (
      typeof invitationToken === "string" &&
      invitationToken.trim()
    ) {
      acceptedEnrollment =
        await enrollmentService.acceptInvitationForUser(
          user,
          invitationToken.trim(),
          client
        );
    }

    await client.query("COMMIT");
  } catch (error) {
    /*
     * La cuenta ya fue creada, por lo que no
     * debemos ocultar ese hecho.
     *
     * Lo ideal posteriormente será envolver
     * creación de usuario + invitación en una
     * transacción.
     */
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  /*
   * Student:
   * cuenta activa inmediatamente.
   */
  if (role === "STUDENT") {
    const token = generateToken(user);

    return {
      message: acceptedEnrollment
        ? "Account created and invitation accepted successfully."
        : "Student registered successfully",

      user,
      token,
      requiresPayment: false,
      resumedRegistration: false,
      checkoutUrl: null,
      acceptedEnrollment,
    };
  }

  /*
   * Educator:
   * puede tener inscripciones como learner,
   * pero requiere pagar para acceder al Studio.
   */
  try {
    const checkout =
      await billingService
        .createEducatorCheckoutForNewUser(
          user
        );

    return {
      message: acceptedEnrollment
        ? "Account created and invitation accepted. Subscription payment is required to access the Studio."
        : "Educator account created. Subscription payment is required.",

      user: {
        ...user,
        stripe_customer_id:
          checkout.stripeCustomerId,
      },

      token: null,
      requiresPayment: true,
      resumedRegistration: false,
      checkoutUrl: checkout.checkoutUrl,
      acceptedEnrollment,
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
    checkoutError.code =
      "CHECKOUT_CREATION_FAILED";

    checkoutError.userId = user.id;

    throw checkoutError;
  }
}

async function loginUser(data = {}) {
  const {
    email,
    password,
    stayLogged,
    invitationToken = null,
  } = data;

  const normalizedEmail =
    typeof email === "string"
      ? email.toLowerCase().trim()
      : "";

  if (!normalizedEmail || !password) {
    const error = new Error(
      "Email and password are required"
    );

    error.statusCode = 400;
    throw error;
  }

  const user =
    await userModel.findUserByEmail(
      normalizedEmail
    );

  if (
    !user ||
    user.status === "SUSPENDED" ||
    user.status === "DELETED" ||
    user.status === "PENDING_DELETION" ||
    !user.password_hash
  ) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;
    throw error;
  }

  /*
   * Primero comprobamos la contraseña.
   * Así no revelamos el estado de una cuenta
   * a alguien que no conoce sus credenciales.
   */
  const isPasswordValid =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!isPasswordValid) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;
    throw error;
  }

  const safeUser = {
    ...user,
  };

  delete safeUser.password_hash;

  await acceptInvitationIfPresent(
    safeUser,
    invitationToken
  );

  const token = generateToken(
    safeUser,
    stayLogged
  );

  return {
    user: safeUser,
    token,
  };
}

async function getCurrentUser(userId) {
  const user =
    await userModel.findUserById(
      userId,
      true
    );

  if (!user) {
    const error = new Error(
      "User not found"
    );

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
