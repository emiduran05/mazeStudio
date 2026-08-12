const blockService = require(
  "../services/blockService"
);

async function create(req, res, next) {
  try {
    const block = await blockService.createBlock(
      req.user.id,
      req.params.stepId,
      req.body
    );

    res.status(201).json({
      message: "Block created successfully",
      block,
    });
  } catch (error) {
    next(error);
  }
}

async function getByStep(req, res, next) {
  try {
    const blocks =
      await blockService.getStepBlocks(
        req.user.id,
        req.params.stepId
      );

    res.json({ blocks });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const block = await blockService.updateBlock(
      req.user.id,
      req.params.blockId,
      req.body
    );

    res.json({
      message: "Block updated successfully",
      block,
    });
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const block = await blockService.deleteBlock(
      req.user.id,
      req.params.blockId
    );

    res.json({
      message: "Block deleted successfully",
      block,
    });
  } catch (error) {
    next(error);
  }
}

async function reorder(req, res, next) {
  try {
    const blocks =
      await blockService.reorderBlocks(
        req.user.id,
        req.params.stepId,
        req.body
      );

    res.json({
      message: "Blocks reordered successfully",
      blocks,
    });
  } catch (error) {
    next(error);
  }
}

async function uploadAsset(req, res, next) {
  try {
    const block =
      await blockService.uploadBlockAsset(
        req.user.id,
        req.params.blockId,
        req.file
      );

    res.json({
      message: "Block file uploaded successfully",
      block,
    });
  } catch (error) {
    next(error);
  }
}

async function removeAsset(req, res, next) {
  try {
    const block =
      await blockService.deleteBlockAsset(
        req.user.id,
        req.params.blockId
      );

    res.json({
      message: "Block file removed successfully",
      block,
    });
  } catch (error) {
    next(error);
  }
}

async function createLayout(req, res, next) {
  try {
    const layout = await blockService.createLayout(
      req.user.id,
      req.params.stepId,
      req.body
    );

    res.status(201).json(layout);
  } catch (error) {
    next(error);
  }
}
async function uploadInlineImage(req,res,next){try{res.json({asset:await blockService.uploadInlineImage(req.user.id,req.params.blockId,req.file)});}catch(error){next(error)}}
async function uploadCanvasAsset(req,res,next){try{res.json({asset:await blockService.uploadCanvasAsset(req.user.id,req.params.blockId,req.file)});}catch(error){next(error)}}
async function checkPresentationExercise(req,res,next){try{res.json(await blockService.checkPresentationExercise(req.user.id,req.params.blockId,req.body.answer))}catch(error){next(error)}}
module.exports = {
    create,
    getByStep,
    update,
    remove,
    reorder,
    uploadAsset,
    uploadInlineImage,
    uploadCanvasAsset,
    removeAsset,
    createLayout,
    checkPresentationExercise,
};
