const router=require("express").Router();
const auth=require("../middlewares/authMiddleware");
const controller=require("../controllers/videoController");
const whiteboard=require("../controllers/whiteboardController");
router.get("/video/events/:eventId/access",auth,controller.access);
router.post("/video/events/:eventId/leave",auth,controller.leave);
router.get("/video/events/:eventId/whiteboard",auth,whiteboard.get);
router.put("/video/events/:eventId/whiteboard",auth,whiteboard.save);
module.exports=router;
