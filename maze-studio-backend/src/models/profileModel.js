const pool = require("../config/db");

async function updateProfile(userId, { firstName, lastName, email, avatarUrl, timezone }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      UPDATE users
      SET 
        first_name = $1,
        last_name = $2,
        email = $3,
        avatar_url = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, first_name, last_name, email, role, avatar_url, status, created_at
      `,
      [firstName, lastName, email, avatarUrl, userId]
    );

    await client.query(
      `
      UPDATE user_preferences
      SET timezone = $1, updated_at = NOW()
      WHERE user_id = $2
      `,
      [timezone, userId]
    );

    await client.query("COMMIT");

    return userResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findUserByEmailExceptCurrent(email, userId) {
  const result = await pool.query(
    `
    SELECT id 
    FROM users
    WHERE email = $1 AND id != $2
    `,
    [email, userId]
  );

  return result.rows[0];


  
}

async function updateAvatar(userId, avatarUrl, avatarObjectKey) {
  const result = await pool.query(
    `
    UPDATE users
    SET avatar_url = $1,
        avatar_object_key = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING id, first_name, last_name, email, role, avatar_url, status, created_at
    `,
    [avatarUrl, avatarObjectKey, userId]
  );

  return result.rows[0];
}

module.exports = {
  updateProfile,
  findUserByEmailExceptCurrent,
  updateAvatar
};