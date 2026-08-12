const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, "../database/032_challenge_builder_block_types.sql"),
    "utf8"
  );
  await pool.query(sql);
  const result = await pool.query(
    "SELECT pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conname=$1",
    ["challenge_builder_blocks_block_type_check"]
  );
  console.log(result.rows[0]?.definition || "constraint missing");
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
