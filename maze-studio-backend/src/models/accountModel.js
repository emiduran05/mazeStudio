const pool = require("../config/db");

async function findAccountForDelete(userId) {
  const result = await pool.query(
    `
    SELECT id, email, password_hash, avatar_object_key, status, deleted_at
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

async function markAccountForDeletion(userId, reason = null) {
  const result = await pool.query(
    `
    UPDATE users
    SET
      status = 'PENDING_DELETION',
      deleted_at = NOW(),
      scheduled_deletion_at = NOW() + INTERVAL '30 days',
      deletion_reason = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, status, deleted_at, scheduled_deletion_at
    `,
    [userId, reason]
  );

  return result.rows[0];
}

async function restoreAccount(userId) {
  const result = await pool.query(
    `
    UPDATE users
    SET
      status = 'ACTIVE',
      deleted_at = NULL,
      scheduled_deletion_at = NULL,
      deletion_reason = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND status = 'PENDING_DELETION'
    RETURNING id, status
    `,
    [userId]
  );

  return result.rows[0];
}

async function deactivateAccount(userId, reason = null) {
  const result = await pool.query(
    `
    UPDATE users
    SET
      status = 'INACTIVE',
      deletion_reason = $2,
      updated_at = NOW()
    WHERE id = $1
      AND status = 'ACTIVE'
    RETURNING id, status
    `,
    [userId, reason]
  );

  return result.rows[0];
}

async function reactivateAccount(userId) {
  const result = await pool.query(
    `
    UPDATE users
    SET
      status = 'ACTIVE',
      deletion_reason = NULL,
      updated_at = NOW()
    WHERE id = $1
      AND status = 'INACTIVE'
    RETURNING id, status
    `,
    [userId]
  );

  return result.rows[0];
}

module.exports = {
  findAccountForDelete,
  markAccountForDeletion,
  restoreAccount,
  deactivateAccount,
  reactivateAccount,
};