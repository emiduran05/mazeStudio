const profileModel = require("../models/profileModel");
const userModel = require("../models/userModel");
const bucket = require("../config/gcs");
const path = require("path");

async function updateUserProfile(userId, data = {}) {
  const { firstName, lastName, email, avatarUrl, timezone } = data;

  if (!firstName || !lastName || !email) {
    const error = new Error("First name, last name and email are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const emailExists = await profileModel.findUserByEmailExceptCurrent(
    normalizedEmail,
    userId
  );

  if (emailExists) {
    const error = new Error("Email is already in use");
    error.statusCode = 409;
    throw error;
  }

  await profileModel.updateProfile(userId, {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    avatarUrl: avatarUrl || null,
    timezone: timezone || "America/Mexico_City",
  });

  return await userModel.findUserById(userId, true);
}


async function uploadUserAvatar(userId, file) {
  if (!file) {
    const error = new Error("Avatar image is required");
    error.statusCode = 400;
    throw error;
  }

  const currentUser = await userModel.findUserById(userId, true);

  const extension = path.extname(file.originalname) || ".png";
  const objectKey = `avatars/${userId}-${Date.now()}${extension}`;

  const blob = bucket.file(objectKey);

  await blob.save(file.buffer, {
    metadata: {
      contentType: file.mimetype,
    },
    resumable: false,
  });

  const avatarUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectKey}`;

  await profileModel.updateAvatar(userId, avatarUrl, objectKey);

  if (currentUser?.avatar_object_key) {
    await bucket.file(currentUser.avatar_object_key).delete({
      ignoreNotFound: true,
    });
  }

  return await userModel.findUserById(userId, true);
}

module.exports = {
  updateUserProfile,
  uploadUserAvatar,
};