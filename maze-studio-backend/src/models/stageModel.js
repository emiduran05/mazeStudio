const pool = require("../config/db");

async function createStage({
  learningJourneyId,
  parentStageId,
  title,
  description,
  position,
}) {
  const result = await pool.query(
    `
    INSERT INTO stages (
      learning_journey_id,
      parent_stage_id,
      title,
      description,
      position
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      learningJourneyId,
      parentStageId,
      title,
      description,
      position,
    ]
  );

  return result.rows[0];
}
async function findStagesByJourneyId(learningJourneyId) {
  const result = await pool.query(
    `
    SELECT *
    FROM stages
    WHERE learning_journey_id = $1
    ORDER BY
      parent_stage_id NULLS FIRST,
      position ASC
    `,
    [learningJourneyId]
  );

  return result.rows;
}

async function findStageById(stageId) {
  const result = await pool.query(
    `
SELECT
  s.*,
  lj.owner_user_id,
  lj.status AS journey_status
FROM stages s
INNER JOIN learning_journeys lj
  ON lj.id = s.learning_journey_id
WHERE s.id = $1
    `,
    [stageId]
  );

  return result.rows[0];
}

async function getNextPosition(
  learningJourneyId,
  parentStageId = null
) {
  const result = await pool.query(
    `
    SELECT COALESCE(MAX(position), 0) + 1 AS next_position
    FROM stages
    WHERE learning_journey_id = $1
      AND parent_stage_id IS NOT DISTINCT FROM $2
    `,
    [learningJourneyId, parentStageId]
  );

  return Number(result.rows[0].next_position);
}

async function updateStage(stageId, data = {}) {
  const {
    title,
    description,
  } = data;

  const result = await pool.query(
    `
    UPDATE stages
    SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [
      title,
      description,
      stageId,
    ]
  );

  return result.rows[0];
}

async function deleteStage(stageId) {
  const result = await pool.query(
    `
    DELETE FROM stages
    WHERE id = $1
    RETURNING id, learning_journey_id, position
    `,
    [stageId]
  );

  return result.rows[0];
}

async function compactPositions(learningJourneyId) {
  await pool.query(
    `
    WITH ordered_stages AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY position ASC, created_at ASC
        ) AS new_position
      FROM stages
      WHERE learning_journey_id = $1
    )
    UPDATE stages
    SET
      position = ordered_stages.new_position,
      updated_at = NOW()
    FROM ordered_stages
    WHERE stages.id = ordered_stages.id
    `,
    [learningJourneyId]
  );
}

async function reorderStages(
  learningJourneyId,
  parentStageId,
  orderedStageIds
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
      Posiciones temporales negativas para evitar conflictos
      con los índices UNIQUE entre hermanos.
    */
    for (let index = 0; index < orderedStageIds.length; index += 1) {
      const result = await client.query(
        `
        UPDATE stages
        SET position = $1
        WHERE id = $2
          AND learning_journey_id = $3
          AND parent_stage_id IS NOT DISTINCT FROM $4
        `,
        [
          -(index + 1),
          orderedStageIds[index],
          learningJourneyId,
          parentStageId,
        ]
      );

      if (result.rowCount !== 1) {
        const error = new Error(
          "One or more Stages do not belong to the specified parent"
        );
        error.statusCode = 400;
        throw error;
      }
    }

    for (let index = 0; index < orderedStageIds.length; index += 1) {
      await client.query(
        `
        UPDATE stages
        SET
          position = $1,
          updated_at = NOW()
        WHERE id = $2
          AND learning_journey_id = $3
          AND parent_stage_id IS NOT DISTINCT FROM $4
        `,
        [
          index + 1,
          orderedStageIds[index],
          learningJourneyId,
          parentStageId,
        ]
      );
    }

    await client.query("COMMIT");

    const result = await pool.query(
      `
      SELECT *
      FROM stages
      WHERE learning_journey_id = $1
        AND parent_stage_id IS NOT DISTINCT FROM $2
      ORDER BY position ASC
      `,
      [learningJourneyId, parentStageId]
    );

    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findStageInJourney(stageId, learningJourneyId) {
  const result = await pool.query(
    `
    SELECT *
    FROM stages
    WHERE id = $1
      AND learning_journey_id = $2
    `,
    [stageId, learningJourneyId]
  );

  return result.rows[0];
}

async function findSiblingStages(
  learningJourneyId,
  parentStageId = null
) {
  const result = await pool.query(
    `
    SELECT *
    FROM stages
    WHERE learning_journey_id = $1
      AND parent_stage_id IS NOT DISTINCT FROM $2
    ORDER BY position ASC
    `,
    [learningJourneyId, parentStageId]
  );

  return result.rows;
}

module.exports = {
  createStage,
  findStagesByJourneyId,
  findStageById,
  findStageInJourney,
  findSiblingStages,
  getNextPosition,
  updateStage,
  deleteStage,
  compactPositions,
  reorderStages,
};