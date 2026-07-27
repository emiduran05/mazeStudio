require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 3000;

const {
  startAccountCleanupJob,
} = require("./jobs/accountCleanupJob");

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    startAccountCleanupJob();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();