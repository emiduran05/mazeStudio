const pool = require("../config/db");

async function getAccess(userId, journeyId) {
  const result = await pool.query(
    `SELECT journey.id AS journey_id, journey.owner_user_id,
            CASE WHEN journey.owner_user_id=$1 THEN 'OWNER' ELSE collaborator.role END AS access_role,
            CASE WHEN journey.owner_user_id=$1 THEN TRUE
              ELSE collaborator.status='ACTIVE' AND UPPER(subscription.status) IN ('ACTIVE','TRIALING') END AS has_access
     FROM learning_journeys journey
     LEFT JOIN learning_journey_collaborators collaborator
       ON collaborator.learning_journey_id=journey.id AND collaborator.user_id=$1
     LEFT JOIN subscriptions subscription ON subscription.user_id=$1
     WHERE journey.id=$2 AND journey.status<>'ARCHIVED' LIMIT 1`,
    [userId, journeyId]
  );
  return result.rows[0] || null;
}

async function list(journeyId) {
  const result = await pool.query(
    `SELECT collaborator.id,collaborator.user_id,collaborator.role,collaborator.status,
            collaborator.created_at,user_account.first_name,user_account.last_name,user_account.email,
            subscription.status AS subscription_status
     FROM learning_journey_collaborators collaborator
     JOIN users user_account ON user_account.id=collaborator.user_id
     LEFT JOIN subscriptions subscription ON subscription.user_id=user_account.id
     WHERE collaborator.learning_journey_id=$1 AND collaborator.status='ACTIVE'
     ORDER BY collaborator.created_at`, [journeyId]
  );
  return result.rows;
}

async function findEligibleByEmail(email) {
  const result = await pool.query(
    `SELECT user_account.id,user_account.first_name,user_account.last_name,user_account.email,
            user_account.role,user_account.status,subscription.status AS subscription_status
     FROM users user_account
     LEFT JOIN subscriptions subscription ON subscription.user_id=user_account.id
     WHERE LOWER(user_account.email)=LOWER($1) LIMIT 1`, [email]
  );
  return result.rows[0] || null;
}

async function upsert(journeyId,userId,role,invitedBy) {
  const result=await pool.query(
    `INSERT INTO learning_journey_collaborators
      (learning_journey_id,user_id,role,status,invited_by_user_id)
     VALUES($1,$2,$3,'ACTIVE',$4)
     ON CONFLICT(learning_journey_id,user_id) DO UPDATE
       SET role=EXCLUDED.role,status='ACTIVE',invited_by_user_id=EXCLUDED.invited_by_user_id,updated_at=NOW()
     RETURNING *`,[journeyId,userId,role,invitedBy]
  ); return result.rows[0];
}

async function updateRole(journeyId,collaboratorId,role) {
  const result=await pool.query(
    `UPDATE learning_journey_collaborators SET role=$3,updated_at=NOW()
     WHERE id=$2 AND learning_journey_id=$1 AND status='ACTIVE' RETURNING *`,
    [journeyId,collaboratorId,role]
  ); return result.rows[0]||null;
}

async function revoke(journeyId,collaboratorId) {
  const result=await pool.query(
    `UPDATE learning_journey_collaborators SET status='REVOKED',updated_at=NOW()
     WHERE id=$2 AND learning_journey_id=$1 RETURNING id`,[journeyId,collaboratorId]
  ); return result.rows[0]||null;
}
module.exports={getAccess,list,findEligibleByEmail,upsert,updateRole,revoke};
