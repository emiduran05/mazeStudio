const pool = require("../config/db");
const bucket = require("../config/gcs");

async function permanentlyDeleteExpiredAccounts() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: users } = await client.query(
      `
      SELECT
        id,
        avatar_object_key
      FROM users
      WHERE status = 'PENDING_DELETION'
        AND scheduled_deletion_at <= NOW()
      `
    );

    for (const user of users) {
      if (user.avatar_object_key) {
        try {
          await bucket
            .file(user.avatar_object_key)
            .delete({
              ignoreNotFound: true,
            });
        } catch (err) {
          console.error(
            "Error deleting avatar:",
            err.message
          );
        }
      }
    }

    await client.query(
      `
      UPDATE users
      SET
        first_name = 'Deleted',
        last_name = 'User',
        email = CONCAT('deleted_', id, '@deleted.local'),
        password_hash = NULL,
        avatar_url = NULL,
        avatar_object_key = NULL,
        status = 'DELETED',
        deletion_reason = NULL,
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE status = 'PENDING_DELETION'
        AND scheduled_deletion_at <= NOW()
      `
    );

    await client.query("COMMIT");

    console.log(
      `[Account Cleanup] Processed ${users.length} accounts`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(
      "[Account Cleanup]",
      err
    );
  } finally {
    client.release();
  }
}

module.exports = {
  permanentlyDeleteExpiredAccounts,
};