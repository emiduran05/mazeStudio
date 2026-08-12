const pool = require("../config/db");
const { gradeAnswers } = require("./gradingService");
const { createToken, hashToken, safeEqualHash } = require("./privateTokenService");
const storageService = require("./storageService");
const notificationService = require("./notificationService");

const QUESTION_BLOCK_TYPES = new Set([
  "SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK",
  "SHORT_ANSWER", "LONG_ANSWER", "FILE_UPLOAD", "SPEAKING",
]);
const CONTENT_BLOCK_TYPES = new Set([
  "HEADING", "TEXT", "IMAGE", "VIDEO", "AUDIO", "EQUATION", "WHITEBOARD", "CODE", "QUOTE", "CALLOUT",
  "DIVIDER", "TABLE", "FILE", "PDF",
]);

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const json = (value, fallback) => JSON.stringify(value ?? fallback);
const instructionJson = (value) =>
  json(
    typeof value === "object" && value !== null
      ? value
      : { text: String(value ?? "") },
    { text: "" }
  );
const instructionText = (value) =>
  typeof value === "string" ? value : value?.text || "";

async function assertEducator(userId, challengeId, client = pool) {
  const result = await client.query(
    `SELECT c.*, j.owner_user_id
       FROM challenges c JOIN learning_journeys j ON j.id = c.learning_journey_id
      WHERE c.id = $1 AND j.owner_user_id = $2 AND j.status <> 'ARCHIVED'`,
    [challengeId, userId]
  );
  if (!result.rows[0]) throw httpError("Challenge not found", 404);
  return result.rows[0];
}

async function assertJourneyOwner(userId, journeyId, client = pool) {
  const result = await client.query(
    "SELECT id FROM learning_journeys WHERE id = $1 AND owner_user_id = $2 AND status <> 'ARCHIVED'",
    [journeyId, userId]
  );
  if (!result.rows[0]) throw httpError("Learning Journey not found", 404);
}

function validateChallenge(input) {
  const modes = new Set(["AUTO", "MANUAL", "HYBRID"]);
  if (!input.title?.trim()) throw httpError("Title is required", 400);
  if (input.gradingMode && !modes.has(input.gradingMode)) throw httpError("Invalid grading mode", 400);
  if (input.maxAttempts != null && (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1)) {
    throw httpError("maxAttempts must be null or a positive integer", 400);
  }
  if (input.passingPercentage != null && (input.passingPercentage < 0 || input.passingPercentage > 100)) {
    throw httpError("passingPercentage must be between 0 and 100", 400);
  }
}

async function replaceQuestions(client, challengeId, questions = []) {
  await client.query("DELETE FROM challenge_questions WHERE challenge_id = $1", [challengeId]);
  for (let position = 0; position < questions.length; position += 1) {
    const q = questions[position];
    const inserted = await client.query(
      `INSERT INTO challenge_questions
       (challenge_id, question_type, prompt_json, options_json, config_json, points, position, is_required)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6,$7,$8) RETURNING id`,
      [challengeId, q.type, json(q.prompt, {}), json(q.options, []), json(q.config, {}), q.points || 0, position, q.required !== false]
    );
    if (q.answerKey) {
      await client.query(
        "INSERT INTO challenge_answer_keys(question_id, answer_key_json, grading_config_json) VALUES($1,$2::jsonb,$3::jsonb)",
        [inserted.rows[0].id, json(q.answerKey, {}), json(q.gradingConfig, {})]
      );
    }
  }
}

async function createChallenge(userId, input) {
  validateChallenge(input);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assertJourneyOwner(userId, input.learningJourneyId, client);
    const result = await client.query(
      `INSERT INTO challenges
       (learning_journey_id, created_by_user_id, title, description, instructions,
        grading_mode, status, max_attempts, passing_percentage, total_points,
        release_at, due_at, config_json, settings, max_score)
       VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$13::jsonb,$10)
       RETURNING *`,
      [input.learningJourneyId, userId, input.title.trim(), input.description || null,
       instructionJson(input.instructions), input.gradingMode || "AUTO", input.status || "DRAFT",
       input.maxAttempts ?? null, input.passingPercentage ?? 70, input.totalPoints || 100,
       input.releaseAt || null, input.dueAt || null, json(input.config, {})]
    );
    await replaceQuestions(client, result.rows[0].id, input.questions);
    for (const step of input.steps || []) {
      await client.query(
        `INSERT INTO challenge_steps(challenge_id, step_id, position, is_required_for_step)
         SELECT $1, s.id, $3, $4 FROM steps s JOIN stages st ON st.id=s.stage_id
          WHERE s.id=$2 AND st.learning_journey_id=$5 ON CONFLICT(challenge_id,step_id) DO NOTHING`,
        [result.rows[0].id, step.stepId || step.id, step.position || 0, step.required !== false, input.learningJourneyId]
      );
    }
    await client.query("COMMIT");
    return getEducatorChallenge(userId, result.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function listJourneyChallenges(userId, journeyId) {
  await assertJourneyOwner(userId, journeyId);
  return (await pool.query(
    `SELECT c.*,COUNT(DISTINCT cs.step_id)::integer step_count,
      COUNT(DISTINCT a.id)::integer attempt_count
      FROM challenges c LEFT JOIN challenge_steps cs ON cs.challenge_id=c.id
      LEFT JOIN challenge_v1_attempts a ON a.challenge_id=c.id
      WHERE c.learning_journey_id=$1 AND c.status<>'ARCHIVED'
      GROUP BY c.id ORDER BY c.updated_at DESC`, [journeyId]
  )).rows;
}

async function getEducatorChallenge(userId, challengeId) {
  const challenge = await assertEducator(userId, challengeId);
  const [questions, steps, blocks] = await Promise.all([
    pool.query(`SELECT q.*, k.answer_key_json, k.grading_config_json
                  FROM challenge_questions q LEFT JOIN challenge_answer_keys k ON k.question_id=q.id
                 WHERE q.challenge_id=$1 ORDER BY q.position`, [challengeId]),
    pool.query(`SELECT cs.*, s.title FROM challenge_steps cs JOIN steps s ON s.id=cs.step_id
                 WHERE cs.challenge_id=$1 ORDER BY cs.position`, [challengeId]),
    listBuilderBlocks(challengeId, true),
  ]);
  return { ...challenge, questions: questions.rows, steps: steps.rows, builderBlocks: blocks };
}

async function listBuilderBlocks(challengeId, includeAnswers = false, client = pool) {
  const result = await client.query(
    `SELECT block.id,block.challenge_id,block.question_id,block.block_type,
      block.position,block.content,block.settings,
      question.prompt_json,question.options_json,question.config_json,
      question.points,question.is_required
      ${includeAnswers ? ",answer_key.answer_key_json,answer_key.grading_config_json" : ""}
     FROM challenge_builder_blocks block
     LEFT JOIN challenge_questions question ON question.id=block.question_id
     ${includeAnswers ? "LEFT JOIN challenge_answer_keys answer_key ON answer_key.question_id=question.id" : ""}
     WHERE block.challenge_id=$1 ORDER BY block.position,block.created_at`,
    [challengeId]
  );
  return result.rows;
}

async function createChallengeBlock(userId, challengeId, input) {
  await assertEducator(userId, challengeId);
  const type = String(input.type || input.blockType || "").toUpperCase();
  if (!QUESTION_BLOCK_TYPES.has(type) && !CONTENT_BLOCK_TYPES.has(type)) {
    throw httpError("Invalid block type", 400);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const positionResult = await client.query(
      "SELECT COALESCE(MAX(position),-1)+1 position FROM challenge_builder_blocks WHERE challenge_id=$1",
      [challengeId]
    );
    const position = input.position ?? positionResult.rows[0].position;
    let questionId = null;
    if (QUESTION_BLOCK_TYPES.has(type)) {
      const question = await client.query(
        `INSERT INTO challenge_questions
         (challenge_id,question_type,prompt_json,options_json,config_json,points,position,is_required)
         VALUES($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6,$7,$8) RETURNING id`,
        [challengeId, type, json(input.prompt, { text: "" }), json(input.options, []),
         json(input.config, {}), Number(input.points ?? 1), position, input.required !== false]
      );
      questionId = question.rows[0].id;
      if (input.answerKey) {
        await client.query(
          `INSERT INTO challenge_answer_keys(question_id,answer_key_json,grading_config_json)
           VALUES($1,$2::jsonb,$3::jsonb)`,
          [questionId, json(input.answerKey, {}), json(input.gradingConfig, {})]
        );
      }
    }
    const inserted = await client.query(
      `INSERT INTO challenge_builder_blocks
       (challenge_id,question_id,block_type,position,content,settings)
       VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb) RETURNING id`,
      [challengeId, questionId, type, position, json(input.content, {}), json(input.settings, {})]
    );
    await client.query("COMMIT");
    return (await listBuilderBlocks(challengeId, true)).find((block) => block.id === inserted.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function assertBlockOwner(userId, blockId, client = pool) {
  const result = await client.query(
    `SELECT block.* FROM challenge_builder_blocks block
     JOIN challenges challenge ON challenge.id=block.challenge_id
     JOIN learning_journeys journey ON journey.id=challenge.learning_journey_id
     WHERE block.id=$1 AND journey.owner_user_id=$2`,
    [blockId, userId]
  );
  if (!result.rows[0]) throw httpError("Challenge block not found", 404);
  return result.rows[0];
}

async function updateChallengeBlock(userId, blockId, input) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const block = await assertBlockOwner(userId, blockId, client);
    await client.query(
      `UPDATE challenge_builder_blocks SET
       content=COALESCE($1::jsonb,content),settings=COALESCE($2::jsonb,settings),
       updated_at=NOW() WHERE id=$3`,
      [input.content === undefined ? null : json(input.content, {}),
       input.settings === undefined ? null : json(input.settings, {}), blockId]
    );
    if (block.question_id) {
      await client.query(
        `UPDATE challenge_questions SET
         prompt_json=COALESCE($1::jsonb,prompt_json),options_json=COALESCE($2::jsonb,options_json),
         config_json=COALESCE($3::jsonb,config_json),points=COALESCE($4,points),
         is_required=COALESCE($5,is_required),updated_at=NOW() WHERE id=$6`,
        [input.prompt === undefined ? null : json(input.prompt, {}),
         input.options === undefined ? null : json(input.options, []),
         input.config === undefined ? null : json(input.config, {}),
         input.points ?? null, input.required ?? null, block.question_id]
      );
      if (input.answerKey !== undefined) {
        await client.query(
          `INSERT INTO challenge_answer_keys(question_id,answer_key_json,grading_config_json)
           VALUES($1,$2::jsonb,$3::jsonb)
           ON CONFLICT(question_id) DO UPDATE SET answer_key_json=$2::jsonb,
             grading_config_json=$3::jsonb,updated_at=NOW()`,
          [block.question_id, json(input.answerKey, {}), json(input.gradingConfig, {})]
        );
      }
    }
    await client.query("COMMIT");
    return (await listBuilderBlocks(block.challenge_id, true)).find((item) => item.id === blockId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function deleteChallengeBlock(userId, blockId) {
  const block = await assertBlockOwner(userId, blockId);
  const objectKey = block.content?.objectKey;
  await pool.query("DELETE FROM challenge_builder_blocks WHERE id=$1", [blockId]);
  if (objectKey) await storageService.deleteFile(objectKey);
}

async function reorderChallengeBlocks(userId, challengeId, blockIds = []) {
  await assertEducator(userId, challengeId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let position = 0; position < blockIds.length; position += 1) {
      await client.query(
        `UPDATE challenge_builder_blocks SET position=$1,updated_at=NOW()
         WHERE id=$2 AND challenge_id=$3`,
        [position, blockIds[position], challengeId]
      );
    }
    await client.query(
      `UPDATE challenge_questions question SET position=block.position,updated_at=NOW()
       FROM challenge_builder_blocks block
       WHERE block.challenge_id=$1 AND block.question_id=question.id`,
      [challengeId]
    );
    await client.query("COMMIT");
    return listBuilderBlocks(challengeId, true);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function uploadChallengeBlockAsset(userId, blockId, file) {
  const block = await assertBlockOwner(userId, blockId);
  if (!["IMAGE", "VIDEO", "AUDIO", "FILE", "PDF"].includes(block.block_type)) throw httpError("This block does not accept files", 400);
  const previousKey = block.content?.objectKey;
  const uploaded = await storageService.uploadFile({
    file, folder: "challenge-blocks", ownerId: block.challenge_id,
  });
  const content = {
    ...(block.content || {}), url: uploaded.publicUrl, objectKey: uploaded.objectKey,
    name: uploaded.originalName, mimeType: uploaded.mimeType, size: uploaded.size,
  };
  await pool.query(
    "UPDATE challenge_builder_blocks SET content=$1::jsonb,updated_at=NOW() WHERE id=$2",
    [json(content, {}), blockId]
  );
  if (previousKey) await storageService.deleteFile(previousKey);
  return { ...block, content };
}

async function updateChallenge(userId, challengeId, input) {
  await assertEducator(userId, challengeId);
  if (input.title !== undefined) validateChallenge({ ...input, title: input.title });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE challenges SET title=COALESCE($1,title), description=COALESCE($2,description),
       instructions=COALESCE($3::jsonb,instructions), grading_mode=COALESCE($4,grading_mode),
       status=COALESCE($5,status), max_attempts=CASE WHEN $6 THEN $7 ELSE max_attempts END,
       passing_percentage=COALESCE($8,passing_percentage), total_points=COALESCE($9,total_points),
       max_score=COALESCE($9,max_score), release_at=CASE WHEN $10 THEN $11 ELSE release_at END,
       due_at=CASE WHEN $12 THEN $13 ELSE due_at END, config_json=COALESCE($14::jsonb,config_json),
       updated_at=NOW() WHERE id=$15 RETURNING *`,
      [input.title, input.description,
       input.instructions === undefined ? null : instructionJson(input.instructions),
       input.gradingMode, input.status,
       Object.hasOwn(input, "maxAttempts"), input.maxAttempts, input.passingPercentage, input.totalPoints,
       Object.hasOwn(input, "releaseAt"), input.releaseAt, Object.hasOwn(input, "dueAt"), input.dueAt,
       input.config === undefined ? null : json(input.config, {}), challengeId]
    );
    if (input.questions) await replaceQuestions(client, challengeId, input.questions);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function archiveChallenge(userId, challengeId) {
  await assertEducator(userId, challengeId);
  await pool.query("UPDATE challenges SET status='ARCHIVED', updated_at=NOW() WHERE id=$1", [challengeId]);
}

async function attachStep(userId, challengeId, input) {
  const challenge = await assertEducator(userId, challengeId);
  const result = await pool.query(
    `INSERT INTO challenge_steps(challenge_id,step_id,position,is_required_for_step)
     SELECT $1,s.id,$3,$4 FROM steps s JOIN stages st ON st.id=s.stage_id
      WHERE s.id=$2 AND st.learning_journey_id=$5
     ON CONFLICT(challenge_id,step_id) DO UPDATE SET position=$3,is_required_for_step=$4 RETURNING *`,
    [challengeId, input.stepId, input.position || 0, input.required !== false, challenge.learning_journey_id]
  );
  if (!result.rows[0]) throw httpError("Step does not belong to this Journey", 400);
  return result.rows[0];
}

async function listAssignments(userId, challengeId) {
  await assertEducator(userId, challengeId);
  return (await pool.query(
    `SELECT assignment.id,assignment.enrollment_id,assignment.status,
      assignment.assigned_at,assignment.completed_at,
      enrollment.learner_user_id,profile.id learner_profile_id,
      profile.first_name,profile.last_name,profile.contact_email email
      FROM challenge_assignments assignment
      JOIN journey_enrollments enrollment ON enrollment.id=assignment.enrollment_id
      JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      WHERE assignment.challenge_id=$1
      ORDER BY assignment.assigned_at DESC`,
    [challengeId]
  )).rows;
}

async function listAssignableLearners(userId, challengeId) {
  const challenge = await assertEducator(userId, challengeId);
  return (await pool.query(
    `SELECT enrollment.id AS enrollment_id,enrollment.learner_user_id,
      profile.id learner_profile_id,enrollment.status,
      profile.first_name,profile.last_name,profile.contact_email email,
      assignment.status AS assignment_status
      FROM journey_enrollments enrollment
      JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      LEFT JOIN challenge_assignments assignment
        ON assignment.challenge_id=$1 AND assignment.enrollment_id=enrollment.id
      WHERE enrollment.learning_journey_id=$2
        AND enrollment.status IN ('ACTIVE','COMPLETED')
      ORDER BY profile.first_name,profile.last_name,profile.contact_email`,
    [challengeId, challenge.learning_journey_id]
  )).rows;
}

async function assignLearner(userId, challengeId, enrollmentId) {
  const challenge = await assertEducator(userId, challengeId);
  const result = await pool.query(
    `INSERT INTO challenge_assignments
      (challenge_id,enrollment_id,assigned_by_user_id,status)
     SELECT $1,enrollment.id,$3,'ASSIGNED'
     FROM journey_enrollments enrollment
     WHERE enrollment.id=$2
       AND enrollment.learning_journey_id=$4
       AND enrollment.status IN ('ACTIVE','COMPLETED')
     ON CONFLICT(challenge_id,enrollment_id) DO UPDATE
       SET status='ASSIGNED',assigned_by_user_id=$3,assigned_at=NOW(),
           completed_at=NULL,updated_at=NOW()
     RETURNING *`,
    [challengeId, enrollmentId, userId, challenge.learning_journey_id]
  );
  if (!result.rows[0]) throw httpError("Learner is not enrolled in this Journey", 400);
  const targetProfile=(await pool.query("SELECT learner_profile_id FROM journey_enrollments WHERE id=$1",[enrollmentId])).rows[0];
  await notificationService.create({recipientProfileId:targetProfile?.learner_profile_id,actorUserId:userId,type:"CHALLENGE_ASSIGNED",title:"New Challenge assigned",body:`${challenge.title} is ready for you.`,actionUrl:`/learn/challenges/${challengeId}`,entityType:"CHALLENGE",entityId:challengeId,deduplicationKey:`challenge-assigned:${challengeId}:${enrollmentId}`});
  return result.rows[0];
}

async function revokeAssignment(userId, challengeId, enrollmentId) {
  await assertEducator(userId, challengeId);
  const result = await pool.query(
    `UPDATE challenge_assignments SET status='REVOKED',updated_at=NOW()
      WHERE challenge_id=$1 AND enrollment_id=$2 RETURNING *`,
    [challengeId, enrollmentId]
  );
  if (!result.rows[0]) throw httpError("Assignment not found", 404);
  return result.rows[0];
}

async function detachStep(userId, challengeId, stepId) {
  await assertEducator(userId, challengeId);
  await pool.query("DELETE FROM challenge_steps WHERE challenge_id=$1 AND step_id=$2", [challengeId, stepId]);
}

async function learnerAccess(userId, challengeId, client = pool) {
  const result = await client.query(
    `SELECT c.*, e.id AS enrollment_id
       FROM challenges c
       JOIN journey_enrollments e ON e.learning_journey_id=c.learning_journey_id
       LEFT JOIN challenge_assignments assignment
         ON assignment.challenge_id=c.id AND assignment.enrollment_id=e.id
      WHERE c.id=$1 AND e.learner_user_id=$2 AND e.status='ACTIVE'
        AND (
          assignment.status IN ('ASSIGNED','COMPLETED')
          OR EXISTS (
            SELECT 1 FROM step_blocks block
            JOIN steps step ON step.id=block.step_id
            JOIN stages stage ON stage.id=step.stage_id
            WHERE block.block_type='CHALLENGE'
              AND block.content->>'challengeId'=c.id::text
              AND stage.learning_journey_id=c.learning_journey_id
              AND step.status='PUBLISHED'
          )
        )
        AND c.status='PUBLISHED' AND (c.release_at IS NULL OR c.release_at<=NOW())
        AND (c.due_at IS NULL OR c.due_at>=NOW())`, [challengeId, userId]
  );
  if (!result.rows[0]) throw httpError("Challenge not available", 403);
  return result.rows[0];
}

async function listAssignedChallenges(userId, journeyId = null) {
  const result = await pool.query(
    `SELECT challenge.id,challenge.learning_journey_id,challenge.title,
      challenge.description,challenge.instructions,challenge.total_points,
      challenge.passing_percentage,challenge.max_attempts,challenge.due_at,
      assignment.status AS assignment_status,assignment.assigned_at,
      progress.status AS progress_status,progress.best_percentage,
      progress.attempt_count,
      (SELECT jsonb_agg(jsonb_build_object('id',step.id,'title',step.title)
        ORDER BY relation.position)
       FROM challenge_steps relation
       JOIN steps step ON step.id=relation.step_id
       WHERE relation.challenge_id=challenge.id) AS reviewed_steps
      FROM challenge_assignments assignment
      JOIN journey_enrollments enrollment ON enrollment.id=assignment.enrollment_id
      JOIN challenges challenge ON challenge.id=assignment.challenge_id
      LEFT JOIN learner_challenge_progress progress
        ON progress.challenge_id=challenge.id
       AND progress.enrollment_id=enrollment.id
      WHERE enrollment.learner_user_id=$1
        AND assignment.status IN ('ASSIGNED','COMPLETED')
        AND challenge.status='PUBLISHED'
        AND (challenge.release_at IS NULL OR challenge.release_at<=NOW())
        AND ($2::uuid IS NULL OR challenge.learning_journey_id=$2)
      ORDER BY challenge.due_at NULLS LAST,assignment.assigned_at DESC`,
    [userId, journeyId]
  );
  return result.rows.map((row) => ({
    ...row,
    instructions: instructionText(row.instructions),
  }));
}

async function safeQuestions(challengeId, client = pool) {
  const result = await client.query(
    `SELECT id,question_type,prompt_json,options_json,config_json,points,position,is_required
       FROM challenge_questions WHERE challenge_id=$1 ORDER BY position`, [challengeId]
  );
  return result.rows;
}

async function getLearnerChallenge(userId, challengeId) {
  const challenge = await learnerAccess(userId, challengeId);
  const [questions, blocks, progress, attempts] = await Promise.all([
    safeQuestions(challengeId),
    listBuilderBlocks(challengeId, false),
    pool.query("SELECT * FROM learner_challenge_progress WHERE challenge_id=$1 AND enrollment_id=$2", [challengeId, challenge.enrollment_id]),
    pool.query("SELECT id,attempt_number,status,grading_status,raw_score,max_score,percentage,passed,teacher_feedback,submitted_at,graded_at FROM challenge_v1_attempts WHERE challenge_id=$1 AND enrollment_id=$2 ORDER BY attempt_number DESC", [challengeId, challenge.enrollment_id]),
  ]);
  delete challenge.settings;
  delete challenge.config_json;
  return {
    ...challenge,
    instructions: instructionText(challenge.instructions),
    questions,
    blocks,
    progress: progress.rows[0] || null,
    attempts: attempts.rows,
  };
}

async function loadGradingQuestions(challengeId, client) {
  const result = await client.query(
    `SELECT q.*,k.answer_key_json FROM challenge_questions q
      LEFT JOIN challenge_answer_keys k ON k.question_id=q.id
     WHERE q.challenge_id=$1 ORDER BY q.position`, [challengeId]
  );
  return result.rows;
}

async function recalculateProgress(client, challenge, enrollmentId, attempt) {
  const best = await client.query(
    `SELECT id,raw_score,percentage,passed FROM challenge_v1_attempts
      WHERE challenge_id=$1 AND enrollment_id=$2 AND grading_status<>'PENDING_REVIEW'
      ORDER BY percentage DESC NULLS LAST, submitted_at DESC LIMIT 1`, [challenge.id, enrollmentId]
  );
  const count = await client.query(
    "SELECT COUNT(*)::integer count FROM challenge_v1_attempts WHERE challenge_id=$1 AND enrollment_id=$2",
    [challenge.id, enrollmentId]
  );
  const bestAttempt = best.rows[0];
  const status = attempt.grading_status === "PENDING_REVIEW" ? "PENDING_REVIEW"
    : bestAttempt?.passed ? "PASSED" : "FAILED";
  await client.query(
    `INSERT INTO learner_challenge_progress
     (challenge_id,enrollment_id,status,attempt_count,best_attempt_id,latest_attempt_id,best_score,best_percentage,started_at,passed_at,completed_at)
     VALUES($1,$2,$3::varchar,$4,$5,$6,$7,$8,NOW(),CASE WHEN $3::varchar='PASSED' THEN NOW() END,CASE WHEN $3::varchar='PASSED' THEN NOW() END)
     ON CONFLICT(challenge_id,enrollment_id) DO UPDATE SET status=$3::varchar,attempt_count=$4,
      best_attempt_id=$5,latest_attempt_id=$6,best_score=$7,best_percentage=$8,
      passed_at=CASE WHEN $3::varchar='PASSED' THEN COALESCE(learner_challenge_progress.passed_at,NOW()) ELSE learner_challenge_progress.passed_at END,
      completed_at=CASE WHEN $3::varchar='PASSED' THEN COALESCE(learner_challenge_progress.completed_at,NOW()) ELSE learner_challenge_progress.completed_at END,
      updated_at=NOW()`,
    [challenge.id, enrollmentId, status, count.rows[0].count, bestAttempt?.id || null, attempt.id,
     bestAttempt?.raw_score ?? null, bestAttempt?.percentage ?? null]
  );
  if (status === "PASSED") {
    await client.query(
      `UPDATE challenge_assignments
        SET status='COMPLETED',completed_at=COALESCE(completed_at,NOW()),
            updated_at=NOW()
        WHERE challenge_id=$1 AND enrollment_id=$2`,
      [challenge.id, enrollmentId]
    );
  }
}

async function createAttempt({ challenge, enrollmentId = null, sessionId = null, submittedAnswers, client }) {
  const actor = enrollmentId || sessionId;
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${challenge.id}:${actor}`]);
  const count = await client.query(
    `SELECT COUNT(*)::integer count FROM challenge_v1_attempts WHERE challenge_id=$1
      AND (
        ($2::uuid IS NOT NULL AND enrollment_id=$2::uuid)
        OR
        ($3::uuid IS NOT NULL AND private_access_session_id=$3::uuid)
      )`,
    [challenge.id, enrollmentId, sessionId]
  );
  const maxAttempts = challenge.max_attempts_override ?? challenge.max_attempts;
  if (maxAttempts != null && count.rows[0].count >= maxAttempts) throw httpError("Maximum attempts reached", 409);
  const questions = await loadGradingQuestions(challenge.id, client);
  const grading = gradeAnswers(questions, submittedAnswers);
  const maxScore = questions.reduce((sum, q) => sum + Number(q.points), 0);
  const percentage = maxScore ? (grading.automaticScore / maxScore) * 100 : 0;
  const pending = grading.hasManual;
  const attemptResult = await client.query(
    `INSERT INTO challenge_v1_attempts
     (challenge_id,enrollment_id,private_access_session_id,attempt_number,status,grading_status,raw_score,max_score,percentage,passed,graded_at)
     VALUES(
       $1::uuid,$2::uuid,$3::uuid,$4::integer,'SUBMITTED',
       $5::varchar,$6::numeric,$7::numeric,$8::numeric,$9::boolean,
       CASE WHEN $5::varchar='PENDING_REVIEW' THEN NULL ELSE NOW() END
     ) RETURNING *`,
    [challenge.id, enrollmentId, sessionId, count.rows[0].count + 1,
     pending ? "PENDING_REVIEW" : "AUTO_GRADED", grading.automaticScore, maxScore, percentage,
     pending ? null : percentage >= Number(challenge.passing_percentage || 0)]
  );
  const attempt = attemptResult.rows[0];
  for (const answer of grading.answers) {
    await client.query(
      `INSERT INTO challenge_attempt_answers
       (attempt_id,question_id,answer_json,auto_is_correct,auto_points_awarded,final_points_awarded)
       VALUES($1,$2,$3::jsonb,$4,$5,$5)`,
      [attempt.id, answer.question.id, json(answer.submitted, {}), answer.correct, answer.points]
    );
  }
  if (enrollmentId) await recalculateProgress(client, challenge, enrollmentId, attempt);
  return attempt;
}

async function submitLearnerAttempt(userId, challengeId, answers) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const challenge = await learnerAccess(userId, challengeId, client);
    const attempt = await createAttempt({ challenge, enrollmentId: challenge.enrollment_id, submittedAnswers: answers, client });
    await notificationService.create({recipientUserId:challenge.owner_user_id,actorUserId:userId,type:"CHALLENGE_SUBMITTED",title:"Challenge submitted",body:`A learner submitted ${challenge.title}.`,actionUrl:`/studio/challenges/${challengeId}/submissions`,entityType:"CHALLENGE",entityId:challengeId,deduplicationKey:`challenge-submitted:${attempt.id}`},client);
    await client.query("COMMIT");
    return attempt;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function uploadSpeakingResponse(userId, challengeId, file) {
  if (!file) throw httpError("Audio recording is required", 400);
  if (!String(file.mimetype || "").startsWith("audio/")) throw httpError("Only audio recordings are accepted", 400);
  const challenge = await learnerAccess(userId, challengeId);
  const uploaded = await storageService.uploadFile({ file, folder: "challenge-speaking", ownerId: userId });
  return { url: uploaded.publicUrl, objectKey: uploaded.objectKey, name: uploaded.originalName,
    mimeType: uploaded.mimeType, size: uploaded.size, challengeId: challenge.id };
}

async function uploadPrivateSpeakingResponse(token, sessionToken, file) {
  if (!file) throw httpError("Audio recording is required", 400);
  if (!String(file.mimetype || "").startsWith("audio/")) throw httpError("Only audio recordings are accepted", 400);
  const { session } = await privateSession(token, sessionToken);
  const uploaded = await storageService.uploadFile({ file, folder: "challenge-speaking-private", ownerId: session.id });
  return { url: uploaded.publicUrl, objectKey: uploaded.objectKey, name: uploaded.originalName,
    mimeType: uploaded.mimeType, size: uploaded.size };
}

async function learnerAttempts(userId, challengeId) {
  const challenge = await learnerAccess(userId, challengeId);
  return (await pool.query(
    "SELECT id,attempt_number,status,grading_status,raw_score,max_score,percentage,passed,teacher_feedback,submitted_at,graded_at FROM challenge_v1_attempts WHERE challenge_id=$1 AND enrollment_id=$2 ORDER BY attempt_number DESC",
    [challengeId, challenge.enrollment_id])).rows;
}

async function learnerAttempt(userId, attemptId) {
  const result = await pool.query(
    `SELECT a.id,a.challenge_id,a.attempt_number,a.status,a.grading_status,a.raw_score,a.max_score,
      a.percentage,a.passed,a.teacher_feedback,a.submitted_at,a.graded_at
      FROM challenge_v1_attempts a JOIN journey_enrollments e ON e.id=a.enrollment_id
      WHERE a.id=$1 AND e.learner_user_id=$2`, [attemptId, userId]
  );
  if (!result.rows[0]) throw httpError("Attempt not found", 404);
  return result.rows[0];
}

async function educatorAttempts(userId, challengeId, filters = {}) {
  await assertEducator(userId, challengeId);
  const values = [challengeId];
  let where = "";
  if (filters.status) { values.push(filters.status); where += ` AND a.grading_status=$${values.length}`; }
  if (filters.learnerId) { values.push(filters.learnerId); where += ` AND e.learner_user_id=$${values.length}`; }
  return (await pool.query(
    `SELECT a.*,e.learner_user_id,e.learner_profile_id,
      profile.first_name,profile.last_name
      FROM challenge_v1_attempts a
      LEFT JOIN journey_enrollments e ON e.id=a.enrollment_id
      LEFT JOIN learner_profiles profile ON profile.id=e.learner_profile_id
     WHERE a.challenge_id=$1${where} ORDER BY a.submitted_at DESC`, values)).rows;
}

async function educatorAttempt(userId, attemptId) {
  const result = await pool.query("SELECT challenge_id FROM challenge_v1_attempts WHERE id=$1", [attemptId]);
  if (!result.rows[0]) throw httpError("Attempt not found", 404);
  await assertEducator(userId, result.rows[0].challenge_id);
  const [attempt, answers] = await Promise.all([
    pool.query(
      `SELECT attempt.*,profile.first_name,profile.last_name,
        profile.contact_email email
       FROM challenge_v1_attempts attempt
       LEFT JOIN journey_enrollments enrollment
         ON enrollment.id=attempt.enrollment_id
       LEFT JOIN learner_profiles profile
         ON profile.id=enrollment.learner_profile_id
       WHERE attempt.id=$1`,
      [attemptId]
    ),
    pool.query(
      `SELECT answer.*,question.question_type,question.prompt_json,
        question.options_json,question.points,question.position,
        answer_key.answer_key_json
       FROM challenge_attempt_answers answer
       JOIN challenge_questions question
         ON question.id=answer.question_id
       LEFT JOIN challenge_answer_keys answer_key
         ON answer_key.question_id=question.id
       WHERE answer.attempt_id=$1
       ORDER BY question.position`,
      [attemptId]
    )
  ]);
  return { ...attempt.rows[0], answers: answers.rows };
}

async function reviewAttempt(userId, attemptId, input) {
  const current = await educatorAttempt(userId, attemptId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const answer of input.answers || []) {
      await client.query(
        `UPDATE challenge_attempt_answers SET final_points_awarded=$1,grader_feedback=$2,updated_at=NOW()
          WHERE attempt_id=$3 AND question_id=$4`,
        [answer.points, answer.feedback || null, attemptId, answer.questionId]
      );
    }
    const total = await client.query("SELECT COALESCE(SUM(final_points_awarded),0)::numeric score FROM challenge_attempt_answers WHERE attempt_id=$1", [attemptId]);
    const score = input.overrideScore ?? Number(total.rows[0].score);
    const percentage = current.max_score ? (score / Number(current.max_score)) * 100 : 0;
    const challenge = await assertEducator(userId, current.challenge_id, client);
    const updated = await client.query(
      `UPDATE challenge_v1_attempts SET raw_score=$1,percentage=$2,passed=$3,grading_status=$4,
       teacher_feedback=$5,graded_by_user_id=$6,graded_at=NOW(),updated_at=NOW() WHERE id=$7 RETURNING *`,
      [score, percentage, percentage >= Number(challenge.passing_percentage || 0),
       input.overrideScore == null ? "REVIEWED" : "OVERRIDDEN", input.feedback || null, userId, attemptId]
    );
    await client.query(
      `INSERT INTO challenge_attempt_grade_events
       (attempt_id,actor_user_id,event_type,previous_score,new_score,previous_percentage,new_percentage,feedback,metadata_json)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
      [attemptId, userId, input.overrideScore == null ? "MANUAL_GRADE" : "SCORE_OVERRIDE",
       current.raw_score, score, current.percentage, percentage, input.feedback || null, json({ reason: input.reason }, {})]
    );
    if (current.enrollment_id) await recalculateProgress(client, challenge, current.enrollment_id, updated.rows[0]);
    if(current.enrollment_id){const learner=(await client.query("SELECT learner_profile_id FROM journey_enrollments WHERE id=$1",[current.enrollment_id])).rows[0];await notificationService.create({recipientProfileId:learner?.learner_profile_id,actorUserId:userId,type:"CHALLENGE_GRADED",title:"Challenge graded",body:`Your result for ${challenge.title} is ready.`,actionUrl:`/learn/challenges/${current.challenge_id}`,entityType:"CHALLENGE",entityId:current.challenge_id,deduplicationKey:`challenge-graded:${attemptId}`},client);}
    await client.query("COMMIT");
    return updated.rows[0];
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function createPrivateLink(userId, challengeId, input = {}) {
  const challenge = await assertEducator(userId, challengeId);
  let target = null;
  if (input.targetEnrollmentId) {
    const targetResult = await pool.query(
      `SELECT enrollment.id,enrollment.learner_user_id,
        profile.first_name,profile.last_name,profile.contact_email
       FROM journey_enrollments enrollment
       JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
       WHERE enrollment.id=$1 AND enrollment.learning_journey_id=$2
         AND enrollment.status IN ('ACTIVE','COMPLETED')`,
      [input.targetEnrollmentId, challenge.learning_journey_id]
    );
    target = targetResult.rows[0];
    if (!target) throw httpError("Target learner is not enrolled in this Journey", 400);
  }
  const token = createToken();
  const result = await pool.query(
    `INSERT INTO challenge_private_links
     (challenge_id,created_by_user_id,token_hash,label,expires_at,max_uses,allowed_email,access_code_hash,
      collect_guest_name,collect_guest_email,max_attempts_override,target_enrollment_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id,label,status,expires_at,max_uses,use_count,target_enrollment_id`,
    [challengeId, userId, hashToken(token), input.label || (target ? `For ${[target.first_name,target.last_name].filter(Boolean).join(" ")}` : null), input.expiresAt || null,
     input.maxUses || null, input.allowedEmail?.trim().toLowerCase() || target?.contact_email || null,
     input.accessCode ? hashToken(input.accessCode) : null, input.collectGuestName !== false,
     input.collectGuestEmail !== false, input.maxAttemptsOverride || null, target?.id || null]
  );
  return { ...result.rows[0], token };
}

async function listPrivateLinks(userId, challengeId) {
  await assertEducator(userId, challengeId);
  return (await pool.query(
    `SELECT link.id,link.label,link.status,link.expires_at,link.max_uses,link.use_count,
      link.allowed_email,link.collect_guest_name,link.collect_guest_email,
      link.max_attempts_override,link.last_used_at,link.created_at,link.target_enrollment_id,
      profile.first_name target_first_name,profile.last_name target_last_name
      FROM challenge_private_links link
      LEFT JOIN journey_enrollments enrollment ON enrollment.id=link.target_enrollment_id
      LEFT JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      WHERE link.challenge_id=$1 ORDER BY link.created_at DESC`, [challengeId])).rows;
}

async function updatePrivateLink(userId, linkId, input) {
  const result = await pool.query(
    `UPDATE challenge_private_links l SET status=COALESCE($1,l.status),expires_at=COALESCE($2,l.expires_at),
      max_uses=COALESCE($3,l.max_uses),updated_at=NOW()
      FROM challenges c JOIN learning_journeys j ON j.id=c.learning_journey_id
      WHERE l.id=$4 AND c.id=l.challenge_id AND j.owner_user_id=$5
      RETURNING l.id,l.label,l.status,l.expires_at,l.max_uses,l.use_count`,
    [input.status, input.expiresAt, input.maxUses, linkId, userId]
  );
  if (!result.rows[0]) throw httpError("Private link not found", 404);
  return result.rows[0];
}

async function revokePrivateLink(userId, linkId) {
  return updatePrivateLink(userId, linkId, { status: "REVOKED" });
}

async function resolvePrivateLink(rawToken, client = pool, lock = false) {
  const result = await client.query(
    `SELECT l.*,c.title,c.description,c.instructions,c.max_attempts,c.passing_percentage,c.status challenge_status,
      c.release_at,c.due_at,profile.first_name target_first_name,
      profile.last_name target_last_name,profile.contact_email target_email
      FROM challenge_private_links l JOIN challenges c ON c.id=l.challenge_id
      LEFT JOIN journey_enrollments enrollment ON enrollment.id=l.target_enrollment_id
      LEFT JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
      WHERE l.token_hash=$1 ${lock ? "FOR UPDATE OF l" : ""}`, [hashToken(rawToken)]
  );
  const link = result.rows[0];
  if (!link || link.status !== "ACTIVE" || link.challenge_status !== "PUBLISHED") throw httpError("Private link is unavailable", 404);
  if (link.expires_at && new Date(link.expires_at) <= new Date()) throw httpError("Private link has expired", 410);
  if (link.max_uses != null && link.use_count >= link.max_uses) throw httpError("Private link usage limit reached", 410);
  return link;
}

async function getPrivateMetadata(token) {
  const link = await resolvePrivateLink(token);
  return { title: link.title, description: link.description, instructions: instructionText(link.instructions),
    expiresAt: link.expires_at, collectGuestName: link.collect_guest_name,
    collectGuestEmail: link.collect_guest_email, requiresEmail: Boolean(link.allowed_email),
    requiresAccessCode: Boolean(link.access_code_hash),
    targeted: Boolean(link.target_enrollment_id),
    learnerName: [link.target_first_name,link.target_last_name].filter(Boolean).join(" ") || null };
}

async function createPrivateSession(token, input) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const link = await resolvePrivateLink(token, client, true);
    const email = input.email?.trim().toLowerCase() || link.target_email || null;
    if (link.allowed_email && email !== link.allowed_email) throw httpError("Email is not allowed", 403);
    if (link.access_code_hash && !safeEqualHash(input.accessCode || "", link.access_code_hash)) throw httpError("Invalid access code", 403);
    const sessionToken = createToken();
    await client.query("UPDATE challenge_private_links SET use_count=use_count+1,last_used_at=NOW() WHERE id=$1", [link.id]);
    const session = await client.query(
      `INSERT INTO challenge_private_access_sessions
       (private_link_id,session_token_hash,guest_name,guest_email,expires_at)
       VALUES($1,$2,$3,$4,LEAST(COALESCE($5::timestamptz,NOW()+INTERVAL '24 hours'),NOW()+INTERVAL '24 hours')) RETURNING id,expires_at`,
      [link.id, hashToken(sessionToken), input.name || [link.target_first_name,link.target_last_name].filter(Boolean).join(" ") || null, email, link.expires_at]
    );
    await client.query("COMMIT");
    return { sessionToken, expiresAt: session.rows[0].expires_at, challenge: {
      id: link.challenge_id, title: link.title, instructions: instructionText(link.instructions),
      questions: await safeQuestions(link.challenge_id),
      blocks: await listBuilderBlocks(link.challenge_id, false)
    }};
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function privateSession(rawToken, sessionToken, client = pool) {
  const link = await resolvePrivateLink(rawToken, client);
  const result = await client.query(
    `SELECT s.*,l.max_attempts_override FROM challenge_private_access_sessions s
      JOIN challenge_private_links l ON l.id=s.private_link_id
     WHERE s.private_link_id=$1 AND s.session_token_hash=$2 AND s.status='ACTIVE'
       AND (s.expires_at IS NULL OR s.expires_at>NOW())`, [link.id, hashToken(sessionToken)]
  );
  if (!result.rows[0]) throw httpError("Private session is invalid", 403);
  return { link, session: result.rows[0] };
}

async function submitPrivateAttempt(token, input) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { link, session } = await privateSession(token, input.sessionToken, client);
    const challenge = { ...link, id: link.challenge_id, max_attempts_override: link.max_attempts_override };
    const attempt = await createAttempt({
      challenge,
      enrollmentId: link.target_enrollment_id || null,
      sessionId: session.id,
      submittedAnswers: input.answers,
      client
    });
    const attemptToken = createToken();
    await client.query("UPDATE challenge_v1_attempts SET result_token_hash=$1 WHERE id=$2", [hashToken(attemptToken), attempt.id]);
    await client.query("UPDATE challenge_private_access_sessions SET attempt_count=attempt_count+1 WHERE id=$1", [session.id]);
    await client.query("COMMIT");
    return { attemptToken, gradingStatus: attempt.grading_status };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function privateAttempt(token, attemptToken, sessionToken) {
  const { session } = await privateSession(token, sessionToken);
  const result = await pool.query(
    `SELECT id,attempt_number,status,grading_status,raw_score,max_score,percentage,passed,teacher_feedback,submitted_at,graded_at
       FROM challenge_v1_attempts WHERE private_access_session_id=$1 AND result_token_hash=$2`,
    [session.id, hashToken(attemptToken)]
  );
  if (!result.rows[0]) throw httpError("Attempt not found", 404);
  return result.rows[0];
}

module.exports = {
  createChallenge, listJourneyChallenges, getEducatorChallenge, updateChallenge, archiveChallenge, attachStep, detachStep,
  listAssignments, listAssignableLearners, assignLearner, revokeAssignment,
  listAssignedChallenges,
  getLearnerChallenge, submitLearnerAttempt, uploadSpeakingResponse, learnerAttempts, learnerAttempt,
  educatorAttempts, educatorAttempt, reviewAttempt, createPrivateLink, listPrivateLinks,
  updatePrivateLink, revokePrivateLink, getPrivateMetadata, createPrivateSession,
  submitPrivateAttempt, privateAttempt, uploadPrivateSpeakingResponse,
  createChallengeBlock, updateChallengeBlock, deleteChallengeBlock,
  reorderChallengeBlocks, uploadChallengeBlockAsset,
};
