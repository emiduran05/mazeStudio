import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getLearnerJourney } from "../../../api/enrollmentApi";
import { getAssignedChallenges } from "../../../api/challengeApi";
import StepVisual from "./StepVisual";
import "./LearnerFlow.css";

export default function LearnerJourney() {
    const { journeyId } = useParams();
    const [journey, setJourney] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [challenges, setChallenges] = useState([]);

    const loadJourney = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [journeyData,challengeData]=await Promise.all([
                getLearnerJourney(journeyId),
                getAssignedChallenges(journeyId),
            ]);
            setJourney(journeyData);
            setChallenges(challengeData.challenges||[]);
        } catch (requestError) {
            setError(requestError.message || "Could not load this Journey.");
        } finally {
            setLoading(false);
        }
    }, [journeyId]);

    useEffect(() => {
        let active = true;

        Promise.all([
            getLearnerJourney(journeyId),
            getAssignedChallenges(journeyId),
        ])
            .then(([journeyData,challengeData]) => {
                if(!active)return;
                setJourney(journeyData);
                setChallenges(challengeData.challenges||[]);
            })
            .catch((requestError) => {
                if (active) {
                    setError(requestError.message || "Could not load this Journey.");
                }
            })
            .finally(() => active && setLoading(false));

        return () => {
            active = false;
        };
    }, [journeyId]);

    if (loading) {
        return <FlowState icon="fa-solid fa-spinner fa-spin" title="Loading Journey..." />;
    }

    if (error) {
        return (
            <FlowState icon="fa-solid fa-triangle-exclamation" title={error}>
                <button type="button" onClick={loadJourney}>Try again</button>
            </FlowState>
        );
    }

    return (
        <div className="learner_journey_page">
            <header className="learner_journey_hero">
                <div>
                    <span>By {journey.educatorName}</span>
                    <h2>{journey.title}</h2>
                    <p>{journey.description}</p>
                </div>
                <div className="learner_progress_ring">
                    <strong>{journey.progress}%</strong>
                    <span>{journey.completedSteps}/{journey.totalSteps} Steps</span>
                </div>
            </header>

            {journey.learningPath && (
                <Link
                    className="learner_path_portal"
                    to={`/learn/journeys/${journey.id}/path`}
                >
                    <div className="learner_path_portal_icon">
                        <i className="fa-regular fa-compass" />
                    </div>
                    <div>
                        <span className="student_section_kicker">
                            Your personalized experience
                        </span>
                        <h2>{journey.learningPath.title}</h2>
                        <p>
                            Open your interactive map, discover why each
                            milestone was chosen and define your destination.
                        </p>
                    </div>
                    <div className="learner_path_portal_progress">
                        <strong>
                            {journey.learningPath.completedSteps}/
                            {journey.learningPath.totalSteps}
                        </strong>
                        <span>milestones</span>
                    </div>
                    <span className="learner_path_portal_action">
                        Open my map
                        <i className="fa-solid fa-arrow-right" />
                    </span>
                </Link>
            )}

            {journey.nextStep && (
                <Link
                    className="learner_continue_button"
                    to={`/learn/journeys/${journey.id}/steps/${journey.nextStep.id}`}
                >
                    Continue: {journey.nextStep.title}
                    <i className="fa-solid fa-arrow-right" />
                </Link>
            )}

            {challenges.length > 0 && (
                <section className="learner_assigned_challenges">
                    <header>
                        <span className="student_section_kicker">
                            Assigned assessments
                        </span>
                        <h2>Your Challenges</h2>
                        <p>
                            These evaluations are separate from your Steps and
                            measure the topics selected by your educator.
                        </p>
                    </header>
                    <div className="learner_challenge_assignment_grid">
                        {challenges.map((challenge) => (
                            <article
                                className="learner_challenge_assignment"
                                key={challenge.id}
                            >
                                <div>
                                    <span className={`challenge_assignment_status ${(challenge.progress_status||"not_started").toLowerCase()}`}>
                                        {formatStatus(challenge.progress_status||"NOT_STARTED")}
                                    </span>
                                    <h3>{challenge.title}</h3>
                                    <p>{challenge.description}</p>
                                    {challenge.reviewed_steps?.length>0&&<small>
                                        Reviews: {challenge.reviewed_steps.map((step)=>step.title).join(" · ")}
                                    </small>}
                                </div>
                                <div className="challenge_assignment_meta">
                                    <span>{challenge.total_points} points</span>
                                    <span>Pass at {challenge.passing_percentage}%</span>
                                    {challenge.due_at&&<span>Due {new Date(challenge.due_at).toLocaleDateString()}</span>}
                                </div>
                                <Link className="learner_continue_button" to={`/learn/challenges/${challenge.id}`}>
                                    {challenge.attempt_count>0?"Continue Challenge":"Start Challenge"}
                                    <i className="fa-solid fa-arrow-right"/>
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <header className="learner_full_course_heading">
                <span className="student_section_kicker">Full course</span>
                <h2>Explore every Stage and Step</h2>
                <p>Your personalized path is a recommendation. All published course content remains available.</p>
            </header>

            <div className="learner_stage_list">
                {journey.stages.map((stage) => (
                    <StageCard
                        key={stage.id}
                        stage={stage}
                        journeyId={journey.id}
                    />
                ))}
            </div>
        </div>
    );
}

function StageCard({ stage, journeyId, nested = false }) {
    const hasContent =
        stage.steps.length > 0 ||
        stage.children.length > 0;

    return (
        <section
            className={[
                "learner_stage_card",
                nested ? "learner_substage_card" : "",
            ].filter(Boolean).join(" ")}
        >
            <header>
                <span className="student_section_kicker">
                    {nested ? "Substage" : "Stage"}
                </span>
                <h3>{stage.title}</h3>
                {stage.description && <p>{stage.description}</p>}
            </header>

            {!hasContent && (
                <p className="learner_stage_empty">
                    No published Steps yet.
                </p>
            )}

            {stage.steps.map((step) => (
                <StepRow
                    key={step.id}
                    step={step}
                    journeyId={journeyId}
                />
            ))}

            {stage.children.length > 0 && (
                <div className="learner_substage_list">
                    {stage.children.map((child) => (
                        <StageCard
                            key={child.id}
                            stage={child}
                            journeyId={journeyId}
                            nested
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function StepRow({ step, journeyId }) {
    const row = (
        <>
            <StepVisual step={step} compact />
            <span
                className={`learner_step_status ${step.progressStatus.toLowerCase()}`}
            >
                <i className={getStepIcon(step)} />
            </span>
            <span className="learner_step_identity">
                <strong>{step.title}</strong>
                <small>
                    {step.locked
                        ? "Locked"
                        : formatStatus(step.progressStatus)}
                </small>
            </span>
            {!step.locked && (
                <i className="fa-solid fa-chevron-right" />
            )}
        </>
    );

    return step.locked ? (
        <div className="learner_step_row locked">{row}</div>
    ) : (
        <Link
            className="learner_step_row"
            to={`/learn/journeys/${journeyId}/steps/${step.id}`}
        >
            {row}
        </Link>
    );
}

function FlowState({ icon, title, children }) {
    return (
        <section className="student_empty_state large">
            <div className="student_empty_icon"><i className={icon} /></div>
            <h2>{title}</h2>
            {children}
        </section>
    );
}

function getStepIcon(step) {
    if (step.locked) return "fa-solid fa-lock";
    if (step.progressStatus === "COMPLETED") return "fa-solid fa-check";
    if (step.progressStatus === "IN_PROGRESS") return "fa-solid fa-play";
    return "fa-regular fa-circle";
}

function formatStatus(status) {
    return status.toLowerCase().replaceAll("_", " ");
}
