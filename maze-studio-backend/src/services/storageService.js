const { randomUUID } = require("crypto");
const path = require("path");
const bucket = require("../config/gcs");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateImage(file) {
  if (!file) {
    const error = new Error("Image file is required");
    error.statusCode = 400;
    throw error;
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error(
      "Only JPG, PNG and WEBP images are allowed"
    );
    error.statusCode = 400;
    throw error;
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    const error = new Error(
      "Image must be smaller than 5 MB"
    );
    error.statusCode = 400;
    throw error;
  }
}

function getExtension(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension) {
    return extension;
  }

  const extensionsByMime = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };

  return extensionsByMime[file.mimetype] || "";
}

async function uploadImage({
  file,
  folder,
  ownerId,
}) {
  validateImage(file);

  const extension = getExtension(file);

  const objectKey =
    `${folder}/${ownerId}/` +
    `${randomUUID()}-${Date.now()}${extension}`;

  const cloudFile = bucket.file(objectKey);

  await cloudFile.save(file.buffer, {
    resumable: false,
    metadata: {
      contentType: file.mimetype,
      cacheControl: "public, max-age=31536000",
    },
  });

  const publicUrl =
    `https://storage.googleapis.com/` +
    `${bucket.name}/${encodeURI(objectKey)}`;

  return {
    objectKey,
    publicUrl,
  };
}

async function deleteImage(objectKey) {
  if (!objectKey) return;

  try {
    await bucket.file(objectKey).delete({
      ignoreNotFound: true,
    });
  } catch (error) {
    console.error(
      `Could not delete GCS object ${objectKey}:`,
      error.message
    );
  }
}

module.exports = {
  uploadImage,
  deleteImage,
};