const cron = require("node-cron");
const {
  permanentlyDeleteExpiredAccounts,
} = require("../services/accountCleanupService");

function startAccountCleanupJob() {
  cron.schedule(
    "0 3 * * *",
    async () => {
      console.log(
        "[Account Cleanup] Running..."
      );

      await permanentlyDeleteExpiredAccounts();
    },
    {
      timezone: "America/Mexico_City",
    }
  );
}

module.exports = {
  startAccountCleanupJob,
};