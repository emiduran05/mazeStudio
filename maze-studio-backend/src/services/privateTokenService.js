const crypto = require("crypto");

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function safeEqualHash(rawValue, expectedHash) {
  const actual = Buffer.from(hashToken(rawValue), "hex");
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { createToken, hashToken, safeEqualHash };
