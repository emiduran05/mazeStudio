import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../../api/authApi";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get("token");

    const [form, setForm] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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

        if (!token) {
            setError("Reset token is missing.");
            return;
        }

        if (form.newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await resetPassword(token, form.newPassword);
            setMessage("Password reset successfully. Redirecting to login...");

            setTimeout(() => {
                navigate("/login", { replace: true });
            }, 1800);
        } catch (err) {
            setError(err.message || "Could not reset password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login_page">
            <div className="login_left">
                <nav className="login_nav">
                    <div className="login_logo">
                        <img src="/logo.png" alt="Maze Studio logo" />
                        <span>Maze Studio</span>
                    </div>

                    <Link to="/login" className="btn_secondary">Back to login</Link>
                </nav>

                <div className="login_content">
                    <span className="landing_badge">Create new password</span>

                    <h1>Choose a new password.</h1>

                    <p>
                        Your new password must be at least 8 characters long.
                    </p>

                    <form className="login_form" onSubmit={handleSubmit}>
                        {error && (
                            <div className="login_error">
                                <i className="fa-solid fa-circle-exclamation"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        {message && (
                            <div className="login_success">
                                <i className="fa-solid fa-circle-check"></i>
                                <span>{message}</span>
                            </div>
                        )}

                        <div className="form_group">
                            <label>New password</label>
                            <input
                                name="newPassword"
                                type="password"
                                placeholder="Enter new password"
                                value={form.newPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form_group">
                            <label>Confirm password</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn_primary login_button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    Updating...
                                </>
                            ) : (
                                "Reset password"
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <div className="login_right">
                <div className="login_preview_card">
                    <div className="preview_header">
                        <span>Security</span>
                        <strong>Password reset</strong>
                    </div>

                    <div className="preview_item">
                        <span>Protected</span>
                        <strong>Temporary reset token</strong>
                        <small>This link expires automatically</small>
                    </div>

                    <div className="preview_item">
                        <span>Account</span>
                        <strong>Access restored</strong>
                        <small>Login again with your new password</small>
                    </div>
                </div>
            </div>
        </div>
    );
}