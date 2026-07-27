const pool = require("../config/db");

async function createResetToken(userId, token, expiresAt) {
  const result = await pool.query(
    `
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, token, expires_at
    `,
    [userId, token, expiresAt]
  );

  return result.rows[0];
}

async function findValidToken(token) {
  const result = await pool.query(
    `
    SELECT id, user_id, token, expires_at, used_at
    FROM password_reset_tokens
    WHERE token = $1
      AND used_at IS NULL
      AND expires_at > NOW()
    `,
    [token]
  );

  return result.rows[0];
}

async function markTokenUsed(tokenId) {
  await pool.query(
    `
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE id = $1
    `,
    [tokenId]
  );
}

async function updateUserPassword(userId, passwordHash) {
  await pool.query(
    `
    UPDATE users
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
    `,
    [passwordHash, userId]
  );
}

module.exports = {
  createResetToken,
  findValidToken,
  markTokenUsed,
  updateUserPassword,
};