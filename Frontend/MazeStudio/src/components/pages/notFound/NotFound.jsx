import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./NotFound.css";

export default function NotFound() {
    const navigate = useNavigate();
    const { user, authLoading } = useAuth();
    const homePath = user ? "/my-learning" : "/";
    const darkMode = localStorage.getItem("darkmode") === "true";

    return (
        <main className={`not_found_page ${darkMode ? "not_found_dark" : ""}`}>
            <div className="not_found_orbit orbit_one" />
            <div className="not_found_orbit orbit_two" />
            <section className="not_found_card">
                <Link className="not_found_brand" to={homePath}>
                    <img src="/logo.png" alt="Maze Studio" />
                    <span>Maze Studio</span>
                </Link>
                <div className="not_found_map">
                    <span className="not_found_code">404</span>
                    <div className="not_found_route">
                        <i className="fa-solid fa-location-dot" />
                        <span />
                        <i className="fa-regular fa-circle-question" />
                    </div>
                </div>
                <span className="not_found_kicker">This route is not on the map</span>
                <h1>Looks like you took a wrong turn.</h1>
                <p>The page may have moved, the link may be incomplete, or this destination no longer exists.</p>
                <div className="not_found_actions">
                    <button type="button" onClick={() => navigate(-1)}>
                        <i className="fa-solid fa-arrow-left" />Go back
                    </button>
                    <Link to={homePath}>
                        <i className="fa-solid fa-compass" />
                        {authLoading ? "Loading…" : user ? "Go to My Learning" : "Go to homepage"}
                    </Link>
                </div>
                {user?.role === "EDUCATOR" && (
                    <Link className="not_found_studio_link" to="/studio">
                        Or return to your Studio
                        <i className="fa-solid fa-arrow-right" />
                    </Link>
                )}
            </section>
        </main>
    );
}
