import useEnrollments from "../../../hooks/useEnrollments";
import "./StudentPages.css";

export default function CompletedLearning() {
    const { enrollments, loading, error, reload } = useEnrollments();
    const completed = enrollments.filter(
        (enrollment) => enrollment.status === "COMPLETED"
    );

    if (loading) {
        return (
            <LearningStatus
                icon="fa-solid fa-spinner fa-spin"
                title="Loading completed journeys..."
            />
        );
    }

    if (error) {
        return (
            <LearningStatus
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
            </LearningStatus>
        );
    }

    if (completed.length > 0) {
        return (
            <section className="student_journey_grid">
                {completed.map((enrollment) => (
                    <article className="student_journey_card" key={enrollment.id}>
                        <div className="student_journey_body">
                            <span className="student_journey_educator">
                                By{" "}
                                {[
                                    enrollment.educatorName,
                                ].filter(Boolean).join(" ")}
                            </span>
                            <h3>{enrollment.title}</h3>
                            <p>{enrollment.description}</p>
                            <span className="student_section_kicker">
                                Completed
                            </span>
                        </div>
                    </article>
                ))}
            </section>
        );
    }

    return (
        <LearningStatus
            icon="fa-solid fa-award"
            title="Your completed Learning Journeys will appear here."
        >
            <p>
                Complete every required Step and Challenge in a Learning Journey
                to add it to this section.
            </p>
        </LearningStatus>
    );
}

function LearningStatus({ icon, title, children }) {
    return (
        <section className="student_empty_state large">
            <div className="student_empty_icon">
                <i className={icon} />
            </div>
            <h2>{title}</h2>
            {children}
        </section>
    );
}
