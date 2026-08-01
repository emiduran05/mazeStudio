import { useMemo, useState } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import { registerAccount } from "../../../api/authApi";
import { useAuth } from "../../../context/AuthContext";
import "./Register.css";

export default function Register() {
    const navigate = useNavigate();
    const { setUser, loadUser } = useAuth();
    const [searchParams] = useSearchParams();

    const invitationToken = searchParams.get("invitation");
    const profileLinkToken = searchParams.get("profileLink");
    const paymentCancelled =
        searchParams.get("payment") === "cancelled";

    const [form, setForm] = useState({
        role: invitationToken || profileLinkToken ? "STUDENT" : "EDUCATOR",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        acceptedTerms: false,
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const isEducator = form.role === "EDUCATOR";
    const isInvitationRegistration =
        Boolean(invitationToken);

    const pageCopy = useMemo(() => {
        if (isInvitationRegistration) {
            return {
                badge: "You have been invited",
                title: "Create your account to join the class.",
                description:
                    "Complete the short form below. Your invitation will be linked automatically to your new account.",
            };
        }

        if (isEducator) {
            return {
                badge: "Start your studio",
                title: "Create your educator account.",
                description:
                    "Build Learning Journeys, manage learners and track progress from your own teaching workspace.",
            };
        }

        return {
            badge: "Start learning",
            title: "Create your free learner account.",
            description:
                "Join Learning Journeys, complete activities and keep track of your progress.",
        };
    }, [isEducator, isInvitationRegistration]);

    function handleChange(event) {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setError("");

        setForm((current) => ({
            ...current,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const firstName = form.firstName.trim();
        const lastName = form.lastName.trim();
        const email = form.email
            .trim()
            .toLowerCase();

        if (!firstName || !lastName || !email) {
            setError(
                "First name, last name and email are required."
            );
            return;
        }

        if (form.password.length < 8) {
            setError(
                "Password must be at least 8 characters long."
            );
            return;
        }

        if (
            form.password !==
            form.confirmPassword
        ) {
            setError("Passwords do not match.");
            return;
        }

        if (!form.acceptedTerms) {
            setError(
                "You must accept the Terms and Privacy Policy."
            );
            return;
        }

        setLoading(true);

        try {
            const response =
                await registerAccount({
                    firstName,
                    lastName,
                    email,
                    password: form.password,
                    role: form.role,
                    invitationToken:
                        invitationToken || null,
                });

            if (response.requiresPayment) {
                if (!response.checkoutUrl) {
                    throw new Error(
                        "Your account was created, but the payment page is not available."
                    );
                }

                window.location.assign(
                    response.checkoutUrl
                );
                return;
            }

            if (response.token) {
                localStorage.setItem(
                    "token",
                    response.token
                );

                if (response.user) {
                    setUser(response.user);
                } else {
                    await loadUser();
                }
            }

            navigate(
                profileLinkToken
                    ? `/link-learner-profile?token=${encodeURIComponent(profileLinkToken)}`
                    : form.role === "EDUCATOR"
                    ? "/studio"
                    : "/my-learning",
                {
                    replace: true,
                }
            );
        } catch (err) {
            setError(
                err.message ||
                    "Could not create your account."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="register_page">
            <div className="register_left">
                <nav className="register_nav">
                    <Link
                        to="/"
                        className="register_logo"
                    >
                        <img
                            src="/logo.png"
                            alt="Maze Studio logo"
                        />
                        <span>Maze Studio</span>
                    </Link>

                    <Link
                        to="/"
                        className="btn_secondary"
                    >
                        Back home
                    </Link>
                </nav>

                <div className="register_content">
                    <span className="landing_badge">
                        {pageCopy.badge}
                    </span>

                    <h1>{pageCopy.title}</h1>

                    <p>{pageCopy.description}</p>

                    <form
                        className="register_form"
                        onSubmit={handleSubmit}
                    >
                        {paymentCancelled && (
                            <div className="register_alert warning">
                                <i className="fa-solid fa-circle-exclamation" />

                                <span>
                                    Payment was cancelled.
                                    Enter the same email and
                                    password to continue your
                                    educator subscription.
                                </span>
                            </div>
                        )}

                        {isInvitationRegistration && (
                            <div className="register_alert invitation">
                                <i className="fa-solid fa-envelope-open-text" />

                                <span>
                                    Your class invitation will
                                    be accepted automatically
                                    after registration.
                                </span>
                            </div>
                        )}

                        {error && (
                            <div className="register_alert error">
                                <i className="fa-solid fa-circle-exclamation" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="account_type_grid">
                            <label
                                className={`account_type_card ${
                                    !isEducator
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value="STUDENT"
                                    checked={
                                        form.role ===
                                        "STUDENT"
                                    }
                                    onChange={handleChange}
                                />

                                <div>
                                    <i className="fa-solid fa-user-graduate" />

                                    <strong>
                                        Learner
                                    </strong>

                                    <span>
                                        Free account for
                                        joining classes and
                                        following your
                                        progress.
                                    </span>
                                </div>
                            </label>

                            <label
                                className={`account_type_card ${
                                    isEducator
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value="EDUCATOR"
                                    checked={
                                        form.role ===
                                        "EDUCATOR"
                                    }
                                    onChange={handleChange}
                                />

                                <div>
                                    <i className="fa-solid fa-chalkboard-user" />

                                    <strong>
                                        Educator
                                    </strong>

                                    <span>
                                        Includes learner
                                        access plus Studio
                                        tools for $10 USD per
                                        month.
                                    </span>
                                </div>
                            </label>
                        </div>

                        {isEducator && (
                            <div className="educator_subscription_notice">
                                <div className="educator_subscription_icon">
                                    <i className="fa-solid fa-crown" />
                                </div>

                                <div>
                                    <strong>
                                        Educator subscription
                                    </strong>

                                    <p>
                                        After registration,
                                        you will continue to
                                        Stripe Checkout to
                                        activate your monthly
                                        subscription.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="form_grid">
                            <div className="form_group">
                                <label
                                    htmlFor="register-first-name"
                                >
                                    First name
                                </label>

                                <input
                                    id="register-first-name"
                                    name="firstName"
                                    type="text"
                                    autoComplete="given-name"
                                    placeholder="Maria"
                                    value={
                                        form.firstName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form_group">
                                <label
                                    htmlFor="register-last-name"
                                >
                                    Last name
                                </label>

                                <input
                                    id="register-last-name"
                                    name="lastName"
                                    type="text"
                                    autoComplete="family-name"
                                    placeholder="Lopez"
                                    value={
                                        form.lastName
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form_group">
                            <label
                                htmlFor="register-email"
                            >
                                Email address
                            </label>

                            <input
                                id="register-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                disabled={loading}
                                required
                            />
                        </div>

                        <div className="form_grid">
                            <div className="form_group">
                                <label
                                    htmlFor="register-password"
                                >
                                    Password
                                </label>

                                <input
                                    id="register-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="At least 8 characters"
                                    value={form.password}
                                    onChange={
                                        handleChange
                                    }
                                    minLength={8}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form_group">
                                <label
                                    htmlFor="register-confirm-password"
                                >
                                    Confirm password
                                </label>

                                <input
                                    id="register-confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder="Repeat password"
                                    value={
                                        form.confirmPassword
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    minLength={8}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <label className="terms">
                            <input
                                name="acceptedTerms"
                                type="checkbox"
                                checked={
                                    form.acceptedTerms
                                }
                                onChange={handleChange}
                                disabled={loading}
                            />

                            <span>
                                I agree to the{" "}
                                <Link to="/terms">
                                    Terms
                                </Link>{" "}
                                and{" "}
                                <Link to="/privacy">
                                    Privacy Policy
                                </Link>
                                .
                            </span>
                        </label>

                        <button
                            type="submit"
                            className="btn_primary register_button"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin" />
                                    {isEducator
                                        ? "Preparing payment..."
                                        : "Creating account..."}
                                </>
                            ) : (
                                <>
                                    {isEducator ? (
                                        <i className="fa-solid fa-lock" />
                                    ) : (
                                        <i className="fa-solid fa-user-plus" />
                                    )}

                                    {isEducator
                                        ? "Continue to payment"
                                        : isInvitationRegistration
                                          ? "Create account and join"
                                          : "Create free account"}
                                </>
                            )}
                        </button>
                    </form>

                    <p className="register_footer_text">
                        Already have an account?{" "}
                        <Link
                            to={
                                invitationToken
                                    ? `/login?invitation=${encodeURIComponent(
                                          invitationToken
                                      )}`
                                    : "/login"
                            }
                        >
                            Login
                        </Link>
                    </p>
                </div>
            </div>

            <div className="register_right">
                <div className="register_preview_card">
                    <div className="preview_badge">
                        {isEducator
                            ? "Educator workspace"
                            : "Free learner account"}
                    </div>

                    <h2>
                        {isEducator
                            ? "Teach and learn in one account"
                            : "A simple way to start learning"}
                    </h2>

                    <p>
                        {isEducator
                            ? "Create Learning Journeys and keep access to every class where you are enrolled."
                            : "Create your account, open your invited class and start learning."}
                    </p>

                    <div className="journey_steps">
                        <PreviewStep
                            number="01"
                            active
                            title="Create your account"
                            description={
                                isEducator
                                    ? "Enter your basic information."
                                    : "Only your name, email and password are required."
                            }
                        />

                        <PreviewStep
                            number="02"
                            title={
                                isEducator
                                    ? "Activate Studio"
                                    : isInvitationRegistration
                                      ? "Join your class"
                                      : "Find a class"
                            }
                            description={
                                isEducator
                                    ? "Complete the secure Stripe payment."
                                    : isInvitationRegistration
                                      ? "Your invitation is connected automatically."
                                      : "Accept an invitation or join from the marketplace."
                            }
                        />

                        <PreviewStep
                            number="03"
                            title={
                                isEducator
                                    ? "Build your content"
                                    : "Start learning"
                            }
                            description={
                                isEducator
                                    ? "Create Stages, Steps and Challenges."
                                    : "Open Steps, complete activities and track progress."
                            }
                        />
                    </div>

                    <div className="register_stats">
                        <div>
                            <strong>
                                {isEducator
                                    ? "$10"
                                    : "Free"}
                            </strong>
                            <span>
                                {isEducator
                                    ? "Monthly"
                                    : "Learner account"}
                            </span>
                        </div>

                        <div>
                            <strong>
                                {isEducator
                                    ? "2-in-1"
                                    : "Simple"}
                            </strong>
                            <span>
                                {isEducator
                                    ? "Teach and learn"
                                    : "Registration"}
                            </span>
                        </div>

                        <div>
                            <strong>
                                {isEducator
                                    ? "Studio"
                                    : "24/7"}
                            </strong>
                            <span>
                                {isEducator
                                    ? "Creator tools"
                                    : "Learning access"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PreviewStep({
    number,
    title,
    description,
    active = false,
}) {
    return (
        <div
            className={`journey_step ${
                active ? "active" : ""
            }`}
        >
            <span>{number}</span>

            <div>
                <strong>{title}</strong>
                <small>{description}</small>
            </div>
        </div>
    );
}
