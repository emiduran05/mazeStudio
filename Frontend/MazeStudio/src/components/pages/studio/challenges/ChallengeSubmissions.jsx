import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import {
  createPrivateLink,
  getChallenge,
  getAssignableLearners,
  getPrivateLinks,
  getSubmissions,
  revokePrivateLink,
} from "../../../../api/challengeApi";
import "./Challenges.css";
import JourneyWorkspaceNav from "../journeyBuilder/components/JourneyWorkspaceNav";
import "../journeyBuilder/JourneyBuilder.css";

const EMPTY_LINK = {
  label: "",
  expiresAt: "",
  maxUses: "",
  allowedEmail: "",
  accessCode: "",
  maxAttemptsOverride: "",
  targetEnrollmentId: "",
};

export default function ChallengeSubmissions() {
  const { challengeId } = useParams();
  const [attempts, setAttempts] = useState([]);
  const [links, setLinks] = useState([]);
  const [message, setMessage] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [linkForm, setLinkForm] = useState(EMPTY_LINK);
  const [journeyId, setJourneyId] = useState("");
  const [learners, setLearners] = useState([]);

  async function load() {
    const [attemptData, linkData] = await Promise.all([
      getSubmissions(challengeId),
      getPrivateLinks(challengeId),
    ]);
    setAttempts(attemptData.attempts || []);
    setLinks(linkData.links || []);
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      getSubmissions(challengeId),
      getPrivateLinks(challengeId),
      getChallenge(challengeId),
      getAssignableLearners(challengeId),
    ])
      .then(([attemptData, linkData, challengeData, learnerData]) => {
        if (!active) return;
        setAttempts(attemptData.attempts || []);
        setLinks(linkData.links || []);
        setJourneyId(challengeData.learning_journey_id);
        setLearners(learnerData.learners || []);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });

    return () => {
      active = false;
    };
  }, [challengeId]);

  function updateLinkField(field, value) {
    setLinkForm((current) => ({ ...current, [field]: value }));
  }

  async function createLink(event) {
    event.preventDefault();
    setMessage("");
    try {
      const link = await createPrivateLink(challengeId, {
        ...linkForm,
        expiresAt: linkForm.expiresAt || null,
        maxUses: linkForm.maxUses ? Number(linkForm.maxUses) : null,
        allowedEmail: linkForm.allowedEmail || null,
        accessCode: linkForm.accessCode || null,
        maxAttemptsOverride: linkForm.maxAttemptsOverride
          ? Number(linkForm.maxAttemptsOverride)
          : null,
        collectGuestName: !linkForm.targetEnrollmentId,
        collectGuestEmail: !linkForm.targetEnrollmentId,
      });
      setLinks((current) => [link, ...current]);
      setCreatedUrl(
        `${window.location.origin}/challenge/private/${link.token}`
      );
      setLinkForm(EMPTY_LINK);
      setMessage(
        "Private link created. Copy it now; its raw token is shown only once."
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(createdUrl);
    setMessage("Private link copied.");
  }

  async function revoke(linkId) {
    try {
      await revokePrivateLink(linkId);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <StudioLayout>
      <main className="challenge-page">
        {journeyId && (
          <JourneyWorkspaceNav
            journeyId={journeyId}
            active="CHALLENGES"
          />
        )}
        <header className="challenge-head">
          <div>
            <h1>Submissions & private links</h1>
            <p className="challenge-muted">
              Review learners or invite someone without an account.
            </p>
          </div>
          <Link to={`/studio/challenges/${challengeId}/edit`}>
            Edit Challenge
          </Link>
        </header>

        {message && <div className="challenge-admin-notice"><i className="fa-solid fa-circle-info" />{message}</div>}

        <section className="challenge-panel private-link-panel">
          <h2>Send a private Challenge</h2>
          <p className="challenge-muted">
            Publish the Challenge first, generate a URL and send it to
            the learner.
          </p>
          <form className="private-link-form" onSubmit={createLink}>
            <div className="challenge-grid">
              <label className="private-link-recipient">
                Recipient
                <select
                  value={linkForm.targetEnrollmentId}
                  onChange={(event) =>
                    updateLinkField("targetEnrollmentId", event.target.value)
                  }
                >
                  <option value="">Generic guest link</option>
                  {learners
                    .filter((learner) => !learner.learner_user_id)
                    .map((learner) => (
                      <option
                        key={learner.enrollment_id}
                        value={learner.enrollment_id}
                      >
                        {[learner.first_name, learner.last_name]
                          .filter(Boolean)
                          .join(" ") ||
                          learner.email ||
                          "Managed Student"}
                      </option>
                    ))}
                </select>
                <small>
                  Targeted attempts become part of this Student’s permanent progress.
                </small>
              </label>
              <label>
                Label
                <input
                  value={linkForm.label}
                  onChange={(event) =>
                    updateLinkField("label", event.target.value)
                  }
                  placeholder="July cohort"
                />
              </label>
              <label>
                Expires
                <input
                  type="datetime-local"
                  value={linkForm.expiresAt}
                  onChange={(event) =>
                    updateLinkField("expiresAt", event.target.value)
                  }
                />
              </label>
              <label>
                Maximum uses
                <input
                  type="number"
                  min="1"
                  value={linkForm.maxUses}
                  onChange={(event) =>
                    updateLinkField("maxUses", event.target.value)
                  }
                />
              </label>
              <label>
                Allowed email
                <input
                  type="email"
                  value={linkForm.allowedEmail}
                  onChange={(event) =>
                    updateLinkField("allowedEmail", event.target.value)
                  }
                  placeholder="Optional"
                />
              </label>
              <label>
                Access code
                <input
                  value={linkForm.accessCode}
                  onChange={(event) =>
                    updateLinkField("accessCode", event.target.value)
                  }
                  placeholder="Optional"
                />
              </label>
              <label>
                Guest attempt limit
                <input
                  type="number"
                  min="1"
                  value={linkForm.maxAttemptsOverride}
                  onChange={(event) =>
                    updateLinkField(
                      "maxAttemptsOverride",
                      event.target.value
                    )
                  }
                />
              </label>
            </div>
            <button type="submit"><i className="fa-solid fa-wand-magic-sparkles" /> Generate private link</button>
          </form>

          {createdUrl && (
            <div className="challenge-card private-link-created">
              <strong>Copy this link now</strong>
              <div className="challenge-row">
                <input value={createdUrl} readOnly />
                <button type="button" onClick={copyLink}>
                  Copy
                </button>
              </div>
            </div>
          )}

          <h3>Existing links</h3>
          {links.length === 0 && (
            <p className="challenge-muted">No private links yet.</p>
          )}
          {links.map((link) => (
            <div className="challenge-row challenge-question" key={link.id}>
              <span>
                {link.label || "Private link"} · {link.status} ·{" "}
                {link.use_count} uses
                {link.target_enrollment_id
                  ? ` · for ${[
                      link.target_first_name,
                      link.target_last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}`
                  : " · generic"}
                {link.expires_at
                  ? ` · expires ${new Date(
                      link.expires_at
                    ).toLocaleString()}`
                  : ""}
              </span>
              {link.status === "ACTIVE" && (
                <button type="button" onClick={() => revoke(link.id)}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </section>

        <section className="challenge-panel challenge-attempts-panel">
          <h2>Attempts</h2>
          {attempts.length === 0 && (
            <p className="challenge-muted">No attempts yet.</p>
          )}
          {attempts.map((attempt) => (
            <div className="challenge-row challenge-question" key={attempt.id}>
              <span>
                {[attempt.first_name, attempt.last_name]
                  .filter(Boolean)
                  .join(" ") || "Guest"}{" "}
                · Attempt {attempt.attempt_number} ·{" "}
                {attempt.grading_status} · {attempt.percentage ?? "—"}%
              </span>
              <Link
                to={`/studio/challenge-attempts/${attempt.id}/review`}
              >
                Review
              </Link>
            </div>
          ))}
        </section>
      </main>
    </StudioLayout>
  );
}
