import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const [stayLogged, setStayLogged] = useState(false);

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

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
        setLoading(true);

        try {
            const loggedUser = await login(
                form.email,
                form.password,
                stayLogged,
                searchParams.get("invitation")
            );
            if (loggedUser?.status === "PENDING_DELETION") {
                navigate("/account-recovery", { replace: true });
                return;
            }

            const returnTo = searchParams.get("returnTo");
            const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//")
                ? returnTo
                : null;
            const canAccessStudio =
                loggedUser?.role === "EDUCATOR" &&
                loggedUser?.status === "ACTIVE" &&
                ["ACTIVE", "TRIALING"].includes(
                    String(loggedUser?.subscription_status || "").toUpperCase()
                );
            navigate(
                searchParams.get("profileLink")
                    ? `/link-learner-profile?token=${encodeURIComponent(searchParams.get("profileLink"))}`
                    : safeReturnTo
                    ? safeReturnTo
                    : canAccessStudio
                    ? "/studio"
                    : "/my-learning",
                { replace: true }
            );
        } catch (err) {
            setError(err.message || "Login failed");
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

                    <Link to="/" className="btn_secondary">Back home</Link>
                </nav>

                <div className="login_content">
                    <span className="landing_badge">Welcome back</span>

                    <h1>Continue building your learning journeys.</h1>

                    <p>
                        Access your teaching studio, manage learners, review progress
                        and keep improving your personalized teaching methods.
                    </p>

                    <form className="login_form" onSubmit={handleSubmit}>
                        {error && (
                            <div className="login_error">
                                <i className="fa-solid fa-circle-exclamation"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form_group">
                            <label>Email address</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="teacher@example.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form_group">
                            <label>Password</label>
                            <input
                                name="password"
                                type="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="login_options">
                            <label className="remember_me">
                                <span>Remember me</span>
                                <input
                                    type="checkbox"
                                    checked={stayLogged}
                                    onChange={(e) => setStayLogged(e.target.checked)}
                                />
                            </label>

                            <Link to="/forgot-password">Forgot password?</Link>
                        </div>

                        <button
                            type="submit"
                            className="btn_primary login_button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    Logging in...
                                </>
                            ) : (
                                "Login"
                            )}
                        </button>
                    </form>

                    <p className="login_footer_text">
                        New to Maze Studio? <Link to="/register">Create an account</Link>
                    </p>
                </div>
            </div>

            <div className="login_right">
                <div className="login_preview_card">
                    <div className="preview_header">
                        <span>Learning Journey</span>
                        <strong>Spanish A1</strong>
                    </div>

                    <div className="preview_progress">
                        <div>
                            <span>Average Progress</span>
                            <strong>72%</strong>
                        </div>

                        <div className="progress_bar">
                            <div></div>
                        </div>
                    </div>

                    <div className="preview_item">
                        <span>Stage 1</span>
                        <strong>Foundations</strong>
                        <small>Pronouns · Basic verbs · Greetings</small>
                    </div>

                    <div className="preview_item">
                        <span>Stage 2</span>
                        <strong>Conversation</strong>
                        <small>Speaking practice · Listening</small>
                    </div>

                    <div className="preview_students">
                        <div>
                            <strong>24</strong>
                            <span>Learners</span>
                        </div>

                        <div>
                            <strong>18</strong>
                            <span>Steps</span>
                        </div>

                        <div>
                            <strong>6</strong>
                            <span>Challenges</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
