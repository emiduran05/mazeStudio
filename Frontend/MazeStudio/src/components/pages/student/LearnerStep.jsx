import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    getLearnerStep,
    updateStepProgress,
} from "../../../api/enrollmentApi";
import ContentRenderer from "../../contentRenderer/ContentRenderer";
import StepVisual from "./StepVisual";
import "./LearnerFlow.css";

export default function LearnerStep() {
    const { journeyId, stepId } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [error, setError] = useState("");

    const loadStep = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            setStep(await getLearnerStep(journeyId, stepId));
        } catch (requestError) {
            setError(requestError.message || "Could not load this Step.");
        } finally {
            setLoading(false);
        }
    }, [journeyId, stepId]);

    useEffect(() => {
        let active = true;

        getLearnerStep(journeyId, stepId)
            .then((data) => active && setStep(data))
            .catch((requestError) => {
                if (active) {
                    setError(requestError.message || "Could not load this Step.");
                }
            })
            .finally(() => active && setLoading(false));

        return () => {
            active = false;
        };
    }, [journeyId, stepId]);

    async function completeStep() {
        setCompleting(true);
        setError("");

        try {
            await updateStepProgress(step.id, "COMPLETED");

            if (step.nextStep) {
                navigate(`/learn/journeys/${journeyId}/steps/${step.nextStep.id}`);
            } else {
                navigate(`/learn/journeys/${journeyId}`);
            }
        } catch (requestError) {
            setError(requestError.message || "Could not complete this Step.");
            setCompleting(false);
        }
    }

    if (loading) {
        return <StepState icon="fa-solid fa-spinner fa-spin" title="Loading Step..." />;
    }

    if (error && !step) {
        return (
            <StepState icon="fa-solid fa-triangle-exclamation" title={error}>
                <button type="button" onClick={loadStep}>Try again</button>
            </StepState>
        );
    }

    const incompleteRequiredChallenge = (step.content?.blocks || []).some(
        (block) =>
            block.block_type === "CHALLENGE" &&
            block.settings?.required !== false &&
            (block.settings?.completionRule === "PASSED"
                ? block.content?.progressStatus !== "PASSED"
                : block.content?.progressStatus === "NOT_STARTED")
    );

    return (
        <article className="learner_step_page">
            <nav className="learner_breadcrumb">
                <Link to="/my-learning">My Learning</Link>
                <i className="fa-solid fa-chevron-right" />
                <Link to={`/learn/journeys/${journeyId}`}>Journey</Link>
                <i className="fa-solid fa-chevron-right" />
                <span>{step.title}</span>
            </nav>

            <header className="learner_step_hero">
                <StepVisual step={step} />
                <div>
                    <span className="student_section_kicker">{step.stageTitle}</span>
                    <h1>{step.title}</h1>
                    {step.description && <p>{step.description}</p>}
                </div>
                <Link className="learner_present_step" to={`/learn/journeys/${journeyId}/steps/${stepId}/present`}><i className="fa-solid fa-display"/> Present</Link>
            </header>

            <section className="learner_step_content">
                <ContentRenderer
                    blocks={step.content?.blocks || []}
                />
            </section>

            {error && <p className="learner_inline_error">{error}</p>}

            <footer className="learner_step_footer">
                <div>
                    {step.previousStep && (
                        <Link
                            to={`/learn/journeys/${journeyId}/steps/${step.previousStep.id}`}
                        >
                            <i className="fa-solid fa-arrow-left" />
                            Previous Step
                        </Link>
                    )}
                </div>
                <button type="button" onClick={completeStep} disabled={completing || incompleteRequiredChallenge} title={incompleteRequiredChallenge ? "Complete the required Challenge first" : ""}>
                    {completing ? "Completing..." : incompleteRequiredChallenge ? "Challenge required" : "Complete Step"}
                    <i className={`fa-solid ${incompleteRequiredChallenge ? "fa-lock" : "fa-check"}`} />
                </button>
            </footer>
        </article>
    );
}

function StepState({ icon, title, children }) {
    return (
        <section className="student_empty_state large">
            <div className="student_empty_icon"><i className={icon} /></div>
            <h2>{title}</h2>
            {children}
        </section>
    );
}
