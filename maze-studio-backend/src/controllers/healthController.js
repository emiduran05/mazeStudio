const pool = require("../config/db");

async function checkHealth(req, res, next) {
  try {
    const result = await pool.query("SELECT NOW() AS time");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].time,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  checkHealth,
};