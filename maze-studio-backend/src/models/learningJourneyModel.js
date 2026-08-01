const pool = require("../config/db");

async function createJourney({
  ownerUserId,
  title,
  slug,
  description,
  coverUrl,
  visibility,
  status,
  enrollmentMode,
  estimatedMinutes,
  difficulty,
  language,
}) {
  const result = await pool.query(
    `
INSERT INTO learning_journeys (
  owner_user_id,
  title,
  slug,
  description,
  cover_url,
  visibility,
  status,
  enrollment_mode,
  estimated_minutes,
  difficulty,
  language
)
VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9, $10, $11
)
RETURNING *
    `,
    [
  ownerUserId,
  title,
  slug,
  description,
  coverUrl,
  visibility,
  status,
  enrollmentMode,
  estimatedMinutes,
  difficulty,
  language,
]
  );

  return result.rows[0];
}



async function findJourneysByOwner(ownerUserId) {
  const result = await pool.query(
    `
    SELECT journey.*,
      CASE WHEN journey.owner_user_id=$1 THEN 'OWNER' ELSE collaborator.role END AS access_role
    FROM learning_journeys journey
    LEFT JOIN learning_journey_collaborators collaborator
      ON collaborator.learning_journey_id=journey.id
     AND collaborator.user_id=$1 AND collaborator.status='ACTIVE'
    WHERE (journey.owner_user_id=$1 OR collaborator.id IS NOT NULL)
      AND journey.status <> 'ARCHIVED'
    ORDER BY journey.updated_at DESC
    `,
    [ownerUserId]
  );

  return result.rows;
}

async function findJourneyById(id) {
  const result = await pool.query(
    `
    SELECT *
    FROM learning_journeys
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
}

async function updateJourney(id, ownerUserId, data = {}) {
  const {
    title,
    slug,
    description,
    coverUrl,
    visibility,
    status,
    enrollmentMode,
    estimatedMinutes,
    difficulty,
    language,
    visualType,
    icon,
    emoji,
  } = data;

  const result = await pool.query(
    `
    UPDATE learning_journeys
    SET
      title = COALESCE($1, title),
      slug = COALESCE($2, slug),
      description = COALESCE($3, description),
      cover_url = COALESCE($4, cover_url),
      visibility = COALESCE($5, visibility),
      status = COALESCE($6, status),
      enrollment_mode = COALESCE($7, enrollment_mode),
      estimated_minutes = COALESCE($8, estimated_minutes),
      difficulty = COALESCE($9, difficulty),
      language = COALESCE($10, language),

      visual_type = COALESCE($11, visual_type),
      icon = COALESCE($12, icon),
      emoji = COALESCE($13, emoji),

      published_at = CASE
        WHEN $6 = 'PUBLISHED' AND published_at IS NULL
        THEN NOW()
        ELSE published_at
      END,

      updated_at = NOW()

    WHERE id = $14
      AND status <> 'ARCHIVED'

    RETURNING *
    `,
    [
      title,
      slug,
      description,
      coverUrl,
      visibility,
      status,
      enrollmentMode,
      estimatedMinutes,
      difficulty,
      language,
      visualType,
      icon,
      emoji,
      id,
    ]
  );

  return result.rows[0];
}

async function archiveJourney(id, ownerUserId) {
  const result = await pool.query(
    `
    UPDATE learning_journeys
    SET
      status = 'ARCHIVED',
      archived_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
      AND owner_user_id = $2
      AND status <> 'ARCHIVED'
    RETURNING id, status, archived_at
    `,
    [id]
  );

  return result.rows[0];
}

async function findJourneyBuilderById(journeyId) {
  const client = await pool.connect();

  try {
    const journeyResult = await client.query(
      `
      SELECT *
      FROM learning_journeys
      WHERE id = $1
        AND status <> 'ARCHIVED'
      `,
      [journeyId]
    );

    const journey = journeyResult.rows[0];

    if (!journey) {
      return null;
    }

    const stagesResult = await client.query(
      `
      SELECT *
      FROM stages
      WHERE learning_journey_id = $1
      ORDER BY
        parent_stage_id NULLS FIRST,
        position ASC,
        created_at ASC
      `,
      [journeyId]
    );

    const stepsResult = await client.query(
      `
      SELECT
        st.*
      FROM steps st
      INNER JOIN stages s
        ON s.id = st.stage_id
      WHERE s.learning_journey_id = $1
      ORDER BY
        st.stage_id,
        st.position ASC,
        st.created_at ASC
      `,
      [journeyId]
    );

    return {
      journey,
      stages: stagesResult.rows,
      steps: stepsResult.rows,
    };
  } finally {
    client.release();
  }
}

async function updateJourneyCover(
  journeyId,
  ownerUserId,
  {
    coverUrl,
    coverObjectKey,
  }
) {
  const result = await pool.query(
    `
    UPDATE learning_journeys
    SET
      cover_url = $1,
      cover_object_key = $2,
      updated_at = NOW()
    WHERE id = $3
      AND status <> 'ARCHIVED'
    RETURNING *
    `,
    [
      coverUrl,
      coverObjectKey,
      journeyId,
    ]
  );

  return result.rows[0];
}

async function removeJourneyCover(
  journeyId,
  ownerUserId
) {
  const result = await pool.query(
    `
    UPDATE learning_journeys
    SET
      cover_url = NULL,
      cover_object_key = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND status <> 'ARCHIVED'
    RETURNING *
    `,
    [journeyId]
  );

  return result.rows[0];
}

module.exports = {
  createJourney,
  updateJourneyCover,
  removeJourneyCover,
  findJourneysByOwner,
  findJourneyById,
  findJourneyBuilderById,
  updateJourney,
  archiveJourney,
};
