import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerAccount } from "../../../api/authApi";
import "./Register.css";

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const paymentCancelled = searchParams.get("payment") === "cancelled";

    const [form, setForm] = useState({
        role: "EDUCATOR",
        firstName: "",
        lastName: "",
        email: "",
        area: "",
        password: "",
        confirmPassword: "",
        acceptedTerms: false,
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        const { name, value, type, checked } = e.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (form.password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (!form.acceptedTerms) {
            setError("You must accept the Terms and Privacy Policy.");
            return;
        }

        setLoading(true);

        try {
            const response = await registerAccount({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                password: form.password,
                role: form.role,
                area: form.area,
            });

            if (response.requiresPayment) {
                if (!response.checkoutUrl) {
                    throw new Error(
                        "Your account was created, but the payment page is not available."
                    );
                }

                window.location.assign(response.checkoutUrl);
                return;
            }

            if (response.token) {
                localStorage.setItem("token", response.token);
            }

            navigate("/studio", {
                replace: true,
            });
        } catch (err) {
            setError(err.message || "Could not create your account.");
        } finally {
            setLoading(false);
        }
    }

    const isEducator = form.role === "EDUCATOR";

    return (
        <div className="register_page">
            <div className="register_left">
                <nav className="register_nav">
                    <div className="register_logo">
                        <img src="/logo.png" alt="Maze Studio logo" />
                        <span>Maze Studio</span>
                    </div>

                    <Link to="/" className="btn_secondary">
                        Back home
                    </Link>
                </nav>

                <div className="register_content">
                    <span className="landing_badge">Start your studio</span>

                    <h1>Create your Maze Studio account.</h1>

                    <p>
                        Choose how you want to use Maze Studio. Educators can create
                        learning journeys and manage learners, while learners can
                        access steps, challenges and progress for free.
                    </p>

                    <form className="register_form" onSubmit={handleSubmit}>
                        {paymentCancelled && (
                            <div className="register_alert warning">
                                <i className="fa-solid fa-circle-exclamation"></i>

                                <span>
                                    Payment was cancelled. Enter the same email and password to
                                    continue your educator subscription.
                                </span>
                            </div>
                        )}

                        {error && (
                            <div className="register_alert error">
                                <i className="fa-solid fa-circle-exclamation"></i>

                                <span>{error}</span>
                            </div>
                        )}

                        <div className="account_type_grid">
                            <label
                                className={`account_type_card ${isEducator ? "selected" : ""
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value="EDUCATOR"
                                    checked={form.role === "EDUCATOR"}
                                    onChange={handleChange}
                                />

                                <div>
                                    <i className="fa-solid fa-chalkboard-user"></i>

                                    <strong>Educator</strong>

                                    <span>
                                        $10/month · Create learning journeys, manage
                                        learners, assign challenges and track progress.
                                    </span>
                                </div>
                            </label>

                            <label
                                className={`account_type_card ${!isEducator ? "selected" : ""
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value="STUDENT"
                                    checked={form.role === "STUDENT"}
                                    onChange={handleChange}
                                />

                                <div>
                                    <i className="fa-solid fa-user-graduate"></i>

                                    <strong>Learner</strong>

                                    <span>
                                        Free · Access steps, submit challenges and
                                        follow your personal learning progress.
                                    </span>
                                </div>
                            </label>
                        </div>

                        {isEducator && (
                            <div className="educator_subscription_notice">
                                <div className="educator_subscription_icon">
                                    <i className="fa-solid fa-crown"></i>
                                </div>

                                <div>
                                    <strong>Educator subscription</strong>

                                    <p>
                                        After creating your account, you will continue
                                        to Stripe Checkout to activate your $10 USD
                                        monthly subscription.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="form_grid">
                            <div className="form_group">
                                <label>First name</label>

                                <input
                                    name="firstName"
                                    type="text"
                                    placeholder="Maria"
                                    value={form.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form_group">
                                <label>Last name</label>

                                <input
                                    name="lastName"
                                    type="text"
                                    placeholder="Lopez"
                                    value={form.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

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
                            <label>Teaching or learning area</label>

                            <select
                                name="area"
                                value={form.area}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>
                                    Select your main area
                                </option>

                                <option value="LANGUAGES">Languages</option>
                                <option value="MATH">Math</option>
                                <option value="SCIENCE">Science</option>
                                <option value="MUSIC">Music</option>
                                <option value="PROGRAMMING">Programming</option>
                                <option value="TEST_PREPARATION">
                                    Test preparation
                                </option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div className="form_grid">
                            <div className="form_group">
                                <label>Password</label>

                                <input
                                    name="password"
                                    type="password"
                                    placeholder="Create a password"
                                    value={form.password}
                                    onChange={handleChange}
                                    minLength={8}
                                    required
                                />
                            </div>

                            <div className="form_group">
                                <label>Confirm password</label>

                                <input
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="Repeat password"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    minLength={8}
                                    required
                                />
                            </div>
                        </div>

                        <label className="terms">
                            <input
                                name="acceptedTerms"
                                type="checkbox"
                                checked={form.acceptedTerms}
                                onChange={handleChange}
                            />

                            <span>
                                I agree to the <Link to="/terms">Terms</Link> and{" "}
                                <Link to="/privacy">Privacy Policy</Link>.
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="btn_primary register_button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>

                                    {isEducator
                                        ? "Preparing secure payment..."
                                        : "Creating account..."}
                                </>
                            ) : (
                                <>
                                    {isEducator && (
                                        <i className="fa-solid fa-lock"></i>
                                    )}

                                    {isEducator
                                        ? "Continue to payment"
                                        : "Create free account"}
                                </>
                            )}
                        </button>
                    </form>

                    <p className="register_footer_text">
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>

            <div className="register_right">
                <div className="register_preview_card">
                    <div className="preview_badge">
                        {isEducator
                            ? "Build your teaching workspace"
                            : "Start your learning journey"}
                    </div>

                    <h2>{isEducator ? "Educator workspace" : "Learner account"}</h2>

                    <p>
                        {isEducator
                            ? "Create reusable learning journeys, personalize learner paths and manage your teaching workflow from one place."
                            : "Join learning journeys, complete challenges and keep track of your personal progress."}
                    </p>

                    <div className="journey_steps">
                        <div className="journey_step active">
                            <span>01</span>

                            <div>
                                <strong>
                                    {isEducator
                                        ? "Create your account"
                                        : "Create your free account"}
                                </strong>

                                <small>
                                    Complete your profile and choose your main area.
                                </small>
                            </div>
                        </div>

                        <div className="journey_step">
                            <span>02</span>

                            <div>
                                <strong>
                                    {isEducator
                                        ? "Secure Stripe payment"
                                        : "Join a learning journey"}
                                </strong>

                                <small>
                                    {isEducator
                                        ? "$10 USD billed monthly through Stripe."
                                        : "Accept an invitation or use a private access link."}
                                </small>
                            </div>
                        </div>

                        <div className="journey_step">
                            <span>03</span>

                            <div>
                                <strong>
                                    {isEducator
                                        ? "Build stages and steps"
                                        : "Follow your personalized path"}
                                </strong>

                                <small>
                                    {isEducator
                                        ? "Create content, challenges and reusable teaching structures."
                                        : "Access the content selected for your goals and level."}
                                </small>
                            </div>
                        </div>

                        <div className="journey_step">
                            <span>04</span>

                            <div>
                                <strong>
                                    {isEducator
                                        ? "Manage and grow"
                                        : "Track your progress"}
                                </strong>

                                <small>
                                    {isEducator
                                        ? "Start privately and scale into groups or public journeys."
                                        : "Review completions, attempts, results and feedback."}
                                </small>
                            </div>
                        </div>
                    </div>

                    <div className="register_stats">
                        <div>
                            <strong>{isEducator ? "$10" : "Free"}</strong>

                            <span>
                                {isEducator ? "Monthly plan" : "Learner account"}
                            </span>
                        </div>

                        <div>
                            <strong>{isEducator ? "∞" : "24/7"}</strong>

                            <span>
                                {isEducator ? "Journeys" : "Content access"}
                            </span>
                        </div>

                        <div>
                            <strong>{isEducator ? "AI" : "1:1"}</strong>

                            <span>
                                {isEducator ? "Creation tools" : "Personal paths"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}