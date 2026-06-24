const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const profileController = require("../controllers/profileController");
const upload = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.put("/profile", authMiddleware, profileController.updateProfile);
router.put(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  profileController.uploadAvatar
);

module.exports = router;