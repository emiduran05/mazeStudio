import { useEffect, useState } from "react";
import {
    getLearnerChallenge,
    submitLearnerChallenge,
} from "../../../api/challengeApi";
import ChallengeRunner from "./ChallengeRunner";

export default function LearnerChallenge({ challenge: summary }) {
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let active = true;

        getLearnerChallenge(summary.id)
            .then((data) => {
                if (active) setChallenge(data);
            })
            .catch((error) => {
                if (active) setMessage(error.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [summary.id]);

    async function submit(answers) {
        setSubmitting(true);
        setMessage("");

        try {
            const data = await submitLearnerChallenge(
                summary.id,
                answers
            );
            setMessage(
                data.attempt.grading_status === "PENDING_REVIEW"
                    ? "Submitted. This attempt is pending teacher review."
                    : `Attempt graded: ${Number(
                          data.attempt.percentage
                      ).toFixed(1)}%`
            );
            setChallenge(await getLearnerChallenge(summary.id));
        } catch (error) {
            setMessage(error.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="learner_challenge_card">Loading Challenge…</div>;
    }

    if (!challenge) {
        return <div className="learner_challenge_card learner_inline_error">{message}</div>;
    }

    const attempts = challenge.attempts || [];
    const remaining =
        challenge.max_attempts == null
            ? "Unlimited"
            : Math.max(0, challenge.max_attempts - attempts.length);
    const canAttempt =
        challenge.max_attempts == null ||
        attempts.length < challenge.max_attempts;

    return (
        <article className="learner_challenge_card">
            <header>
                <span className="student_section_kicker">Graded Challenge</span>
                <h2>{challenge.title}</h2>
                {challenge.description && <p>{challenge.description}</p>}
                {challenge.instructions && <p>{challenge.instructions}</p>}
                <small>
                    {challenge.total_points} points · Pass at{" "}
                    {challenge.passing_percentage}% · Attempts remaining:{" "}
                    {remaining}
                </small>
            </header>

            {canAttempt ? (
                <ChallengeRunner
                    challenge={challenge}
                    onSubmit={submit}
                    submitting={submitting}
                />
            ) : (
                <p>Maximum attempts reached.</p>
            )}

            {message && <p>{message}</p>}

            {attempts.length > 0 && (
                <details>
                    <summary>Attempt history ({attempts.length})</summary>
                    {attempts.map((attempt) => (
                        <p key={attempt.id}>
                            Attempt {attempt.attempt_number}:{" "}
                            {attempt.grading_status === "PENDING_REVIEW"
                                ? "Pending review"
                                : `${attempt.percentage}%`}
                            {attempt.teacher_feedback
                                ? ` — ${attempt.teacher_feedback}`
                                : ""}
                        </p>
                    ))}
                </details>
            )}
        </article>
    );
}
