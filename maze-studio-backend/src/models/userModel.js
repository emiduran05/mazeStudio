const pool = require("../config/db");

async function createUser({
  firstName,
  lastName,
  email,
  passwordHash,
  role,
  status = "ACTIVE",
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          first_name,
          last_name,
          email,
          role,
          status,
          stripe_customer_id,
          created_at,
          updated_at
      `,
      [
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        status,
      ]
    );

    const user = result.rows[0];

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
      id,
      first_name,
      last_name,
      email,
      password_hash,
      role,
      status,
      stripe_customer_id,
      avatar_url,
      created_at,
      updated_at
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  return result.rows[0];
}

async function findUserById(
  id,
  includeInactive = false
) {
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
    LEFT JOIN user_preferences p
      ON p.user_id = u.id
    WHERE u.id = $1
      AND (
        u.status = 'ACTIVE'
        OR (
          $2 = true
          AND u.status IN (
            'INACTIVE',
            'PENDING_DELETION'
          )
        )
      )
    `,
    [id, includeInactive]
  );

  return result.rows[0];
}
module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};