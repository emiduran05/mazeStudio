const router=require("express").Router(),auth=require("../middlewares/authMiddleware"),educator=require("../middlewares/educatorOnlyMiddleware"),controller=require("../controllers/sessionIncidentController");
router.get("/session-incidents",auth,controller.list);
router.post("/calendar/events/:eventId/incidents",auth,controller.report);
router.post("/session-incidents/:id/respond",auth,educator,controller.respond);
module.exports=router;
