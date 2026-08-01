import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./StudentPages.css";

export default function StudentSettings() {
    const { user } = useAuth();

    return (
        <div className="student_settings_grid">
            <section className="student_panel">
                <div className="student_section_header compact">
                    <div>
                        <span className="student_section_kicker">Profile</span>
                        <h2>Personal information</h2>
                    </div>
                </div>

                <div className="student_settings_form">
                    <label>
                        First name
                        <input type="text" value={user?.first_name || ""} readOnly />
                    </label>
                    <label>
                        Last name
                        <input type="text" value={user?.last_name || ""} readOnly />
                    </label>
                    <label className="full">
                        Email address
                        <input type="email" value={user?.email || ""} readOnly />
                    </label>
                    <p className="full student_settings_note">
                        Profile details are loaded from your authenticated Maze
                        Studio account.
                    </p>
                    {/* TODO: Reuse the profile update endpoint when its learner fields are finalized. */}
                </div>
            </section>

            <aside className="student_panel">
                <div className="student_section_header compact">
                    <div>
                        <span className="student_section_kicker">Security</span>
                        <h2>Account access</h2>
                    </div>
                </div>

                <Link to="/student/settings/security" className="student_settings_option">
                    <i className="fa-solid fa-key" />
                    <span>
                        <strong>Change password</strong>
                        <small>Use the existing account security flow.</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" />
                </Link>
                <Link to="/student/settings/billing" className="student_settings_option">
                    <i className="fa-solid fa-credit-card" />
                    <span>
                        <strong>Billing and purchases</strong>
                        <small>Manage 1:1 subscriptions, payments and refunds.</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" />
                </Link>
            </aside>
        </div>
    );
}
