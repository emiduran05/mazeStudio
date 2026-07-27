const pool = require("../config/db");

async function findPasswordByUserId(userId) {
  const result = await pool.query(
    `
    SELECT id, password_hash, status
    FROM users
    WHERE id = $1
      AND status IN ('ACTIVE', 'INACTIVE')
    `,
    [userId]
  );

  return result.rows[0];
}

async function updatePassword(userId, passwordHash) {
  const result = await pool.query(
    `
    UPDATE users
    SET
      password_hash = $1,
      updated_at = NOW()
    WHERE id = $2
      AND status IN ('ACTIVE', 'INACTIVE')
    RETURNING id, email, status, updated_at
    `,
    [passwordHash, userId]
  );

  return result.rows[0];
}

module.exports = {
  findPasswordByUserId,
  updatePassword,
};