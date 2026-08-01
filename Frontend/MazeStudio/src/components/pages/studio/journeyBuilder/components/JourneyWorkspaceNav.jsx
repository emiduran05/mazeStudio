import { Link } from "react-router-dom";

export default function JourneyWorkspaceNav({
    journeyId,
    active,
    accessRole = "OWNER",
}) {
    return (
        <nav className="journey_builder_sections journey_workspace_nav">
            <Link
                className={active === "CONTENT" ? "active" : ""}
                to={`/studio/journey/${journeyId}?section=content`}
            >
                <i className="fa-solid fa-layer-group" />
                Content
            </Link>
            {accessRole !== "VIEWER" && <Link
                className={active === "STUDENTS" ? "active" : ""}
                to={`/studio/journey/${journeyId}?section=students`}
            >
                <i className="fa-solid fa-user-graduate" />
                Students
            </Link>}
            {accessRole === "OWNER" && <Link
                className={active === "OFFERS" ? "active" : ""}
                to={`/studio/journey/${journeyId}?section=offers`}
            >
                <i className="fa-solid fa-store" />
                Offers
            </Link>}
            {accessRole === "OWNER" && <Link
                className={active === "COHORTS" ? "active" : ""}
                to={`/studio/journey/${journeyId}?section=cohorts`}
            >
                <i className="fa-solid fa-people-roof" />
                Groups / Cohorts
            </Link>}
            {accessRole === "OWNER" && <Link
                className={active === "SESSIONS" ? "active" : ""}
                to={`/studio/journey/${journeyId}?section=sessions`}
            >
                <i className="fa-solid fa-repeat" />
                Sessions
            </Link>}
            {accessRole === "OWNER" && <Link
                className={active === "CHALLENGES" ? "active" : ""}
                to={`/studio/journeys/${journeyId}/challenges`}
            >
                <i className="fa-solid fa-list-check" />
                Challenges
            </Link>}
            {accessRole !== "VIEWER" && <Link
                className={active === "PATHS" ? "active" : ""}
                to={`/studio/journey/${journeyId}?section=paths`}
            >
                <i className="fa-solid fa-route" />
                Learning Paths
            </Link>}
            {accessRole === "OWNER" && <Link
                className={active === "COLLABORATORS" ? "active" : ""}
                to={`/studio/journey/${journeyId}?section=collaborators`}
            >
                <i className="fa-solid fa-people-group" />
                Collaborators
            </Link>}
        </nav>
    );
}
