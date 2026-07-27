const { Storage } = require("@google-cloud/storage");
require("dotenv").config();


console.log("CWD:", process.cwd());
console.log("PROJECT:", process.env.GCS_PROJECT_ID);
console.log("BUCKET:", process.env.GCS_BUCKET_NAME);
console.log("KEY FILE:", process.env.GCS_KEY_FILE);

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GCS_KEY_FILE,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

module.exports = bucket;