const multer = require("multer");

const imageUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter(req, file, callback) {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error(
        "Only JPG, PNG and WEBP images are allowed"
      );

      error.statusCode = 400;

      return callback(error);
    }

    callback(null, true);
  },
});

module.exports = imageUpload;