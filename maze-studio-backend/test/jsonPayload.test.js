const test = require("node:test");
const assert = require("node:assert/strict");
const { parseJsonPayload } = require("../src/utils/jsonPayload");

test("parses clean and fenced AI JSON", () => {
  assert.equal(parseJsonPayload('{"blocks":[]}').blocks.length, 0);
  assert.equal(parseJsonPayload('```json\n{"text":"hello"}\n```').text, "hello");
});

test("extracts the intended object when AI adds surrounding or trailing output", () => {
  const value = parseJsonPayload('Result:\n{"ignored":true}\n{"blocks":[{"blockType":"TEXT"}]} trailing', "response", item => Array.isArray(item?.blocks));
  assert.equal(value.blocks[0].blockType, "TEXT");
});

test("returns a useful upstream error instead of a JSON parser implementation message", () => {
  assert.throws(() => parseJsonPayload("not json", "Block content"), /Block content was not valid JSON/);
});
