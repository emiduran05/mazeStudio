import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../../api/api";
import "./StudentPages.css";

export default function StudentSecurity() {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    function handleChange(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setMessage("");

        if (form.newPassword !== form.confirmPassword) {
            setError("New password and confirmation do not match.");
            return;
        }

        if (form.newPassword.length < 8) {
            setError("New password must be at least 8 characters long.");
            return;
        }

        setLoading(true);
        try {
            await apiRequest("/users/change-password", {
                method: "PUT",
                body: JSON.stringify({
                    currentPassword: form.currentPassword,
                    newPassword: form.newPassword,
                }),
            });
            setMessage("Password updated successfully.");
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (requestError) {
            setError(requestError.message || "Could not update password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="student_settings_grid">
            <section className="student_panel student_security_panel">
                <div className="student_section_header compact">
                    <div>
                        <span className="student_section_kicker">Account security</span>
                        <h2>Change your password</h2>
                        <p>Keep your learner account and progress protected.</p>
                    </div>
                    <div className="student_settings_hero_icon">
                        <i className="fa-solid fa-shield-halved" />
                    </div>
                </div>

                <form className="student_settings_form" onSubmit={handleSubmit}>
                    {error && <div className="student_settings_alert error full">{error}</div>}
                    {message && <div className="student_settings_alert success full">{message}</div>}
                    <label className="full">
                        Current password
                        <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} autoComplete="current-password" required />
                    </label>
                    <label>
                        New password
                        <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} autoComplete="new-password" minLength={8} required />
                    </label>
                    <label>
                        Confirm new password
                        <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" minLength={8} required />
                    </label>
                    <div className="student_settings_actions full">
                        <button className="student_save_button" type="submit" disabled={loading}>
                            {loading ? "Updating…" : "Update password"}
                        </button>
                    </div>
                </form>
            </section>

            <aside className="student_panel student_settings_aside">
                <span className="student_section_kicker">Learner settings</span>
                <h2>Your account</h2>
                <p>Your security settings are separate from educator Studio configuration.</p>
                <Link to="/student/settings" className="student_settings_option">
                    <i className="fa-solid fa-arrow-left" />
                    <span><strong>Back to profile</strong><small>Personal information and learner preferences.</small></span>
                    <i className="fa-solid fa-chevron-right" />
                </Link>
            </aside>
        </div>
    );
}
