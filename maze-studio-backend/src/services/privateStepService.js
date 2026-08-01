const pool = require("../config/db");
const { createToken, hashToken } = require("./privateTokenService");
const learnerService = require("./learnerService");
const learnerModel = require("../models/learnerModel");

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function assertStepOwner(userId, stepId) {
  const result = await pool.query(
    `SELECT step.*,stage.learning_journey_id
     FROM steps step JOIN stages stage ON stage.id=step.stage_id
     JOIN learning_journeys journey ON journey.id=stage.learning_journey_id
     WHERE step.id=$1 AND journey.owner_user_id=$2 AND journey.status<>'ARCHIVED'`,
    [stepId,userId]
  );
  if (!result.rows[0]) throw httpError("Step not found",404);
  return result.rows[0];
}

async function createLink(userId, stepId, input) {
  const step = await assertStepOwner(userId,stepId);
  const target = await pool.query(
    `SELECT enrollment.id,profile.first_name,profile.last_name
     FROM journey_enrollments enrollment
     JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
     WHERE enrollment.id=$1 AND enrollment.learning_journey_id=$2
       AND enrollment.status IN ('ACTIVE','COMPLETED')`,
    [input.targetEnrollmentId,step.learning_journey_id]
  );
  if (!target.rows[0]) throw httpError("Target learner is not enrolled in this Journey",400);
  const token=createToken();
  const result=await pool.query(
    `INSERT INTO step_private_links
     (step_id,target_enrollment_id,created_by_user_id,token_hash,label,expires_at,max_uses)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     RETURNING id,label,status,expires_at,max_uses,use_count,target_enrollment_id`,
    [stepId,input.targetEnrollmentId,userId,hashToken(token),
     input.label||`For ${[target.rows[0].first_name,target.rows[0].last_name].filter(Boolean).join(" ")}`,
     input.expiresAt||null,input.maxUses||null]
  );
  return {...result.rows[0],token};
}

async function listLinks(userId,stepId) {
  await assertStepOwner(userId,stepId);
  return (await pool.query(
    `SELECT link.id,link.label,link.status,link.expires_at,link.max_uses,
      link.use_count,link.last_used_at,link.created_at,link.target_enrollment_id,
      profile.first_name,profile.last_name
     FROM step_private_links link
     JOIN journey_enrollments enrollment ON enrollment.id=link.target_enrollment_id
     JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
     WHERE link.step_id=$1 ORDER BY link.created_at DESC`,[stepId]
  )).rows;
}

async function revokeLink(userId,linkId) {
  const result=await pool.query(
    `UPDATE step_private_links link SET status='REVOKED',updated_at=NOW()
     FROM steps step JOIN stages stage ON stage.id=step.stage_id
     JOIN learning_journeys journey ON journey.id=stage.learning_journey_id
     WHERE link.id=$1 AND step.id=link.step_id AND journey.owner_user_id=$2
     RETURNING link.id`,[linkId,userId]
  );
  if(!result.rows[0])throw httpError("Private Step link not found",404);
}

async function resolveLink(rawToken,client=pool,lock=false) {
  const result=await client.query(
    `SELECT link.*,step.title,step.description,step.status step_status,
      stage.title stage_title,stage.learning_journey_id,
      profile.first_name,profile.last_name
     FROM step_private_links link
     JOIN steps step ON step.id=link.step_id
     JOIN stages stage ON stage.id=step.stage_id
     JOIN journey_enrollments enrollment ON enrollment.id=link.target_enrollment_id
     JOIN learner_profiles profile ON profile.id=enrollment.learner_profile_id
     WHERE link.token_hash=$1 ${lock?"FOR UPDATE OF link":""}`,
    [hashToken(rawToken)]
  );
  const link=result.rows[0];
  if(!link||link.status!=="ACTIVE"||link.step_status!=="PUBLISHED")throw httpError("Private Step link is unavailable",404);
  if(link.expires_at&&new Date(link.expires_at)<=new Date())throw httpError("Private Step link has expired",410);
  if(link.max_uses!=null&&link.use_count>=link.max_uses)throw httpError("Private Step link usage limit reached",410);
  return link;
}

async function metadata(token) {
  const link=await resolveLink(token);
  return {title:link.title,description:link.description,stageTitle:link.stage_title,
    learnerName:[link.first_name,link.last_name].filter(Boolean).join(" "),expiresAt:link.expires_at};
}

function sanitizeBlock(block) {
  const content={...(block.content||{})};
  delete content.correctAnswer;delete content.acceptedAnswers;delete content.explanation;
  if(Array.isArray(content.options))content.options=content.options.map(({isCorrect,...option})=>option);
  return {...block,content};
}

async function startSession(token) {
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const link=await resolveLink(token,client,true);
    const sessionToken=createToken();
    const session=await client.query(
      `INSERT INTO step_private_access_sessions(private_link_id,session_token_hash,expires_at)
       VALUES($1,$2,LEAST(COALESCE($3::timestamptz,NOW()+INTERVAL '24 hours'),NOW()+INTERVAL '24 hours'))
       RETURNING expires_at`,[link.id,hashToken(sessionToken),link.expires_at]
    );
    await client.query("UPDATE step_private_links SET use_count=use_count+1,last_used_at=NOW() WHERE id=$1",[link.id]);
    const blocks=await client.query(
      `SELECT block.id,block.parent_block_id,block.block_type,block.position,
       CASE WHEN block.block_type='CHALLENGE' THEN block.content ||
         jsonb_build_object(
           'title',challenge.title,
           'description',challenge.description,
           'progressStatus',COALESCE(progress.status,'NOT_STARTED'),
           'bestPercentage',progress.best_percentage
         )
       ELSE block.content END content,block.settings
       FROM step_blocks block
       LEFT JOIN challenges challenge
         ON block.block_type='CHALLENGE'
        AND challenge.id=NULLIF(block.content->>'challengeId','')::uuid
       LEFT JOIN learner_challenge_progress progress
         ON progress.challenge_id=challenge.id
        AND progress.enrollment_id=$2
       WHERE block.step_id=$1
       ORDER BY block.parent_block_id NULLS FIRST,block.position,block.created_at`,
      [link.step_id,link.target_enrollment_id]
    );
    await client.query("COMMIT");
    return {sessionToken,expiresAt:session.rows[0].expires_at,step:{
      id:link.step_id,title:link.title,description:link.description,stageTitle:link.stage_title,
      learnerName:[link.first_name,link.last_name].filter(Boolean).join(" "),
      blocks:blocks.rows.map(sanitizeBlock)
    }};
  }catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}
}

async function privateSession(token,sessionToken,client=pool) {
  const link=await resolveLink(token,client);
  const result=await client.query(
    `SELECT session.id FROM step_private_access_sessions session
     WHERE session.private_link_id=$1 AND session.session_token_hash=$2
       AND session.status='ACTIVE' AND session.expires_at>NOW()`,
    [link.id,hashToken(sessionToken||"")]
  );
  if(!result.rows[0])throw httpError("Private Step session is invalid",403);
  return link;
}

async function complete(token,sessionToken) {
  const link=await privateSession(token,sessionToken);
  const incompleteChallenges=await learnerModel.countIncompleteChallengeBlocks(
    link.target_enrollment_id,link.step_id
  );
  if(incompleteChallenges>0)throw httpError(
    "Complete the required Challenge before finishing this Step",409
  );
  const result=await pool.query(
    `INSERT INTO step_progress(enrollment_id,step_id,status,progress_percentage,started_at,completed_at,last_accessed_at)
     VALUES($1,$2,'COMPLETED',100,NOW(),NOW(),NOW())
     ON CONFLICT(enrollment_id,step_id) DO UPDATE SET status='COMPLETED',
       progress_percentage=100,started_at=COALESCE(step_progress.started_at,NOW()),
       completed_at=COALESCE(step_progress.completed_at,NOW()),last_accessed_at=NOW()
     RETURNING *`,[link.target_enrollment_id,link.step_id]
  );
  return result.rows[0];
}

async function checkAnswer(token,sessionToken,blockId,answer) {
  const link=await privateSession(token,sessionToken);
  const block=await pool.query("SELECT step_id FROM step_blocks WHERE id=$1",[blockId]);
  if(block.rows[0]?.step_id!==link.step_id)throw httpError("Exercise not available",403);
  // Reuse the existing grader after proving the token grants access to this exact Step.
  return learnerService.checkExerciseBlockAnswer
    ? learnerService.checkExerciseBlockAnswer(blockId,answer)
    : gradePublicExercise(blockId,answer);
}

async function gradePublicExercise(blockId,answer) {
  const result=await pool.query("SELECT block_type,content,settings FROM step_blocks WHERE id=$1",[blockId]);
  const block=result.rows[0];if(!block)throw httpError("Exercise not found",404);
  const content=block.content||{};const normalized=(v)=>String(v??"").trim().toLowerCase();let correct=false;
  if(block.block_type==="TRUE_FALSE")correct=answer===content.correctAnswer;
  else if(block.block_type==="SHORT_ANSWER")correct=(content.acceptedAnswers||[]).map(normalized).includes(normalized(answer));
  else if(block.block_type==="MULTIPLE_CHOICE"){
    const expected=(content.options||[]).filter(o=>o.isCorrect).map(o=>o.id).sort();
    const received=(Array.isArray(answer)?answer:[answer]).filter(Boolean).sort();
    correct=expected.length===received.length&&expected.every((v,i)=>v===received[i]);
  } else if(block.block_type==="FILL_BLANKS"){
    const expected=content.acceptedAnswers||[];const received=Array.isArray(answer)?answer:[];
    correct=expected.length===received.length&&expected.every((v,i)=>normalized(v)===normalized(received[i]));
  } else if(block.block_type==="MATCHING"){
    correct=(content.pairs||[]).every(pair=>answer?.[pair.id]===pair.id);
  } else if(block.block_type==="ORDERING"){
    const expected=(content.items||[]).map(item=>item.id);
    const received=(Array.isArray(answer)?answer:[]).map(item=>item?.id||item);
    correct=expected.length===received.length&&expected.every((v,i)=>v===received[i]);
  } else throw httpError("This Block is not an exercise",400);
  return {correct,points:correct?Number(block.settings?.points||0):0};
}

module.exports={createLink,listLinks,revokeLink,metadata,startSession,complete,checkAnswer};
