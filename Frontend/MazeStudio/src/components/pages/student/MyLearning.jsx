import { Link } from "react-router-dom";
import useEnrollments from "../../../hooks/useEnrollments";
import "./StudentPages.css";
import WeeklySubscriptions from "./WeeklySubscriptions";
import PurchaseHistory from "./PurchaseHistory";

export default function MyLearning() {
    const { enrollments, loading, error, reload } = useEnrollments();
    const activeJourneys = enrollments.filter(
        (enrollment) => enrollment.status === "ACTIVE"
    );
    const completedCount = enrollments.filter(
        (enrollment) => enrollment.status === "COMPLETED"
    ).length;

    return (
        <div className="student_page_stack">
            <section className="student_welcome_card">
                <div>
                    <span className="student_section_kicker">Welcome back</span>
                    <h2>Continue where you left off.</h2>
                    <p>
                        Your enrolled Learning Journeys and their latest status
                        are gathered in one place.
                    </p>
                </div>
                <div className="student_welcome_visual">
                    <i className="fa-solid fa-route" />
                </div>
            </section>

            <section className="student_metrics_grid">
                <MetricCard
                    icon="fa-solid fa-book-open"
                    value={loading ? "—" : activeJourneys.length}
                    label="Active journeys"
                />
                <MetricCard
                    icon="fa-solid fa-award"
                    value={loading ? "—" : completedCount}
                    label="Completed journeys"
                />
            </section>

            <section className="student_content_section">
                <div className="student_section_header">
                    <div>
                        <span className="student_section_kicker">In progress</span>
                        <h2>Your Learning Journeys</h2>
                    </div>
                    <Link to="/marketplace" className="student_text_link">
                        Discover more
                        <i className="fa-solid fa-arrow-right" />
                    </Link>
                </div>

                {loading && (
                    <LearningState
                        icon="fa-solid fa-spinner fa-spin"
                        title="Loading your Learning Journeys..."
                    />
                )}

                {!loading && error && (
                    <LearningState
                        icon="fa-solid fa-triangle-exclamation"
                        title={error}
                    >
                        <button
                            type="button"
                            className="student_save_button"
                            onClick={reload}
                        >
                            Try again
                        </button>
                    </LearningState>
                )}

                {!loading && !error && activeJourneys.length > 0 && (
                    <div className="student_journey_grid">
                        {activeJourneys.map((journey) => (
                            <JourneyCard
                                key={journey.enrollmentId}
                                journey={journey}
                            />
                        ))}
                    </div>
                )}

                {!loading && !error && activeJourneys.length === 0 && (
                    <LearningState
                        icon="fa-solid fa-route"
                        title="No active Learning Journeys yet"
                    >
                        <p>
                            Accept an invitation from an educator or discover a
                            public Learning Journey in the Marketplace.
                        </p>
                        <Link to="/marketplace" className="student_primary_link">
                            Explore Marketplace
                        </Link>
                    </LearningState>
                )}
            </section>
            <WeeklySubscriptions />
            <PurchaseHistory />
        </div>
    );
}

function MetricCard({ icon, value, label }) {
    return (
        <article className="student_metric_card">
            <div className="student_metric_icon">
                <i className={icon} />
            </div>
            <div>
                <strong>{value}</strong>
                <span>{label}</span>
            </div>
        </article>
    );
}

function JourneyCard({ journey }) {
    const educator = [
        journey.educatorName,
    ]
        .filter(Boolean)
        .join(" ");
    const accent = journey.title?.slice(0, 3);

    return (
        <article className="student_journey_card">
            <div className="student_journey_cover">
                {journey.coverImageUrl ? (
                    <img src={journey.coverImageUrl} alt="" />
                ) : (
                    <div className="student_journey_cover_badge">{accent}</div>
                )}
                <span className="student_journey_status">In progress</span>
            </div>

            <div className="student_journey_body">
                <div>
                    <Link className="student_journey_educator educator_with_photo" to={`/educators/${journey.educatorSlug||journey.educatorId}`}>
                        {journey.educatorAvatarUrl?<img src={journey.educatorAvatarUrl} alt=""/>:<i className="fa-solid fa-user-graduate"/>}
                        <span>By {educator || "Maze Studio educator"}</span>
                    </Link>
                    <h3>{journey.title}</h3>
                    <p>{journey.description || "No description provided."}</p>
                </div>

                <div className="student_journey_next">
                    <div>
                        <span>Journey details</span>
                        <strong>
                            {[journey.difficulty, journey.language]
                                .filter(Boolean)
                                .join(" · ") || "Ready to learn"}
                        </strong>
                    </div>
                    <Link
                        to={
                            journey.nextStep
                                ? `/learn/journeys/${journey.learningJourneyId}/steps/${journey.nextStep.id}`
                                : `/learn/journeys/${journey.learningJourneyId}`
                        }
                        className="student_primary_link"
                    >
                        {journey.nextStep ? "Continue" : "View Journey"}
                    </Link>
                </div>
            </div>
        </article>
    );
}

function LearningState({ icon, title, children }) {
    return (
        <div className="student_empty_state">
            <div className="student_empty_icon">
                <i className={icon} />
            </div>
            <h3>{title}</h3>
            {children}
        </div>
    );
}
