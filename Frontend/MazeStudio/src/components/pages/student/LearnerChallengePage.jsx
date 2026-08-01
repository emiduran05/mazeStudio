import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  getLearnerChallenge,
  submitLearnerChallenge,
} from "../../../api/challengeApi";
import ChallengeRunner from "./ChallengeRunner";
import "./LearnerFlow.css";

export default function LearnerChallengePage() {
  const { challengeId } = useParams();
  const location = useLocation();
  const [challenge, setChallenge] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getLearnerChallenge(challengeId)
      .then(setChallenge)
      .catch((error) => setMessage(error.message));
  }, [challengeId]);

  async function submit(answers) {
    setSubmitting(true);
    try {
      const data = await submitLearnerChallenge(challengeId, answers);
      setMessage(
        data.attempt.grading_status === "PENDING_REVIEW"
          ? "Submitted — pending teacher review."
          : `Attempt graded: ${data.attempt.percentage}%`
      );
      setChallenge(await getLearnerChallenge(challengeId));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!challenge) {
    return (
      <main className="learner_challenge_page">
        <div className="learner_challenge_loading">
          <i className="fa-solid fa-spinner fa-spin" />
          {message || "Loading Challenge…"}
        </div>
      </main>
    );
  }

  const attempts = challenge.attempts || [];
  const remaining =
    challenge.max_attempts == null
      ? "Unlimited"
      : Math.max(0, challenge.max_attempts - attempts.length);

  return (
    <main className="learner_challenge_page">
      <Link
        className="learner_challenge_back"
        to={location.state?.from || `/learn/journeys/${challenge.learning_journey_id}`}
      >
        <i className="fa-solid fa-arrow-left" />
        {location.state?.from ? "Back to Step" : "Back to Journey"}
      </Link>

      <header className="learner_challenge_hero">
        <div>
          <span className="learner_challenge_kicker">
            Assigned Challenge
          </span>
          <h1>{challenge.title}</h1>
          {challenge.description && <p>{challenge.description}</p>}
          {challenge.instructions && (
            <div className="learner_challenge_instructions">
              <i className="fa-regular fa-lightbulb" />
              <span>{challenge.instructions}</span>
            </div>
          )}
        </div>
        <div className="learner_challenge_meta">
          <div>
            <span>Total points</span>
            <strong>{challenge.total_points}</strong>
          </div>
          <div>
            <span>Passing score</span>
            <strong>{challenge.passing_percentage}%</strong>
          </div>
          <div>
            <span>Attempts left</span>
            <strong>{remaining}</strong>
          </div>
        </div>
      </header>

      {message && (
        <div className="learner_challenge_notice">
          <i className="fa-solid fa-circle-info" />
          {message}
        </div>
      )}

      <ChallengeRunner
        challenge={challenge}
        onSubmit={submit}
        submitting={submitting}
      />

      <section className="learner_attempt_history">
        <header>
          <div>
            <span className="learner_challenge_kicker">Progress</span>
            <h2>Attempt history</h2>
          </div>
          <span>{attempts.length} attempts</span>
        </header>

        {attempts.length === 0 ? (
          <p className="learner_attempt_empty">
            Your submitted attempts will appear here.
          </p>
        ) : (
          <div className="learner_attempt_list">
            {attempts.map((attempt) => (
              <article key={attempt.id}>
                <span className="learner_attempt_number">
                  #{attempt.attempt_number}
                </span>
                <div>
                  <strong>
                    {attempt.grading_status === "PENDING_REVIEW"
                      ? "Pending review"
                      : `${attempt.percentage}%`}
                  </strong>
                  <small>
                    {new Date(attempt.submitted_at).toLocaleString()}
                  </small>
                  {attempt.teacher_feedback && (
                    <p>{attempt.teacher_feedback}</p>
                  )}
                </div>
                <span
                  className={`learner_attempt_status ${
                    attempt.passed ? "passed" : ""
                  }`}
                >
                  {attempt.grading_status === "PENDING_REVIEW"
                    ? "Pending"
                    : attempt.passed
                      ? "Passed"
                      : "Not passed"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
