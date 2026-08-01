const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeText, gradeQuestion } = require("../src/services/gradingService");

test("normalizes whitespace, case and optionally accents", () => {
  assert.equal(normalizeText("  ÁRBOL   Azul ", { ignoreDiacritics: true }), "arbol azul");
  assert.equal(normalizeText("Maze", { caseSensitive: true }), "Maze");
});

test("grades single choice and true/false on the server", () => {
  const question = { question_type: "SINGLE_CHOICE", points: 5 };
  assert.equal(gradeQuestion(question, { correctOptionId: "b" }, { selectedOptionIds: ["b"] }).points, 5);
  assert.equal(gradeQuestion(question, { correctOptionId: "b" }, { selectedOptionIds: ["a"] }).points, 0);
});

test("multiple choice requires an exact set", () => {
  const question = { question_type: "MULTIPLE_CHOICE", points: 4 };
  const key = { correctOptionIds: ["a", "c"] };
  assert.equal(gradeQuestion(question, key, { selectedOptionIds: ["c", "a"] }).points, 4);
  assert.equal(gradeQuestion(question, key, { selectedOptionIds: ["a"] }).points, 0);
  assert.equal(gradeQuestion(question, key, { selectedOptionIds: ["a", "b", "c"] }).points, 0);
});

test("fill blank uses configured normalization", () => {
  const question = { question_type: "FILL_BLANK", points: 3 };
  const key = { acceptedAnswers: ["México City"], normalization: { ignoreDiacritics: true } };
  assert.equal(gradeQuestion(question, key, { text: " mexico   city " }).points, 3);
});

test("manual question types never receive an automatic score", () => {
  const result = gradeQuestion({ question_type: "LONG_ANSWER", points: 10 }, {}, { text: "answer" });
  assert.equal(result.manual, true);
  assert.equal(result.points, null);
});
