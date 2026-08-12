import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPrivateAttempt,
  getPrivateChallenge,
  startPrivateSession,
  submitPrivateChallenge,
  uploadPrivateSpeakingResponse,
} from "../../../api/challengeApi";
import ChallengeRunner from "./ChallengeRunner";
import "./LearnerFlow.css";

export default function PrivateChallenge() {
  const { token } = useParams();
  const storageKey = `challenge-session:${token}`;
  const [meta, setMeta] = useState(null);
  const [session, setSession] = useState(() =>
    sessionStorage.getItem(storageKey)
  );
  const [challenge, setChallenge] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    accessCode: "",
  });
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("darkmode") === "true"
  );

  useEffect(() => {
    localStorage.setItem("darkmode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    getPrivateChallenge(token)
      .then(setMeta)
      .catch((error) => setMessage(error.message));
  }, [token]);

  async function begin(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const data = await startPrivateSession(token, form);
      sessionStorage.setItem(storageKey, data.sessionToken);
      setSession(data.sessionToken);
      setChallenge(data.challenge);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(answers) {
    setSubmitting(true);
    setMessage("");
    try {
      const data = await submitPrivateChallenge(token, {
        sessionToken: session,
        answers,
      });
      sessionStorage.setItem(
        `${storageKey}:attempt`,
        data.attemptToken
      );
      setResult(
        await getPrivateAttempt(
          token,
          data.attemptToken,
          session
        )
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`private_challenge_page ${darkMode ? "private_dark" : ""}`}>
      <header className="private_challenge_brand">
        <div className="private_challenge_logo">
          <i className="fa-solid fa-route" />
        </div>
        <strong>Maze Studio</strong>
        <span>Private Challenge</span>
        <button
          type="button"
          className="private_challenge_theme"
          onClick={() => setDarkMode((current) => !current)}
          aria-label={darkMode ? "Activate light mode" : "Activate dark mode"}
          title={darkMode ? "Activate light mode" : "Activate dark mode"}
        >
          <i className={`fa-solid ${darkMode ? "fa-sun" : "fa-moon"}`} />
        </button>
      </header>

      {message && (
        <div className="private_challenge_notice">
          <i className="fa-solid fa-circle-exclamation" />
          {message}
        </div>
      )}

      {meta && !session && (
        <section className="private_challenge_access">
          <div className="private_challenge_access_intro">
            <span className="learner_challenge_kicker">
              You have been invited
            </span>
            <h1>{meta.title}</h1>
            {meta.description && <p>{meta.description}</p>}
            <div className="private_challenge_security">
              <i className="fa-solid fa-shield-halved" />
              <span>
                Your access is private and your answers are shared only
                with the educator.
              </span>
            </div>
          </div>

          <form onSubmit={begin}>
            <h2>Before you begin</h2>
            <p>
              {meta.targeted
                ? `This Challenge is assigned to ${meta.learnerName}. Your attempt will be saved to that academic profile.`
                : "Enter the requested information to open the Challenge."}
            </p>
            {meta.collectGuestName && (
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Your name"
                  required
                />
              </label>
            )}
            {meta.collectGuestEmail && (
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="you@example.com"
                  required={meta.requiresEmail}
                />
              </label>
            )}
            {meta.requiresAccessCode && (
              <label>
                Access code
                <input
                  type="password"
                  value={form.accessCode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      accessCode: event.target.value,
                    })
                  }
                  placeholder="Enter your access code"
                  required
                />
              </label>
            )}
            <button disabled={submitting}>
              {submitting ? "Opening…" : "Open Challenge"}
              <i className="fa-solid fa-arrow-right" />
            </button>
          </form>
        </section>
      )}

      {challenge && !result && (
        <section className="private_challenge_runner">
          <header className="learner_challenge_hero">
            <div>
              <span className="learner_challenge_kicker">
                Private assessment
              </span>
              <h1>{challenge.title}</h1>
              {challenge.instructions && (
                <p>{challenge.instructions}</p>
              )}
            </div>
          </header>
          <ChallengeRunner
            challenge={challenge}
            onSubmit={submit}
            submitting={submitting}
            uploadSpeaking={(file) => uploadPrivateSpeakingResponse(token, session, file)}
          />
        </section>
      )}

      {result && (
        <section className="private_challenge_result">
          <div
            className={`private_result_icon ${
              result.passed ? "passed" : ""
            }`}
          >
            <i
              className={`fa-solid ${
                result.grading_status === "PENDING_REVIEW"
                  ? "fa-clock"
                  : result.passed
                    ? "fa-check"
                    : "fa-flag-checkered"
              }`}
            />
          </div>
          <span className="learner_challenge_kicker">
            Attempt received
          </span>
          <h1>Thank you for completing the Challenge</h1>
          <p>
            {result.grading_status === "PENDING_REVIEW"
              ? "Your answers were submitted and are pending educator review."
              : `Your score is ${result.percentage}%.`}
          </p>
          {result.teacher_feedback && (
            <div className="private_result_feedback">
              <strong>Educator feedback</strong>
              <p>{result.teacher_feedback}</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
