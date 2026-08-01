const test = require("node:test");
const assert = require("node:assert/strict");
const { createToken, hashToken, safeEqualHash } = require("../src/services/privateTokenService");

test("private tokens contain at least 32 random bytes and only hashes are comparable", () => {
  const token = createToken();
  assert.ok(Buffer.from(token, "base64url").length >= 32);
  const hash = hashToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(safeEqualHash(token, hash), true);
  assert.equal(safeEqualHash(`${token}x`, hash), false);
});
