const pool = require("../config/db");

async function findActiveEnrollment(userId, journeyId, client = pool) {
  const result = await client.query(
    `
    SELECT enrollment.*
    FROM journey_enrollments AS enrollment
    WHERE enrollment.learner_user_id = $1
      AND enrollment.learning_journey_id = $2
      AND enrollment.status = 'ACTIVE'
    LIMIT 1
    `,
    [userId, journeyId]
  );

  return result.rows[0] || null;
}

async function findEnrollments(userId) {
  const result = await pool.query(
    `
    SELECT
      enrollment.id AS enrollment_id,
      enrollment.learning_journey_id,
      enrollment.status,
      enrollment.updated_at,
      journey.title,
      journey.description,
      COALESCE(journey.cover_url, journey.thumbnail_url) AS cover_image_url,
      educator.first_name AS educator_first_name,
      educator.last_name AS educator_last_name,
      educator.id AS educator_id, educator.avatar_url AS educator_avatar_url,
      educator_profile.slug AS educator_slug
    FROM journey_enrollments AS enrollment
    INNER JOIN learning_journeys AS journey
      ON journey.id = enrollment.learning_journey_id
    INNER JOIN users AS educator
      ON educator.id = journey.owner_user_id
    LEFT JOIN educator_profiles AS educator_profile
      ON educator_profile.educator_user_id=educator.id AND educator_profile.is_published=TRUE
    WHERE enrollment.learner_user_id = $1
      AND enrollment.status IN ('ACTIVE', 'COMPLETED')
      AND journey.status <> 'ARCHIVED'
    ORDER BY enrollment.updated_at DESC, enrollment.enrolled_at DESC
    `,
    [userId]
  );

  return result.rows;
}

async function findJourney(userId, journeyId) {
  const result = await pool.query(
    `
    SELECT
      journey.id,
      journey.title,
      journey.description,
      COALESCE(journey.cover_url, journey.thumbnail_url) AS cover_image_url,
      CONCAT_WS(' ', educator.first_name, educator.last_name) AS educator_name,
      educator.id AS educator_id, educator.avatar_url AS educator_avatar_url,
      educator_profile.slug AS educator_slug,
      enrollment.id AS enrollment_id
    FROM learning_journeys AS journey
    INNER JOIN users AS educator
      ON educator.id = journey.owner_user_id
    LEFT JOIN educator_profiles AS educator_profile
      ON educator_profile.educator_user_id=educator.id AND educator_profile.is_published=TRUE
    INNER JOIN journey_enrollments AS enrollment
      ON enrollment.learning_journey_id = journey.id
      AND enrollment.learner_user_id = $1
      AND enrollment.status = 'ACTIVE'
    WHERE journey.id = $2
      AND journey.status <> 'ARCHIVED'
    LIMIT 1
    `,
    [userId, journeyId]
  );

  return result.rows[0] || null;
}

async function findJourneyStructure(enrollmentId, journeyId) {
  const result = await pool.query(
    `
    SELECT
      stage.id AS stage_id,
      stage.title AS stage_title,
      stage.description AS stage_description,
      stage.position AS stage_position,
      stage.parent_stage_id,
      step.id AS step_id,
      step.title AS step_title,
      step.description AS step_description,
      step.position AS step_position,
      step.estimated_minutes,
      step.visual_type,
      step.icon,
      step.emoji,
      step.image_url,
      step.color,
      path_item.position AS path_position,
      COALESCE(path_item.is_required, TRUE) AS path_is_required,
      COALESCE(path_item.unlock_rule, 'PREVIOUS_REQUIRED') AS path_unlock_rule,
      path_item.reason AS path_reason,
      CASE WHEN path_item.id IS NOT NULL
        THEN active_path.id ELSE NULL END AS learning_path_id,
      CASE WHEN path_item.id IS NOT NULL
        THEN active_path.title ELSE NULL END AS learning_path_title,
      CASE WHEN path_item.id IS NOT NULL
        THEN active_path.settings ELSE NULL END AS learning_path_settings,
      COALESCE(progress.status, 'NOT_STARTED') AS progress_status
    FROM stages AS stage
    LEFT JOIN learning_paths AS active_path
      ON active_path.enrollment_id = $1
      AND active_path.status = 'ACTIVE'
    LEFT JOIN steps AS step
      ON step.stage_id = stage.id
      AND step.status = 'PUBLISHED'
    LEFT JOIN learning_path_items AS path_item
      ON path_item.learning_path_id = active_path.id
      AND path_item.step_id = step.id
    LEFT JOIN step_progress AS progress
      ON progress.step_id = step.id
      AND progress.enrollment_id = $1
    WHERE stage.learning_journey_id = $2
    ORDER BY
      stage.parent_stage_id NULLS FIRST,
      stage.position ASC,
      step.position ASC
    `,
    [enrollmentId, journeyId]
  );

  return result.rows;
}

async function findStep(stepId, journeyId) {
  const result = await pool.query(
    `
    SELECT
      step.*,
      stage.learning_journey_id,
      stage.title AS stage_title
    FROM steps AS step
    INNER JOIN stages AS stage
      ON stage.id = step.stage_id
    WHERE step.id = $1
      AND ($2::uuid IS NULL OR stage.learning_journey_id = $2)
      AND step.status = 'PUBLISHED'
    LIMIT 1
    `,
    [stepId, journeyId || null]
  );

  return result.rows[0] || null;
}

async function findStepBlocks(stepId, enrollmentId = null) {
  const result = await pool.query(
    `
    SELECT block.id, block.parent_block_id, block.block_type, block.position,
      CASE WHEN block.block_type='CHALLENGE' THEN
        block.content || jsonb_build_object(
          'title',challenge.title,
          'description',challenge.description,
          'status',challenge.status,
          'progressStatus',COALESCE(progress.status,'NOT_STARTED'),
          'bestPercentage',progress.best_percentage
        )
      ELSE block.content END AS content,
      block.settings
    FROM step_blocks block
    LEFT JOIN challenges challenge
      ON block.block_type='CHALLENGE'
     AND challenge.id=NULLIF(block.content->>'challengeId','')::uuid
    LEFT JOIN learner_challenge_progress progress
      ON progress.challenge_id=challenge.id
     AND progress.enrollment_id=$2::uuid
    WHERE block.step_id = $1
    ORDER BY block.parent_block_id NULLS FIRST, block.position ASC, block.created_at ASC
    `,
    [stepId, enrollmentId]
  );

  return result.rows;
}

async function countIncompleteChallengeBlocks(
  enrollmentId,
  stepId,
  client = pool
) {
  const result = await client.query(
    `SELECT COUNT(*)::integer AS incomplete_count
     FROM step_blocks block
     JOIN challenges challenge
       ON challenge.id=NULLIF(block.content->>'challengeId','')::uuid
      AND challenge.status='PUBLISHED'
     LEFT JOIN learner_challenge_progress progress
       ON progress.challenge_id=challenge.id
      AND progress.enrollment_id=$1
     WHERE block.step_id=$2
       AND block.block_type='CHALLENGE'
       AND COALESCE((block.settings->>'required')::boolean,TRUE)=TRUE
       AND (
         CASE
           WHEN COALESCE(block.settings->>'completionRule','SUBMITTED')='PASSED'
             THEN COALESCE(progress.status,'NOT_STARTED')<>'PASSED'
           ELSE COALESCE(progress.attempt_count,0)=0
         END
       )`,
    [enrollmentId, stepId]
  );
  return result.rows[0].incomplete_count;
}

async function findStepChallenges(stepId, journeyId) {
  const result = await pool.query(
    `
    SELECT
      challenge.id,
      challenge.title,
      challenge.description,
      challenge.instructions,
      challenge.settings,
      challenge.max_attempts,
      challenge.max_score
    FROM challenge_steps AS relation
    INNER JOIN challenges AS challenge
      ON challenge.id = relation.challenge_id
    WHERE relation.step_id = $1
      AND challenge.learning_journey_id = $2
      AND challenge.status = 'PUBLISHED'
    ORDER BY challenge.created_at ASC
    `,
    [stepId, journeyId]
  );

  return result.rows;
}

async function upsertStepProgress(
  enrollmentId,
  stepId,
  status,
  client = pool
) {
  const percentage = status === "COMPLETED" ? 100 : 0;
  const result = await client.query(
    `
    INSERT INTO step_progress (
      enrollment_id,
      step_id,
      status,
      progress_percentage,
      started_at,
      completed_at,
      last_accessed_at
    )
    VALUES (
      $1::uuid,
      $2::uuid,
      $3::varchar,
      $4::numeric,
      CASE
        WHEN $3::varchar IN ('IN_PROGRESS', 'COMPLETED')
          THEN NOW()
      END,
      CASE
        WHEN $3::varchar = 'COMPLETED'
          THEN NOW()
      END,
      NOW()
    )
    ON CONFLICT (enrollment_id, step_id)
    DO UPDATE SET
      status = CASE
        WHEN step_progress.status = 'COMPLETED' THEN 'COMPLETED'
        ELSE EXCLUDED.status
      END,
      progress_percentage = CASE
        WHEN step_progress.status = 'COMPLETED' THEN 100
        ELSE EXCLUDED.progress_percentage
      END,
      started_at = COALESCE(step_progress.started_at, EXCLUDED.started_at),
      completed_at = CASE
        WHEN step_progress.status = 'COMPLETED'
          THEN step_progress.completed_at
        ELSE EXCLUDED.completed_at
      END,
      last_accessed_at = NOW()
    RETURNING *
    `,
    [enrollmentId, stepId, status, percentage]
  );

  return result.rows[0];
}

async function findChallengeAccess(userId, challengeId, client = pool) {
  const result = await client.query(
    `
    SELECT
      challenge.id,
      challenge.learning_journey_id,
      challenge.max_attempts,
      enrollment.id AS enrollment_id
    FROM challenges AS challenge
    INNER JOIN journey_enrollments AS enrollment
      ON enrollment.learning_journey_id = challenge.learning_journey_id
      AND enrollment.learner_user_id = $1
      AND enrollment.status = 'ACTIVE'
    WHERE challenge.id = $2
      AND challenge.status = 'PUBLISHED'
    LIMIT 1
    `,
    [userId, challengeId]
  );

  return result.rows[0] || null;
}

async function countIncompleteRequiredChallenges(
  enrollmentId,
  stepId,
  client = pool
) {
  const result = await client.query(
    `
    SELECT COUNT(*)::integer AS incomplete_count
    FROM challenge_steps AS relation
    INNER JOIN challenges AS challenge
      ON challenge.id = relation.challenge_id
      AND challenge.status = 'PUBLISHED'
    LEFT JOIN learner_challenge_progress AS progress
      ON progress.challenge_id = challenge.id
      AND progress.enrollment_id = $1
    WHERE relation.step_id = $2
      AND relation.is_required_for_step = TRUE
      AND COALESCE(progress.status, 'NOT_STARTED') <> 'PASSED'
    `,
    [enrollmentId, stepId]
  );

  return result.rows[0].incomplete_count;
}

async function findExerciseBlockAccess(userId, blockId) {
  const result = await pool.query(
    `
    SELECT
      block.id,
      block.block_type,
      block.content,
      block.settings
    FROM step_blocks AS block
    INNER JOIN steps AS step
      ON step.id = block.step_id
      AND step.status = 'PUBLISHED'
    INNER JOIN stages AS stage
      ON stage.id = step.stage_id
    INNER JOIN journey_enrollments AS enrollment
      ON enrollment.learning_journey_id = stage.learning_journey_id
      AND enrollment.learner_user_id = $1
      AND enrollment.status = 'ACTIVE'
    WHERE block.id = $2
    LIMIT 1
    `,
    [userId, blockId]
  );

  return result.rows[0] || null;
}

async function createChallengeAttempt(userId, challengeId, answer) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const access = await findChallengeAccess(userId, challengeId, client);

    if (!access) {
      const error = new Error("Challenge not found or not available");
      error.statusCode = 403;
      throw error;
    }

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`${challengeId}:${access.enrollment_id}`]
    );

    const countResult = await client.query(
      `
      SELECT COUNT(*)::integer AS attempt_count
      FROM challenge_attempts
      WHERE challenge_id = $1
        AND enrollment_id = $2
      `,
      [challengeId, access.enrollment_id]
    );

    const attemptNumber = countResult.rows[0].attempt_count + 1;

    if (
      access.max_attempts !== null &&
      attemptNumber > access.max_attempts
    ) {
      const error = new Error("Maximum Challenge attempts reached");
      error.statusCode = 409;
      throw error;
    }

    const result = await client.query(
      `
      INSERT INTO challenge_attempts (
        challenge_id,
        enrollment_id,
        attempt_number,
        answers,
        status,
        submitted_at
      )
      VALUES ($1, $2, $3, $4::jsonb, 'SUBMITTED', NOW())
      RETURNING
        id,
        challenge_id,
        attempt_number,
        answers,
        status,
        score,
        feedback,
        submitted_at
      `,
      [
        challengeId,
        access.enrollment_id,
        attemptNumber,
        JSON.stringify(answer || {}),
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findChallengeAttempts(userId, challengeId) {
  const access = await findChallengeAccess(userId, challengeId);

  if (!access) {
    const error = new Error("Challenge not found or not available");
    error.statusCode = 403;
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      id,
      challenge_id,
      attempt_number,
      answers,
      status,
      score,
      feedback,
      submitted_at,
      graded_at
    FROM challenge_attempts
    WHERE challenge_id = $1
      AND enrollment_id = $2
    ORDER BY attempt_number DESC
    `,
    [challengeId, access.enrollment_id]
  );

  return result.rows;
}

async function updateLearningPathGoal(userId, journeyId, goal) {
  const result = await pool.query(
    `UPDATE learning_paths path
     SET settings = jsonb_set(
           COALESCE(path.settings, '{}'::jsonb),
           '{learnerGoal}',
           to_jsonb($3::text),
           TRUE
         ),
         updated_at = NOW()
     FROM journey_enrollments enrollment
     WHERE path.enrollment_id = enrollment.id
       AND path.status = 'ACTIVE'
       AND enrollment.learning_journey_id = $2
       AND enrollment.learner_user_id = $1
       AND enrollment.status = 'ACTIVE'
     RETURNING path.id, path.settings`,
    [userId, journeyId, goal]
  );
  return result.rows[0] || null;
}

module.exports = {
  findActiveEnrollment,
  findEnrollments,
  findJourney,
  findJourneyStructure,
  findStep,
  findStepBlocks,
  findStepChallenges,
  findExerciseBlockAccess,
  upsertStepProgress,
  createChallengeAttempt,
  findChallengeAttempts,
  countIncompleteRequiredChallenges,
  countIncompleteChallengeBlocks,
  updateLearningPathGoal,
};
