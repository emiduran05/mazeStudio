const express = require("express");
const auth = require("../middlewares/authMiddleware");
const educatorOnly = require("../middlewares/educatorOnlyMiddleware");
const controller = require("../controllers/learningPathController");

const router = express.Router();
router.get(
  "/enrollments/:enrollmentId/learning-path",
  auth, educatorOnly, controller.getEditor
);
router.put(
  "/enrollments/:enrollmentId/learning-path",
  auth, educatorOnly, controller.save
);
router.delete(
  "/enrollments/:enrollmentId/learning-path",
  auth, educatorOnly, controller.remove
);

module.exports = router;
