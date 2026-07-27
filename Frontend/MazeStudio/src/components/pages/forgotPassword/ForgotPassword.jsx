import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../../api/authApi";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const data = await forgotPassword(email);
            setMessage(data.message || "Check your email for the reset link.");
        } catch (err) {
            setError(err.message || "Could not send reset email.");
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
                    <span className="landing_badge">Password recovery</span>

                    <h1>Reset your password.</h1>

                    <p>
                        Enter your email address and we’ll send you a secure link
                        to create a new password.
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
                            <label>Email address</label>
                            <input
                                type="email"
                                placeholder="teacher@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                    Sending...
                                </>
                            ) : (
                                "Send reset link"
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <div className="login_right">
                <div className="login_preview_card">
                    <div className="preview_header">
                        <span>Secure Recovery</span>
                        <strong>Maze Studio</strong>
                    </div>

                    <div className="preview_item">
                        <span>Step 1</span>
                        <strong>Request reset link</strong>
                        <small>Use your account email</small>
                    </div>

                    <div className="preview_item">
                        <span>Step 2</span>
                        <strong>Check your inbox</strong>
                        <small>The link expires in 30 minutes</small>
                    </div>

                    <div className="preview_item">
                        <span>Step 3</span>
                        <strong>Create new password</strong>
                        <small>Access your studio again</small>
                    </div>
                </div>
            </div>
        </div>
    );
}