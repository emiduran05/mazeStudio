const multer = require("multer");

const allowedMimeTypes = new Set([
  // Imágenes
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",

  // PDF
  "application/pdf",

  // Documentos
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Texto y comprimidos
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);

const blockAssetUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 20 * 1024 * 1024,
  },

  fileFilter(req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error(
        "Unsupported file type"
      );

      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

module.exports = blockAssetUpload;