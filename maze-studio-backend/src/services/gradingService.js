function normalizeText(value, config = {}) {
  let normalized = String(value ?? "").trim().replace(/\s+/g, " ");
  if (config.caseSensitive !== true) normalized = normalized.toLowerCase();
  if (config.ignoreDiacritics === true) {
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  return normalized;
}

function gradeQuestion(question, answerKey, answer) {
  const maxPoints = Number(question.points || 0);
  const type = question.question_type;

  if (type === "SINGLE_CHOICE" || type === "TRUE_FALSE") {
    const selected = answer?.selectedOptionIds?.[0] ?? answer?.value ?? null;
    const correct = selected === answerKey.correctOptionId;
    return { correct, points: correct ? maxPoints : 0, maxPoints, manual: false };
  }

  if (type === "MULTIPLE_CHOICE") {
    const selected = new Set(answer?.selectedOptionIds || []);
    const expected = new Set(answerKey.correctOptionIds || []);
    const correct =
      selected.size === expected.size &&
      [...selected].every((value) => expected.has(value));
    return { correct, points: correct ? maxPoints : 0, maxPoints, manual: false };
  }

  if (type === "FILL_BLANK") {
    const received = normalizeText(answer?.text ?? answer?.value, answerKey.normalization);
    const accepted = (answerKey.acceptedAnswers || []).map((value) =>
      normalizeText(value, answerKey.normalization)
    );
    const correct = accepted.includes(received);
    return { correct, points: correct ? maxPoints : 0, maxPoints, manual: false };
  }

  return { correct: null, points: null, maxPoints, manual: true };
}

function gradeAnswers(questions, submittedAnswers = {}) {
  let automaticScore = 0;
  let hasManual = false;
  const answers = questions.map((question) => {
    const submitted = submittedAnswers[question.id] ?? {};
    const result = gradeQuestion(
      question,
      question.answer_key_json || {},
      submitted
    );
    if (result.manual) hasManual = true;
    else automaticScore += result.points;
    return { question, submitted, ...result };
  });
  return { answers, automaticScore, hasManual };
}

module.exports = { normalizeText, gradeQuestion, gradeAnswers };
