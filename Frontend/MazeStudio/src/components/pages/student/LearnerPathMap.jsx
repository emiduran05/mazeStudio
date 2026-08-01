import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    getLearnerJourney,
    updateLearningPathGoal,
} from "../../../api/enrollmentApi";
import StepVisual from "./StepVisual";
import "./LearnerPathMap.css";

export default function LearnerPathMap() {
    const { journeyId } = useParams();
    const [journey, setJourney] = useState(null);
    const [goal, setGoal] = useState("");
    const [editingGoal, setEditingGoal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        getLearnerJourney(journeyId)
            .then((data) => {
                if (!active) return;
                setJourney(data);
                setGoal(data.learningPath?.learnerGoal || "");
            })
            .catch((requestError) => setError(requestError.message))
            .finally(() => active && setSaving(false));
        return () => { active = false; };
    }, [journeyId]);

    async function saveGoal(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const data = await updateLearningPathGoal(journeyId, goal);
            setGoal(data.goal);
            setJourney((current) => ({
                ...current,
                learningPath: {
                    ...current.learningPath,
                    learnerGoal: data.goal,
                },
            }));
            setEditingGoal(false);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    }

    if (!journey && !error) {
        return <div className="learner_path_map_state"><i className="fa-solid fa-spinner fa-spin" />Preparing your map…</div>;
    }

    if (error && !journey) {
        return <div className="learner_path_map_state error"><i className="fa-solid fa-triangle-exclamation" />{error}</div>;
    }

    if (!journey.learningPath) {
        return (
            <section className="learner_path_map_state">
                <i className="fa-solid fa-map" />
                <h2>No personalized path yet</h2>
                <p>Your educator has not activated a recommendation for this Journey.</p>
                <Link to={`/learn/journeys/${journeyId}`}>Return to the full course</Link>
            </section>
        );
    }

    const path = journey.learningPath;
    const progress = path.totalSteps
        ? Math.round((path.completedSteps / path.totalSteps) * 100)
        : 0;

    return (
        <div className="learner_path_map_page">
            <header className="learner_path_map_hero">
                <div>
                    <Link to={`/learn/journeys/${journeyId}`}>
                        <i className="fa-solid fa-arrow-left" />Full course
                    </Link>
                    <span>Your personalized expedition</span>
                    <h1>{path.title}</h1>
                    <p>
                        This route was selected around your needs. Explore the
                        reasoning behind every stop and move at your own pace.
                    </p>
                </div>
                <div className="learner_map_compass">
                    <i className="fa-regular fa-compass" />
                    <strong>{progress}%</strong>
                    <span>of your route explored</span>
                </div>
            </header>

            <section className="learner_path_map">
                <div className="learner_map_start">
                    <i className="fa-solid fa-location-dot" />
                    <div><small>Starting point</small><strong>Your path begins here</strong></div>
                </div>

                <div className="learner_map_route">
                    {path.steps.map((step, index) => {
                        const complete = step.progressStatus === "COMPLETED";
                        const active =
                            !complete && path.nextStep?.id === step.id;
                        return (
                            <article
                                key={step.id}
                                className={[
                                    "learner_map_stop",
                                    index % 2 ? "right" : "left",
                                    complete ? "completed" : "",
                                    active ? "current" : "",
                                ].filter(Boolean).join(" ")}
                            >
                                <span className="learner_map_connector" />
                                <span className="learner_map_marker">
                                    {complete
                                        ? <i className="fa-solid fa-check" />
                                        : index + 1}
                                </span>
                                <div className="learner_map_stop_card">
                                    <div className="learner_map_stop_visual">
                                        <StepVisual step={step} compact />
                                    </div>
                                    <span>{step.stageTitle}</span>
                                    <h2>{step.title}</h2>
                                    <div className="learner_map_reason">
                                        <i className="fa-solid fa-wand-magic-sparkles" />
                                        <div>
                                            <small>Why this is on your path</small>
                                            <p>
                                                {step.pathReason ||
                                                    "Your educator selected this Step to strengthen the skills needed for the next part of your journey."}
                                            </p>
                                        </div>
                                    </div>
                                    <footer>
                                        <span>
                                            {step.isRequired === false
                                                ? "Optional exploration"
                                                : complete
                                                    ? "Milestone completed"
                                                    : active
                                                        ? "Your next milestone"
                                                        : "Upcoming milestone"}
                                        </span>
                                        <Link to={`/learn/journeys/${journeyId}/steps/${step.id}`}>
                                            {complete ? "Review" : "Explore"}
                                            <i className="fa-solid fa-arrow-right" />
                                        </Link>
                                    </footer>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <section className="learner_map_destination">
                    <div className="learner_map_flag"><i className="fa-solid fa-flag-checkered" /></div>
                    <span>Your destination</span>
                    <h2>{path.learnerGoal || "What do you want to achieve?"}</h2>
                    {!path.learnerGoal && !editingGoal && (
                        <p>Give your route a purpose that matters to you.</p>
                    )}
                    {editingGoal ? (
                        <form onSubmit={saveGoal}>
                            <textarea
                                value={goal}
                                onChange={(event) => setGoal(event.target.value)}
                                maxLength={500}
                                placeholder="Example: Hold a 15-minute conversation confidently during my next trip."
                                autoFocus
                                required
                            />
                            <div>
                                <small>{goal.length}/500</small>
                                <button type="button" onClick={() => {
                                    setGoal(path.learnerGoal || "");
                                    setEditingGoal(false);
                                }}>Cancel</button>
                                <button disabled={saving}>
                                    {saving ? "Saving…" : "Set my objective"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button type="button" onClick={() => setEditingGoal(true)}>
                            <i className="fa-solid fa-pen" />
                            {path.learnerGoal ? "Edit my objective" : "Choose my objective"}
                        </button>
                    )}
                    {error && <div className="learner_map_goal_error">{error}</div>}
                </section>
            </section>
        </div>
    );
}
