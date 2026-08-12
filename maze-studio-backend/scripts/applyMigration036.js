const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, "../database/036_teaching_memory.sql"),
    "utf8"
  );
  await pool.query(sql);
  console.log("Migration 036 applied: teaching memory and session history are ready.");
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
