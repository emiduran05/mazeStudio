const pool = require("../config/db");

async function createStep({
  stageId,
  title,
  description,
  position,
  status,
  estimatedMinutes,
  isPreview,
  icon,
  color,
}) {
  const result = await pool.query(
    `
    INSERT INTO steps (
      stage_id,
      title,
      description,
      position,
      status,
      estimated_minutes,
      is_preview,
      icon,
      color
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      stageId,
      title,
      description,
      position,
      status,
      estimatedMinutes,
      isPreview,
      icon,
      color,
    ]
  );

  return result.rows[0];
}

async function findStepsByStageId(stageId) {
  const result = await pool.query(
    `
    SELECT *
    FROM steps
    WHERE stage_id = $1
    ORDER BY position ASC
    `,
    [stageId]
  );

  return result.rows;
}

async function findStepById(stepId) {
  const result = await pool.query(
    `
    SELECT
      st.*,
      s.learning_journey_id,
      lj.owner_user_id,
      lj.status AS journey_status
    FROM steps st
    INNER JOIN stages s
      ON s.id = st.stage_id
    INNER JOIN learning_journeys lj
      ON lj.id = s.learning_journey_id
    WHERE st.id = $1
    `,
    [stepId]
  );

  return result.rows[0];
}

async function getNextPosition(stageId) {
  const result = await pool.query(
    `
    SELECT COALESCE(MAX(position), 0) + 1 AS next_position
    FROM steps
    WHERE stage_id = $1
    `,
    [stageId]
  );

  return Number(result.rows[0].next_position);
}

async function updateStep(stepId, data = {}) {
  const {
    title,
    description,
    status,
    estimatedMinutes,
    isPreview,
    icon,
    color,
  } = data;

  const result = await pool.query(
    `
    UPDATE steps
    SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      status = COALESCE($3, status),
      estimated_minutes = COALESCE($4, estimated_minutes),
      is_preview = COALESCE($5, is_preview),
      icon = COALESCE($6, icon),
      color = COALESCE($7, color),
      updated_at = NOW()
    WHERE id = $8
    RETURNING *
    `,
    [
      title,
      description,
      status,
      estimatedMinutes,
      isPreview,
      icon,
      color,
      stepId,
    ]
  );

  return result.rows[0];
}

async function moveStep(stepId,targetStageId){
  const client=await pool.connect();
  try{await client.query("BEGIN");const current=(await client.query("SELECT stage_id FROM steps WHERE id=$1 FOR UPDATE",[stepId])).rows[0];if(!current)throw new Error("Step not found");if(current.stage_id===targetStageId){await client.query("COMMIT");return(await pool.query("SELECT * FROM steps WHERE id=$1",[stepId])).rows[0]}const position=Number((await client.query("SELECT COALESCE(MAX(position),0)+1 next_position FROM steps WHERE stage_id=$1",[targetStageId])).rows[0].next_position);const moved=(await client.query("UPDATE steps SET stage_id=$1,position=$2,updated_at=NOW() WHERE id=$3 RETURNING *",[targetStageId,position,stepId])).rows[0];await client.query(`WITH ordered AS(SELECT id,ROW_NUMBER() OVER(ORDER BY position,created_at) position FROM steps WHERE stage_id=$1) UPDATE steps SET position=ordered.position FROM ordered WHERE steps.id=ordered.id`,[current.stage_id]);await client.query("COMMIT");return moved}catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

async function deleteStep(stepId) {
  const result = await pool.query(
    `
    DELETE FROM steps
    WHERE id = $1
    RETURNING id, stage_id, position
    `,
    [stepId]
  );

  return result.rows[0];
}

async function compactPositions(stageId) {
  await pool.query(
    `
    WITH ordered_steps AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY position ASC, created_at ASC
        ) AS new_position
      FROM steps
      WHERE stage_id = $1
    )
    UPDATE steps
    SET
      position = ordered_steps.new_position,
      updated_at = NOW()
    FROM ordered_steps
    WHERE steps.id = ordered_steps.id
    `,
    [stageId]
  );
}

async function reorderSteps(stageId, orderedStepIds) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (let index = 0; index < orderedStepIds.length; index += 1) {
      const result = await client.query(
        `
        UPDATE steps
        SET position = $1
        WHERE id = $2
          AND stage_id = $3
        `,
        [
          -(index + 1),
          orderedStepIds[index],
          stageId,
        ]
      );

      if (result.rowCount !== 1) {
        const error = new Error(
          "One or more Steps do not belong to this Stage"
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (let index = 0; index < orderedStepIds.length; index += 1) {
      await client.query(
        `
        UPDATE steps
        SET
          position = $1,
          updated_at = NOW()
        WHERE id = $2
          AND stage_id = $3
        `,
        [
          index + 1,
          orderedStepIds[index],
          stageId,
        ]
      );
    }

    await client.query("COMMIT");

    const result = await pool.query(
      `
      SELECT *
      FROM steps
      WHERE stage_id = $1
      ORDER BY position ASC
      `,
      [stageId]
    );

    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateStepImage(
  stepId,
  {
    imageUrl,
    imageObjectKey,
  }
) {
  const result = await pool.query(
    `
    UPDATE steps
    SET
      visual_type = 'IMAGE',
      image_url = $1,
      image_object_key = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [
      imageUrl,
      imageObjectKey,
      stepId,
    ]
  );

  return result.rows[0];
}

async function removeStepImage(stepId) {
  const result = await pool.query(
    `
    UPDATE steps
    SET
      image_url = NULL,
      image_object_key = NULL,
      visual_type = 'ICON',
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [stepId]
  );

  return result.rows[0];
}

module.exports = {
  createStep,
  findStepsByStageId,
  findStepById,
  getNextPosition,
  updateStep,
  moveStep,
  deleteStep,
  compactPositions,
  reorderSteps,
  updateStepImage,
  removeStepImage
};
