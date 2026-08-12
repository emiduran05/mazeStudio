import { NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const getNavigationGroups = (canAccessStudio, isEducator, authenticated) => authenticated ? [
    {
        label: "Learning",
        items: [
            {
                to: "/my-learning",
                end: true,
                icon: "fa-solid fa-house",
                label: "My learning",
            },
            {
                to: "/my-learning/completed",
                icon: "fa-solid fa-circle-check",
                label: "Completed",
            },
            {
                to: "/student/calendar",
                icon: "fa-solid fa-calendar-days",
                label: "Calendar",
            },
        ],
    },
    {
        label: "Discover",
        items: [
            {
                to: "/marketplace",
                icon: "fa-solid fa-compass",
                label: "Marketplace",
                badge: "Soon",
            },
        ],
    },
    {
        label: "Account",
        items: [
            {
                to: canAccessStudio ? "/studio" : "/student/become-educator",
                icon: "fa-solid fa-chalkboard-user",
                label: canAccessStudio ? "Go to Studio" : "Become an educator",
            },
            {
                to: "/student/notifications",
                icon: "fa-solid fa-bell",
                label: "Notifications",
            },
            ...(!isEducator ? [{
                to: "/student/settings/billing",
                icon: "fa-solid fa-credit-card",
                label: "Billing",
            }] : []),
            {
                to: isEducator ? "/my-settings/account" : "/student/settings",
                icon: "fa-solid fa-gear",
                label: "Settings",
            },
        ],
    },
] : [{label:"Discover",items:[{to:"/marketplace",icon:"fa-solid fa-compass",label:"Marketplace"}]}];

export default function StudentSidebar({
    open,
    collapsed,
    onClose,
    onToggleCollapsed,
}) {
    const { user } = useAuth();
    const canAccessStudio =
        user?.role === "EDUCATOR" &&
        user?.status === "ACTIVE" &&
        ["ACTIVE", "TRIALING"].includes(
            String(user?.subscription_status || "").toUpperCase()
        );
    const navigationGroups = getNavigationGroups(
        canAccessStudio,
        user?.role === "EDUCATOR",
        Boolean(user)
    );

    return (
        <aside
            className={[
                "student_sidebar",
                open ? "open" : "",
                collapsed ? "collapsed" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="student_sidebar_top">
                <NavLink
                    to={user?"/my-learning":"/marketplace"}
                    className="student_brand"
                    onClick={onClose}
                >
                    <img src="/logo.png" alt="Maze Studio" />

                    <div className="student_brand_text">
                        <strong>Maze Studio</strong>
                        <span>Learner space</span>
                    </div>
                </NavLink>

                <button
                    type="button"
                    className="student_mobile_close"
                    onClick={onClose}
                    aria-label="Close navigation"
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            </div>

            <nav className="student_navigation">
                {navigationGroups.map((group) => (
                    <div
                        className="student_nav_group"
                        key={group.label}
                    >
                        <span className="student_nav_group_label">
                            {group.label}
                        </span>

                        <div className="student_nav_items">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                        [
                                            "student_nav_link",
                                            isActive ? "active" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")
                                    }
                                    title={
                                        collapsed ? item.label : undefined
                                    }
                                >
                                    <i className={item.icon} />

                                    <span className="student_nav_link_text">
                                        {item.label}
                                    </span>

                                    {item.badge && (
                                        <small className="student_nav_badge">
                                            {item.badge}
                                        </small>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="student_sidebar_bottom">
                <div className="student_help_card">
                    <div className="student_help_icon">
                        <i className="fa-solid fa-graduation-cap" />
                    </div>

                    <div className="student_help_content">
                        <strong>Need help?</strong>
                        <span>Contact your educator for access or content questions.</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="student_collapse_button"
                    onClick={onToggleCollapsed}
                >
                    <i
                        className={
                            collapsed
                                ? "fa-solid fa-angles-right"
                                : "fa-solid fa-angles-left"
                        }
                    />

                    <span>Collapse sidebar</span>
                </button>
            </div>
        </aside>
    );
}
