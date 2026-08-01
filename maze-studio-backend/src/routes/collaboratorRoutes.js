const express=require("express");const auth=require("../middlewares/authMiddleware");const educator=require("../middlewares/educatorOnlyMiddleware");const controller=require("../controllers/collaboratorController");const router=express.Router();
router.get("/learning-journeys/:journeyId/collaborators",auth,educator,controller.list);
router.post("/learning-journeys/:journeyId/collaborators",auth,educator,controller.add);
router.patch("/learning-journeys/:journeyId/collaborators/:collaboratorId",auth,educator,controller.update);
router.delete("/learning-journeys/:journeyId/collaborators/:collaboratorId",auth,educator,controller.remove);
module.exports=router;
