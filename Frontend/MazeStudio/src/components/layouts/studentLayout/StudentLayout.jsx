import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import StudentHeader from "./StudentHeader";
import StudentSidebar from "./StudentSidebar";
import "./StudentLayout.css";

const PAGE_META = {
    "/my-learning": {
        eyebrow: "Learning",
        title: "My learning",
        description: "Continue your active Learning Journeys and review your progress.",
    },
    "/my-learning/completed": {
        eyebrow: "Learning",
        title: "Completed",
        description: "Review the Learning Journeys you have completed.",
    },
    "/marketplace": {
        eyebrow: "Discover",
        title: "Marketplace",
        description: "Find public Learning Journeys created by educators.",
    },
    "/student/notifications": {
        eyebrow: "Account",
        title: "Notifications",
        description: "Review updates from your educators and Learning Journeys.",
    },
    "/student/calendar": {
        eyebrow: "Schedule",
        title: "My calendar",
        description: "Upcoming classes, meetings and Challenge deadlines.",
    },
    "/student/settings": {
        eyebrow: "Account",
        title: "Settings",
        description: "Manage your learner profile, security and preferences.",
    },
    "/student/settings/security": {
        eyebrow: "Account",
        title: "Security",
        description: "Manage the password and access to your learner account.",
    },
    "/student/settings/billing": {
        eyebrow: "Account",
        title: "Billing",
        description: "Manage purchases, recurring classes, payment methods and refunds.",
    },
};

export default function StudentLayout() {
    const location = useLocation();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        return localStorage.getItem("studentSidebarCollapsed") === "true";
    });

    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem("darkmode") === "true";
    });

    const pageMeta = useMemo(() => {
        return (
            PAGE_META[location.pathname] || {
                eyebrow: "Maze Studio",
                title: "Learning",
                description: "Your personal learning workspace.",
            }
        );
    }, [location.pathname]);

    useEffect(() => {
        localStorage.setItem(
            "studentSidebarCollapsed",
            String(sidebarCollapsed)
        );
    }, [sidebarCollapsed]);

    useEffect(() => {
        localStorage.setItem("darkmode", String(darkMode));
    }, [darkMode]);

    return (
        <div
            className={[
                "student_shell",
                darkMode ? "student_dark" : "",
                sidebarCollapsed ? "student_sidebar_collapsed" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <StudentSidebar
                open={sidebarOpen}
                collapsed={sidebarCollapsed}
                onClose={() => setSidebarOpen(false)}
                onToggleCollapsed={() =>
                    setSidebarCollapsed((current) => !current)
                }
            />

            {sidebarOpen && (
                <button
                    type="button"
                    className="student_sidebar_backdrop"
                    aria-label="Close navigation"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className="student_workspace">
                <StudentHeader
                    darkMode={darkMode}
                    onToggleDarkMode={() =>
                        setDarkMode((current) => !current)
                    }
                    onOpenSidebar={() => setSidebarOpen(true)}
                />

                <main className="student_main">
                    <header className="student_page_heading">
                        <div>
                            <span className="student_page_eyebrow">
                                {pageMeta.eyebrow}
                            </span>

                            <h1>{pageMeta.title}</h1>

                            <p>{pageMeta.description}</p>
                        </div>
                    </header>

                    <Outlet />
                </main>
            </div>
        </div>
    );
}
