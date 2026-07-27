import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../../api/api";
import "./RegisterSuccess.css";

export default function RegisterSuccess() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");

    const [status, setStatus] = useState("loading");
    const [session, setSession] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCheckoutSession() {
            if (!sessionId) {
                setStatus("error");
                setError("Checkout session ID is missing.");
                return;
            }

            try {
                const data = await apiRequest(
                    `/billing/checkout-session/${sessionId}`
                );

                setSession(data);

                const paymentCompleted =
                    data.paymentStatus === "paid" ||
                    data.subscriptionStatus === "active" ||
                    data.subscriptionStatus === "trialing";

                setStatus(paymentCompleted ? "success" : "processing");
            } catch (err) {
                setStatus("error");
                setError(
                    err.message ||
                    "We could not verify your subscription."
                );
            }
        }

        loadCheckoutSession();
    }, [sessionId]);

    return (
        <div className="register_success_page">
            <nav className="register_success_nav">
                <div className="register_success_logo">
                    <img src="/logo.png" alt="Maze Studio logo" />
                    <span>Maze Studio</span>
                </div>
            </nav>

            <main className="register_success_content">
                <div className={`register_success_card ${status}`}>
                    {status === "loading" && (
                        <>
                            <div className="success_loader">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>

                            <h1>Confirming your subscription</h1>

                            <p>
                                We are securely verifying your payment with Stripe.
                            </p>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="success_icon">
                                <i className="fa-solid fa-check"></i>
                            </div>

                            <span className="success_badge">
                                Subscription confirmed
                            </span>

                            <h1>Your educator studio is ready.</h1>

                            <p>
                                Your Maze Studio Educator subscription has been
                                successfully created.
                            </p>

                            {session?.customerEmail && (
                                <div className="success_detail">
                                    <span>Account</span>
                                    <strong>{session.customerEmail}</strong>
                                </div>
                            )}

                            <div className="success_actions">
                                <Link to="/login" className="success_primary">
                                    Continue to login
                                </Link>

                                <Link to="/" className="success_secondary">
                                    Back home
                                </Link>
                            </div>
                        </>
                    )}

                    {status === "processing" && (
                        <>
                            <div className="processing_icon">
                                <i className="fa-regular fa-clock"></i>
                            </div>

                            <span className="processing_badge">
                                Payment processing
                            </span>

                            <h1>Your payment is being confirmed.</h1>

                            <p>
                                Stripe received your Checkout session, but the
                                subscription is still being processed. Your account
                                will activate automatically once payment is confirmed.
                            </p>

                            <div className="success_actions">
                                <Link to="/login" className="success_primary">
                                    Go to login
                                </Link>

                                <button
                                    type="button"
                                    className="success_secondary"
                                    onClick={() => window.location.reload()}
                                >
                                    Check again
                                </button>
                            </div>
                        </>
                    )}

                    {status === "error" && (
                        <>
                            <div className="error_icon">
                                <i className="fa-solid fa-triangle-exclamation"></i>
                            </div>

                            <span className="error_badge">
                                Verification failed
                            </span>

                            <h1>We could not verify your subscription.</h1>

                            <p>{error}</p>

                            <div className="success_actions">
                                <Link to="/register" className="success_primary">
                                    Return to registration
                                </Link>

                                <Link to="/" className="success_secondary">
                                    Back home
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}