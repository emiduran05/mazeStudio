import "./Security.css";
import { useEffect, useState } from "react";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import AsideConfig from "../asideConfig/AsideConfig";
import { apiRequest } from "../../../../api/api";
export default function Security() {
    const [darkmode, setDarkmode] = useState(
        localStorage.getItem("darkmode") === "true"
    );

    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const currentDarkmode = localStorage.getItem("darkmode") === "true";

            setDarkmode((prev) => {
                if (prev !== currentDarkmode) return currentDarkmode;
                return prev;
            });
        }, 200);

        return () => clearInterval(interval);
    }, []);

    function handleChange(e) {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
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
            setForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } catch (err) {
            setError(err.message || "Could not update password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <StudioLayout>
            <div className={`settings_main ${darkmode ? "settings-darkmode" : ""}`}>
                <div className="settings_main_container">
                    <div className="settings_main_container_intro">
                        <p className="settings_title">Security</p>
                        <span>Password and 2FA.</span>
                    </div>

                    <div className="settings_main_container_grid">
                        <div className="settings_main_container_grid_element">
                            <AsideConfig />
                        </div>

                        <div className="settings_main_container_grid_element">
                            <div className="security_content">
                                <div className="security_card">
                                    <div className="security_card_header">
                                        <div>
                                            <h2>Password</h2>
                                            <p>
                                                Update your password to keep your Maze Studio
                                                account secure.
                                            </p>
                                        </div>

                                        <div className="security_icon">
                                            <i className="fa-solid fa-lock"></i>
                                        </div>
                                    </div>

                                    <form className="security_form" onSubmit={handleSubmit}>
                                        {error && (
                                            <div className="security_alert error">
                                                <i className="fa-solid fa-circle-exclamation"></i>
                                                <span>{error}</span>
                                            </div>
                                        )}

                                        {message && (
                                            <div className="security_alert success">
                                                <i className="fa-solid fa-circle-check"></i>
                                                <span>{message}</span>
                                            </div>
                                        )}

                                        <div className="security_group">
                                            <label>Current password</label>
                                            <input
                                                type="password"
                                                name="currentPassword"
                                                value={form.currentPassword}
                                                onChange={handleChange}
                                                placeholder="Enter your current password"
                                                required
                                            />
                                        </div>

                                        <div className="security_group">
                                            <label>New password</label>
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={form.newPassword}
                                                onChange={handleChange}
                                                placeholder="Enter your new password"
                                                required
                                            />
                                        </div>

                                        <div className="security_group">
                                            <label>Confirm new password</label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={form.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Confirm your new password"
                                                required
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="security_button"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa-solid fa-key"></i>
                                                    Update password
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>

                                <div className="security_card">
                                    <div className="security_card_header">
                                        <div>
                                            <h2>Two-Factor Authentication</h2>
                                            <p>
                                                Add an extra layer of protection to your account.
                                            </p>
                                        </div>

                                        <span className="security_badge">Coming soon</span>
                                    </div>

                                    <div className="security_feature_row">
                                        <div className="security_feature_icon purple">
                                            <i className="fa-solid fa-shield-halved"></i>
                                        </div>

                                        <div>
                                            <h4>Authenticator app</h4>
                                            <p>
                                                Use Google Authenticator, Authy, or another 2FA app
                                                to protect your account.
                                            </p>
                                        </div>

                                        <button className="security_secondary_button" disabled>
                                            Enable
                                        </button>
                                    </div>
                                </div>

                                <div className="security_card">
                                    <div className="security_card_header">
                                        <div>
                                            <h2>Active Sessions</h2>
                                            <p>
                                                Review devices where your account is currently active.
                                            </p>
                                        </div>

                                        <span className="security_badge">Soon</span>
                                    </div>

                                    <div className="security_feature_row">
                                        <div className="security_feature_icon blue">
                                            <i className="fa-solid fa-laptop"></i>
                                        </div>

                                        <div>
                                            <h4>This device</h4>
                                            <p>Current browser session · Mexico</p>
                                        </div>

                                        <button className="security_secondary_button" disabled>
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="settings_main_container_grid_element"></div>
                    </div>
                </div>
            </div>
        </StudioLayout>
    );
}