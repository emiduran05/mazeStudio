const profileService = require("../services/profileService");

async function updateProfile(req, res, next) {
  try {
    const user = await profileService.updateUserProfile(req.user.id, req.body);

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    const user = await profileService.uploadUserAvatar(req.user.id, req.file);

    res.json({
      message: "Avatar uploaded successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateProfile,
  uploadAvatar,
};