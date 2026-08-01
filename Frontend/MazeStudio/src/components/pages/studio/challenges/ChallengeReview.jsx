import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import {
  getSubmission,
  reviewSubmission,
} from "../../../../api/challengeApi";
import "./Challenges.css";

const MANUAL_TYPES = new Set([
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "FILE_UPLOAD",
]);

function optionText(answer, optionId) {
  return (
    (answer.options_json || []).find(
      (option) => option.id === optionId
    )?.text || "Unknown option"
  );
}

function readableAnswer(answer) {
  const value = answer.answer_json || {};

  if (
    answer.question_type === "SINGLE_CHOICE" ||
    answer.question_type === "MULTIPLE_CHOICE"
  ) {
    const selected = value.selectedOptionIds || [];
    return selected.length
      ? selected.map((id) => optionText(answer, id)).join(", ")
      : "No option selected";
  }

  if (answer.question_type === "TRUE_FALSE") {
    if (value.value === true) return "True";
    if (value.value === false) return "False";
    return "No answer";
  }

  if (answer.question_type === "FILE_UPLOAD") {
    return value.name || value.originalName || "No file submitted";
  }

  return value.text || value.value || "No answer";
}

function readableCorrectAnswer(answer) {
  const key = answer.answer_key_json || {};

  if (answer.question_type === "SINGLE_CHOICE") {
    return optionText(answer, key.correctOptionId);
  }

  if (answer.question_type === "MULTIPLE_CHOICE") {
    return (key.correctOptionIds || [])
      .map((id) => optionText(answer, id))
      .join(", ");
  }

  if (answer.question_type === "TRUE_FALSE") {
    return key.correctOptionId === true ? "True" : "False";
  }

  if (answer.question_type === "FILL_BLANK") {
    return (key.acceptedAnswers || []).join(", ");
  }

  return null;
}

export default function ChallengeReview() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [scores, setScores] = useState({});
  const [answerFeedback, setAnswerFeedback] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    getSubmission(attemptId)
      .then((data) => {
        if (!active) return;
        setAttempt(data);
        setFeedback(data.teacher_feedback || "");
        setScores(
          Object.fromEntries(
            (data.answers || []).map((answer) => [
              answer.question_id,
              answer.final_points_awarded ?? 0,
            ])
          )
        );
        setAnswerFeedback(
          Object.fromEntries(
            (data.answers || []).map((answer) => [
              answer.question_id,
              answer.grader_feedback || "",
            ])
          )
        );
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });

    return () => {
      active = false;
    };
  }, [attemptId]);

  const awarded = useMemo(
    () =>
      Object.values(scores).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      ),
    [scores]
  );

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const updated = await reviewSubmission(attemptId, {
        feedback,
        answers: attempt.answers.map((answer) => ({
          questionId: answer.question_id,
          points: Number(scores[answer.question_id] || 0),
          feedback: answerFeedback[answer.question_id] || null,
        })),
      });
      setAttempt((current) => ({ ...current, ...updated }));
      setMessage("Review saved successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (!attempt) {
    return (
      <StudioLayout>
        <main className="challenge-page challenge-review-page">
          <div className="challenge-review-loading">
            <i className="fa-solid fa-spinner fa-spin" />
            {message || "Loading attempt…"}
          </div>
        </main>
      </StudioLayout>
    );
  }

  const learnerName =
    [attempt.first_name, attempt.last_name].filter(Boolean).join(" ") ||
    attempt.email ||
    "Guest learner";

  return (
    <StudioLayout>
      <main className="challenge-page challenge-review-page">
        <nav className="challenge-review-breadcrumb">
          <Link
            to={`/studio/challenges/${attempt.challenge_id}/submissions`}
          >
            <i className="fa-solid fa-arrow-left" />
            Back to submissions
          </Link>
        </nav>

        <header className="challenge-review-header">
          <div>
            <span className="challenge-review-kicker">
              Attempt {attempt.attempt_number}
            </span>
            <h1>Review submission</h1>
            <p>
              {learnerName} · Submitted{" "}
              {new Date(attempt.submitted_at).toLocaleString()}
            </p>
          </div>
          <span
            className={`challenge-review-status ${attempt.grading_status.toLowerCase()}`}
          >
            {attempt.grading_status.replaceAll("_", " ")}
          </span>
        </header>

        <section className="challenge-review-summary">
          <div>
            <span>Current score</span>
            <strong>
              {awarded.toFixed(2)} / {Number(attempt.max_score).toFixed(2)}
            </strong>
          </div>
          <div>
            <span>Percentage</span>
            <strong>
              {attempt.max_score
                ? ((awarded / Number(attempt.max_score)) * 100).toFixed(1)
                : "0.0"}
              %
            </strong>
          </div>
          <div>
            <span>Questions</span>
            <strong>{attempt.answers.length}</strong>
          </div>
        </section>

        <div className="challenge-review-layout">
          <section className="challenge-review-questions">
            <header>
              <span className="challenge-review-kicker">
                Learner responses
              </span>
              <h2>Questions</h2>
            </header>

            {attempt.answers.map((answer, index) => {
              const correctAnswer = readableCorrectAnswer(answer);
              const manual = MANUAL_TYPES.has(answer.question_type);
              const correct = answer.auto_is_correct === true;

              return (
                <article
                  className="challenge-review-question"
                  key={answer.id}
                >
                  <header>
                    <span className="challenge-review-number">
                      {index + 1}
                    </span>
                    <div>
                      <span>{answer.question_type.replaceAll("_", " ")}</span>
                      <h3>
                        {answer.prompt_json?.text || "Untitled question"}
                      </h3>
                    </div>
                    <span
                      className={[
                        "challenge-answer-result",
                        manual
                          ? "manual"
                          : correct
                            ? "correct"
                            : "incorrect",
                      ].join(" ")}
                    >
                      <i
                        className={`fa-solid ${
                          manual
                            ? "fa-user-pen"
                            : correct
                              ? "fa-check"
                              : "fa-xmark"
                        }`}
                      />
                      {manual
                        ? "Manual review"
                        : correct
                          ? "Correct"
                          : "Incorrect"}
                    </span>
                  </header>

                  <div className="challenge-answer-comparison">
                    <div>
                      <span>Learner answer</span>
                      <strong>{readableAnswer(answer)}</strong>
                    </div>
                    {correctAnswer && (
                      <div>
                        <span>Correct answer</span>
                        <strong>{correctAnswer}</strong>
                      </div>
                    )}
                  </div>

                  <div className="challenge-review-grade-row">
                    <label>
                      Points awarded
                      <div className="challenge-points-input">
                        <input
                          type="number"
                          min="0"
                          max={answer.points}
                          step="0.01"
                          value={scores[answer.question_id]}
                          onChange={(event) =>
                            setScores((current) => ({
                              ...current,
                              [answer.question_id]: event.target.value,
                            }))
                          }
                        />
                        <span>/ {Number(answer.points).toFixed(2)}</span>
                      </div>
                    </label>
                    <label>
                      Question feedback
                      <input
                        value={
                          answerFeedback[answer.question_id] || ""
                        }
                        onChange={(event) =>
                          setAnswerFeedback((current) => ({
                            ...current,
                            [answer.question_id]: event.target.value,
                          }))
                        }
                        placeholder="Optional feedback for this answer"
                      />
                    </label>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="challenge-review-sidebar">
            <div className="challenge-card">
              <span className="challenge-review-kicker">
                Final feedback
              </span>
              <h2>Message to learner</h2>
              <textarea
                rows={7}
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Summarize what went well and what to improve…"
              />
              <button type="button" onClick={save} disabled={saving}>
                <i
                  className={`fa-solid ${
                    saving ? "fa-spinner fa-spin" : "fa-check"
                  }`}
                />
                {saving ? "Saving…" : "Save review"}
              </button>
              {message && (
                <p
                  className={
                    message.includes("successfully")
                      ? "challenge-success"
                      : "challenge-error"
                  }
                >
                  {message}
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </StudioLayout>
  );
}
