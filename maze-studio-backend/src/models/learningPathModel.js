const pool = require("../config/db");

async function findEnrollmentContext(enrollmentId, client = pool) {
  const result = await client.query(
    `SELECT enrollment.id, enrollment.learning_journey_id,
            enrollment.status, journey.owner_user_id,
            profile.first_name, profile.last_name,
            profile.contact_email AS email
     FROM journey_enrollments enrollment
     JOIN learning_journeys journey
       ON journey.id = enrollment.learning_journey_id
     JOIN learner_profiles profile
       ON profile.id = enrollment.learner_profile_id
     WHERE enrollment.id = $1
     LIMIT 1`,
    [enrollmentId]
  );
  return result.rows[0] || null;
}

async function findJourneySteps(journeyId, client = pool) {
  const result = await client.query(
    `SELECT step.id, step.title, step.description, step.position,
            step.status, stage.id AS stage_id, stage.title AS stage_title,
            stage.position AS stage_position
     FROM steps step
     JOIN stages stage ON stage.id = step.stage_id
     WHERE stage.learning_journey_id = $1
       AND step.status <> 'ARCHIVED'
     ORDER BY stage.position, step.position`,
    [journeyId]
  );
  return result.rows;
}

async function findCurrentPath(enrollmentId) {
  const result = await pool.query(
    `SELECT path.*, creator.first_name AS creator_first_name,
            creator.last_name AS creator_last_name
     FROM learning_paths path
     JOIN users creator ON creator.id = path.created_by_user_id
     WHERE path.enrollment_id = $1
       AND path.status <> 'ARCHIVED'
     ORDER BY (path.status = 'ACTIVE') DESC, path.version DESC
     LIMIT 1`,
    [enrollmentId]
  );
  const path = result.rows[0];
  if (!path) return null;

  const items = await pool.query(
    `SELECT item.*, step.title, step.description,
            stage.id AS stage_id, stage.title AS stage_title
     FROM learning_path_items item
     JOIN steps step ON step.id = item.step_id
     JOIN stages stage ON stage.id = step.stage_id
     WHERE item.learning_path_id = $1
     ORDER BY item.position`,
    [path.id]
  );
  return { ...path, items: items.rows };
}

async function savePath({
  enrollmentId,
  educatorUserId,
  title,
  status,
  source,
  items,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1::text))",
      [enrollmentId]
    );
    const existing = await client.query(
      `SELECT id, version FROM learning_paths
       WHERE enrollment_id = $1 AND status <> 'ARCHIVED'
       ORDER BY (status = 'ACTIVE') DESC, version DESC
       LIMIT 1 FOR UPDATE`,
      [enrollmentId]
    );

    let path;
    if (existing.rows[0]) {
      const updated = await client.query(
        `UPDATE learning_paths
         SET title = $2::varchar, status = $3::varchar, source = $4::varchar,
             activated_at = CASE WHEN $3::varchar = 'ACTIVE'
               THEN COALESCE(activated_at, NOW()) ELSE NULL END,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id, title, status, source]
      );
      path = updated.rows[0];
      await client.query(
        "DELETE FROM learning_path_items WHERE learning_path_id = $1",
        [path.id]
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO learning_paths
          (enrollment_id, title, status, source, version,
           created_by_user_id, activated_at)
         VALUES ($1,$2::varchar,$3::varchar,$4::varchar,
           COALESCE((
             SELECT MAX(previous.version) + 1
             FROM learning_paths previous
             WHERE previous.enrollment_id = $1
           ), 1),
           $5,
           CASE WHEN $3::varchar = 'ACTIVE' THEN NOW() ELSE NULL END)
         RETURNING *`,
        [enrollmentId, title, status, source, educatorUserId]
      );
      path = inserted.rows[0];
    }

    for (const [index, item] of items.entries()) {
      await client.query(
        `INSERT INTO learning_path_items
          (learning_path_id, step_id, position, is_required,
           unlock_rule, reason, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          path.id,
          item.stepId,
          index + 1,
          item.isRequired !== false,
          item.unlockRule || "PREVIOUS_REQUIRED",
          item.reason || null,
          source,
        ]
      );
    }
    await client.query("COMMIT");
    return path;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function archivePath(enrollmentId) {
  const result = await pool.query(
    `UPDATE learning_paths SET status='ARCHIVED', updated_at=NOW()
     WHERE enrollment_id=$1 AND status <> 'ARCHIVED'
     RETURNING id`,
    [enrollmentId]
  );
  return result.rows[0] || null;
}

module.exports = {
  findEnrollmentContext,
  findJourneySteps,
  findCurrentPath,
  savePath,
  archivePath,
};
