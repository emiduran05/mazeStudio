const pool = require("../config/db");

async function createBlock({
  stepId,
  parentBlockId = null,
  blockType,
  position,
  content,
  settings,
}) {
  const result = await pool.query(
    `
    INSERT INTO step_blocks (
      step_id,
      parent_block_id,
      block_type,
      position,
      content,
      settings
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
    RETURNING *
    `,
    [
      stepId,
      parentBlockId,
      blockType,
      position,
      JSON.stringify(content),
      JSON.stringify(settings),
    ]
  );

  return result.rows[0];
}
async function findBlocksByStepId(stepId) {
  const result = await pool.query(
    `
    SELECT *
    FROM step_blocks
    WHERE step_id = $1
    ORDER BY position ASC, created_at ASC
    `,
    [stepId]
  );

  return result.rows;
}

async function findBlockById(blockId) {
  const result = await pool.query(
    `
    SELECT
      b.*,
      st.stage_id,
      s.learning_journey_id,
      lj.owner_user_id,
      lj.status AS journey_status
    FROM step_blocks b
    INNER JOIN steps st
      ON st.id = b.step_id
    INNER JOIN stages s
      ON s.id = st.stage_id
    INNER JOIN learning_journeys lj
      ON lj.id = s.learning_journey_id
    WHERE b.id = $1
    `,
    [blockId]
  );

  return result.rows[0];
}

async function getNextPosition(
  stepId,
  parentBlockId = null
) {
  const result = await pool.query(
    `
    SELECT COALESCE(MAX(position), 0) + 1 AS next_position
    FROM step_blocks
    WHERE step_id = $1
      AND parent_block_id IS NOT DISTINCT FROM $2
    `,
    [stepId, parentBlockId]
  );

  return Number(result.rows[0].next_position);
}
async function updateBlock(blockId, data = {}) {
  const {
    blockType,
    content,
    settings,
  } = data;

  const hasContent =
    Object.prototype.hasOwnProperty.call(
      data,
      "content"
    );

  const hasSettings =
    Object.prototype.hasOwnProperty.call(
      data,
      "settings"
    );

  const result = await pool.query(
    `
    UPDATE step_blocks
    SET
      block_type = COALESCE($1, block_type),

      content = CASE
        WHEN $2::boolean
        THEN $3::jsonb
        ELSE content
      END,

      settings = CASE
        WHEN $4::boolean
        THEN $5::jsonb
        ELSE settings
      END,

      updated_at = NOW()

    WHERE id = $6

    RETURNING *
    `,
    [
      blockType,
      hasContent,
      JSON.stringify(content ?? {}),
      hasSettings,
      JSON.stringify(settings ?? {}),
      blockId,
    ]
  );

  return result.rows[0];
}

async function findBlocksByParent(
  stepId,
  parentBlockId = null
) {
  const result = await pool.query(
    `
    SELECT *
    FROM step_blocks
    WHERE step_id = $1
      AND parent_block_id IS NOT DISTINCT FROM $2
      AND block_type <> 'COLUMN'
    ORDER BY position ASC, created_at ASC
    `,
    [stepId, parentBlockId]
  );

  return result.rows;
}

async function deleteBlock(blockId) {
  const result = await pool.query(
    `
    DELETE FROM step_blocks
    WHERE id = $1
    RETURNING id, step_id, position
    `,
    [blockId]
  );

  return result.rows[0];
}

async function compactPositions(
  stepId,
  parentBlockId = null,
  client = pool
) {
  await client.query(
    `
    WITH ordered_blocks AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY position ASC, created_at ASC
        ) AS new_position
      FROM step_blocks
      WHERE step_id = $1
        AND parent_block_id IS NOT DISTINCT FROM $2
    )
    UPDATE step_blocks AS block
    SET
      position = -ordered_blocks.new_position,
      updated_at = NOW()
    FROM ordered_blocks
    WHERE block.id = ordered_blocks.id
    `,
    [stepId, parentBlockId]
  );

  await client.query(
    `
    UPDATE step_blocks
    SET
      position = ABS(position),
      updated_at = NOW()
    WHERE step_id = $1
      AND parent_block_id IS NOT DISTINCT FROM $2
      AND position < 0
    `,
    [stepId, parentBlockId]
  );
}

async function reorderBlocks(
  stepId,
  parentBlockId,
  orderedBlockIds
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (
      let index = 0;
      index < orderedBlockIds.length;
      index += 1
    ) {
      const result = await client.query(
        `
        UPDATE step_blocks
        SET position = $1
        WHERE id = $2
          AND step_id = $3
          AND parent_block_id IS NOT DISTINCT FROM $4
          AND block_type <> 'COLUMN'
        `,
        [
          -(index + 1),
          orderedBlockIds[index],
          stepId,
          parentBlockId,
        ]
      );

      if (result.rowCount !== 1) {
        const error = new Error(
          "One or more Blocks do not belong to this group"
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (
      let index = 0;
      index < orderedBlockIds.length;
      index += 1
    ) {
      await client.query(
        `
        UPDATE step_blocks
        SET
          position = $1,
          updated_at = NOW()
        WHERE id = $2
          AND step_id = $3
          AND parent_block_id IS NOT DISTINCT FROM $4
          AND block_type <> 'COLUMN'
        `,
        [
          index + 1,
          orderedBlockIds[index],
          stepId,
          parentBlockId,
        ]
      );
    }

    await client.query("COMMIT");

    return findBlocksByParent(
      stepId,
      parentBlockId
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateBlockAsset(
  blockId,
  {
    url,
    objectKey,
    name,
    mimeType,
    size,
  }
) {
  const result = await pool.query(
    `
    UPDATE step_blocks
    SET
      content = content || jsonb_build_object(
        'url', $1::text,
        'objectKey', $2::text,
        'name', $3::text,
        'mimeType', $4::text,
        'size', $5::bigint
      ),
      updated_at = NOW()
    WHERE id = $6
    RETURNING *
    `,
    [
      url,
      objectKey,
      name,
      mimeType,
      size,
      blockId,
    ]
  );

  return result.rows[0];
}

async function removeBlockAsset(blockId) {
  const result = await pool.query(
    `
    UPDATE step_blocks
    SET
      content =
        content
        - 'url'
        - 'objectKey'
        - 'name'
        - 'mimeType'
        - 'size',
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [blockId]
  );

  return result.rows[0];
}

async function findBlockInStep(blockId, stepId) {
  const result = await pool.query(
    `
    SELECT *
    FROM step_blocks
    WHERE id = $1
      AND step_id = $2
    `,
    [blockId, stepId]
  );

  return result.rows[0];
}

module.exports = {
  createBlock,
  findBlocksByStepId,
  findBlockInStep,
  findBlockById,
  findBlocksByParent,
  getNextPosition,
  updateBlock,
  deleteBlock,
  compactPositions,
  reorderBlocks,
  updateBlockAsset,
  removeBlockAsset,
};