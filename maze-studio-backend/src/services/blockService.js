const blockModel = require("../models/blockModel");
const stepModel = require("../models/stepModel");
const storageService = require("./storageService");
const pool = require("../config/db");
const journeyAccess = require("./journeyAccessService");


const allowedBlockTypes = [
  "HEADING",
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "FILE",
  "PDF",
  "CODE",
  "QUOTE",
  "CALLOUT",
  "DIVIDER",
  "TABLE",
  "EMBED",
  "BUTTON",
  "LAYOUT",
  "COLUMN",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "FILL_BLANKS",
  "MATCHING",
  "ORDERING",
  "CHALLENGE",
];

const layoutPresets = {
  "50_50": [50, 50],
  "33_67": [33, 67],
  "67_33": [67, 33],
  "25_75": [25, 75],
  "75_25": [75, 25],
  "THREE_EQUAL": [33.33, 33.33, 33.33],
};

const assetBlockTypes = [
    "IMAGE",
    "PDF",
    "FILE",
];

async function validateChallengeReference(userId, stepId, blockType, content) {
  if (blockType !== "CHALLENGE") return;
  if (!content?.challengeId) {
    const error = new Error("Choose a Challenge for this Block");
    error.statusCode = 400;
    throw error;
  }
  const result = await pool.query(
    `SELECT challenge.id FROM challenges challenge
     JOIN learning_journeys journey
       ON journey.id=challenge.learning_journey_id
     JOIN stages stage ON stage.learning_journey_id=journey.id
     JOIN steps step ON step.stage_id=stage.id
     WHERE challenge.id=$1 AND step.id=$2
       AND challenge.status<>'ARCHIVED'`,
    [content.challengeId, stepId]
  );
  if (!result.rows[0]) {
    const error = new Error("Challenge must belong to this Learning Journey");
    error.statusCode = 400;
    throw error;
  }
}

async function createLayout(
  userId,
  stepId,
  data = {}
) {
  const widths = layoutPresets[data.preset];

  if (!widths) {
    const error = new Error("Invalid layout preset");
    error.statusCode = 400;
    throw error;
  }

  await getStepForOwner(userId, stepId);

  const layoutPosition =
    await blockModel.getNextPosition(stepId, null);

  const layout = await blockModel.createBlock({
    stepId,
    parentBlockId: null,
    blockType: "LAYOUT",
    position: layoutPosition,
    content: {},
    settings: {
      preset: data.preset,
      gap: "MEDIUM",
      mobileStack: true,
    },
  });

  const columns = [];

  for (let index = 0; index < widths.length; index += 1) {
    const column = await blockModel.createBlock({
      stepId,
      parentBlockId: layout.id,
      blockType: "COLUMN",
      position: index + 1,
      content: {},
      settings: {
        width: widths[index],
      },
    });

    columns.push(column);
  }

  return {
    layout,
    columns,
  };
}

function validateFileForBlock(block, file) {
  if (!file) {
    const error = new Error("File is required");
    error.statusCode = 400;
    throw error;
  }

  if (!assetBlockTypes.includes(block.block_type)) {
    const error = new Error(
      "This Block type does not support file uploads"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    block.block_type === "IMAGE" &&
    !file.mimetype.startsWith("image/")
  ) {
    const error = new Error(
      "An IMAGE Block requires an image file"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    block.block_type === "PDF" &&
    file.mimetype !== "application/pdf"
  ) {
    const error = new Error(
      "A PDF Block requires a PDF file"
    );

    error.statusCode = 400;
    throw error;
  }
}

async function uploadBlockAsset(
  userId,
  blockId,
  file
) {
  const block = await getBlockForOwner(
    userId,
    blockId
  );

  validateFileForBlock(block, file);

  const uploaded = await storageService.uploadFile({
    file,
    folder: `blocks/${block.block_type.toLowerCase()}`,
    ownerId: userId,
  });

  try {
    const updated =
      await blockModel.updateBlockAsset(
        blockId,
        {
          url: uploaded.publicUrl,
          objectKey: uploaded.objectKey,
          name: uploaded.originalName,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
        }
      );

    const previousObjectKey =
      block.content?.objectKey;

    if (previousObjectKey) {
      await storageService.deleteFile(
        previousObjectKey
      );
    }

    return updated;
  } catch (error) {
    await storageService.deleteFile(
      uploaded.objectKey
    );

    throw error;
  }
}

async function deleteBlockAsset(
  userId,
  blockId
) {
  const block = await getBlockForOwner(
    userId,
    blockId
  );

  const previousObjectKey =
    block.content?.objectKey;

  const updated =
    await blockModel.removeBlockAsset(blockId);

  if (!updated) {
    const error = new Error(
      "Block file could not be removed"
    );

    error.statusCode = 400;
    throw error;
  }

  if (previousObjectKey) {
    await storageService.deleteFile(
      previousObjectKey
    );
  }

  return updated;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

async function getStepForOwner(userId, stepId) {
  const step = await stepModel.findStepById(stepId);

  if (!step) {
    const error = new Error("Step not found");
    error.statusCode = 404;
    throw error;
  }

  await journeyAccess.requireAccess(userId, step.learning_journey_id, "EDIT");

  if (step.journey_status === "ARCHIVED") {
    const error = new Error(
      "The Learning Journey is archived"
    );

    error.statusCode = 400;
    throw error;
  }

  return step;
}

async function getBlockForOwner(
  userId,
  blockId
) {
  const block = await blockModel.findBlockById(
    blockId
  );

  if (!block) {
    const error = new Error("Block not found");
    error.statusCode = 404;
    throw error;
  }

  await journeyAccess.requireAccess(userId, block.learning_journey_id, "EDIT");

  if (block.journey_status === "ARCHIVED") {
    const error = new Error(
      "The Learning Journey is archived"
    );

    error.statusCode = 400;
    throw error;
  }

  return block;
}

async function createBlock(
  userId,
  stepId,
  data = {}
) {
  const {
    blockType,
    content = {},
    settings = {},
  } = data;

  if (!blockType) {
    const error = new Error(
      "Block type is required"
    );

    error.statusCode = 400;
    throw error;
  }

  if (!allowedBlockTypes.includes(blockType)) {
    const error = new Error(
      "Invalid Block type"
    );

    error.statusCode = 400;
    throw error;
  }

  if (!isPlainObject(content)) {
    const error = new Error(
      "Block content must be an object"
    );

    error.statusCode = 400;
    throw error;
  }

  if (!isPlainObject(settings)) {
    const error = new Error(
      "Block settings must be an object"
    );

    error.statusCode = 400;
    throw error;
  }

  await getStepForOwner(userId, stepId);

  const position =
    await blockModel.getNextPosition(stepId);

  return blockModel.createBlock({
    stepId,
    blockType,
    position,
    content,
    settings,
  });
}

async function getStepBlocks(userId, stepId) {
  await getStepForOwner(userId, stepId);

  return blockModel.findBlocksByStepId(stepId);
}

async function updateBlock(
  userId,
  blockId,
  data = {}
) {
  const existingBlock = await getBlockForOwner(userId, blockId);
  await validateChallengeReference(
    userId,
    existingBlock.step_id,
    data.blockType || existingBlock.block_type,
    data.content === undefined ? existingBlock.content : data.content
  );

  if (
    data.blockType !== undefined &&
    !allowedBlockTypes.includes(
      data.blockType
    )
  ) {
    const error = new Error(
      "Invalid Block type"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    data.content !== undefined &&
    !isPlainObject(data.content)
  ) {
    const error = new Error(
      "Block content must be an object"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    data.settings !== undefined &&
    !isPlainObject(data.settings)
  ) {
    const error = new Error(
      "Block settings must be an object"
    );

    error.statusCode = 400;
    throw error;
  }

  const updated = await blockModel.updateBlock(
    blockId,
    {
      blockType: data.blockType,
      ...(data.content !== undefined
        ? { content: data.content }
        : {}),
      ...(data.settings !== undefined
        ? { settings: data.settings }
        : {}),
    }
  );

  if (!updated) {
    const error = new Error(
      "Block could not be updated"
    );

    error.statusCode = 400;
    throw error;
  }

  return updated;
}

async function deleteBlock(userId, blockId) {
  const block = await getBlockForOwner(
    userId,
    blockId
  );

  const deleted = await blockModel.deleteBlock(
    blockId
  );

  if (!deleted) {
    const error = new Error(
      "Block could not be deleted"
    );

    error.statusCode = 400;
    throw error;
  }

  await blockModel.compactPositions(
    block.step_id
  );

  return deleted;
}

async function reorderBlocks(
  userId,
  stepId,
  data = {}
) {
  const {
    parentBlockId = null,
    blockIds,
  } = data;

  if (!Array.isArray(blockIds)) {
    const error = new Error(
      "blockIds must be an array"
    );
    error.statusCode = 400;
    throw error;
  }

  const uniqueIds = new Set(blockIds);

  if (uniqueIds.size !== blockIds.length) {
    const error = new Error(
      "blockIds cannot contain duplicates"
    );
    error.statusCode = 400;
    throw error;
  }

  await getStepForOwner(userId, stepId);
  const siblingBlocks =
    await blockModel.findBlocksByParent(
      stepId,
      parentBlockId
    );

  const siblingIds = siblingBlocks.map(
    (block) => block.id
  );

  if (siblingIds.length !== blockIds.length) {
    const error = new Error(
      "You must include every sibling Block in the new order"
    );
    error.statusCode = 400;
    throw error;
  }

  const siblingIdSet = new Set(siblingIds);

  const allBelongToGroup = blockIds.every(
    (blockId) => siblingIdSet.has(blockId)
  );

  if (!allBelongToGroup) {
    const error = new Error(
      "One or more Blocks do not belong to this group"
    );
    error.statusCode = 400;
    throw error;
  }

  return blockModel.reorderBlocks(
    stepId,
    parentBlockId,
    blockIds
  );
}

async function createBlock(
  userId,
  stepId,
  data = {}
) {
  const {
    blockType,
    parentBlockId = null,
    content = {},
    settings = {},
  } = data;

  await getStepForOwner(userId, stepId);
  await validateChallengeReference(userId, stepId, blockType, content);

  if (!allowedBlockTypes.includes(blockType)) {
    const error = new Error("Invalid Block type");
    error.statusCode = 400;
    throw error;
  }

  if (parentBlockId) {
    const parent = await blockModel.findBlockInStep(
      parentBlockId,
      stepId
    );

    if (!parent) {
      const error = new Error(
        "Parent Block does not belong to this Step"
      );
      error.statusCode = 400;
      throw error;
    }

    const allowedParents = [
      "LAYOUT",
      "COLUMN",
    ];

    if (!allowedParents.includes(parent.block_type)) {
      const error = new Error(
        "This Block type cannot contain child Blocks"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const position = await blockModel.getNextPosition(
    stepId,
    parentBlockId
  );

  return blockModel.createBlock({
    stepId,
    parentBlockId,
    blockType,
    position,
    content,
    settings,
  });
}

module.exports = {
    createBlock,
    getStepBlocks,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    uploadBlockAsset,
    deleteBlockAsset,
    createLayout,
};
