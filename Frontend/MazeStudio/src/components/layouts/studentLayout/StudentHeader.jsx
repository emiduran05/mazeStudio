import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function StudentHeader({
    darkMode,
    onToggleDarkMode,
    onOpenSidebar,
}) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    const initials = `${user?.first_name?.[0] || ""}${
        user?.last_name?.[0] || ""
    }`.toUpperCase();
    const settingsPath = user?.role === "EDUCATOR"
        ? "/my-settings/account"
        : "/student/settings";

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    return (
        <header className="student_header">
            <div className="student_header_left">
                <button
                    type="button"
                    className="student_mobile_menu"
                    onClick={onOpenSidebar}
                    aria-label="Open navigation"
                >
                    <i className="fa-solid fa-bars" />
                </button>

                <form className="student_global_search" onSubmit={event=>{event.preventDefault();const query=new FormData(event.currentTarget).get("search");navigate(`/marketplace${query?`?search=${encodeURIComponent(query)}`:""}`)}}>
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                        name="search"
                        type="search"
                        placeholder="Search your Learning Journeys"
                        aria-label="Search your Learning Journeys"
                    />
                    <kbd>Ctrl K</kbd>
                </form>
            </div>

            <div className="student_header_actions">
                <button
                    type="button"
                    className="student_header_icon_button"
                    onClick={onToggleDarkMode}
                    aria-label={darkMode ? "Activate light mode" : "Activate dark mode"}
                    title={darkMode ? "Activate light mode" : "Activate dark mode"}
                >
                    <i className={darkMode ? "fa-solid fa-sun" : "fa-solid fa-moon"} />
                </button>

                {user ? <>
                    <Link
                        to="/student/notifications"
                        className="student_header_icon_button"
                        aria-label="Notifications"
                    >
                        <i className="fa-solid fa-bell" />
                    </Link>

                    <details className="student_profile_menu">
                    <summary>
                        <span className="student_avatar">{initials || "MS"}</span>
                        <span className="student_profile_identity">
                            <strong>{fullName || "Maze learner"}</strong>
                            <small>Learner</small>
                        </span>
                        <i className="fa-solid fa-chevron-down" />
                    </summary>

                    <div className="student_profile_dropdown">
                        <div className="student_profile_dropdown_header">
                            <strong>{fullName || "Maze learner"}</strong>
                            <span>{user?.email}</span>
                        </div>
                        <Link to={settingsPath}>
                            <i className="fa-solid fa-gear" />
                            Account settings
                        </Link>
                        <button type="button" onClick={handleLogout}>
                            <i className="fa-solid fa-arrow-right-from-bracket" />
                            Log out
                        </button>
                    </div>
                    </details>
                </> : <div className="student_guest_actions">
                    <Link to="/login">Log in</Link>
                    <Link to="/register">Create account</Link>
                </div>}
            </div>
        </header>
    );
}
