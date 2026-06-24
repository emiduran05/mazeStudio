const pool = require("../config/db");

async function createUser({ firstName, lastName, email, passwordHash, role }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      INSERT INTO users (first_name, last_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, first_name, last_name, email, role, avatar_url, status, created_at
      `,
      [firstName, lastName, email, passwordHash, role]
    );

    const user = userResult.rows[0];

    await client.query(
      `
      INSERT INTO user_preferences (user_id)
      VALUES ($1)
      `,
      [user.id]
    );

    await client.query("COMMIT");

    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `
    SELECT 
      id, first_name, last_name, email, password_hash, role,
      avatar_url, avatar_object_key, status, deleted_at,
      scheduled_deletion_at, created_at
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  return result.rows[0];
}

async function findUserById(id, includePendingDeletion = false) {
  const result = await pool.query(
    `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.role,
      u.avatar_url,
      u.avatar_object_key,
      u.status,
      u.deleted_at,
      u.scheduled_deletion_at,
      u.created_at,
      u.updated_at,
      p.theme,
      p.language,
      p.timezone,
      p.notifications_enabled
    FROM users u
    LEFT JOIN user_preferences p ON p.user_id = u.id
    WHERE u.id = $1
      AND (
        u.status = 'ACTIVE'
        OR ($2 = true AND u.status = 'PENDING_DELETION')
      )
    `,
    [id, includePendingDeletion]
  );

  return result.rows[0];
}
module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};