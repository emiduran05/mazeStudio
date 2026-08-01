import "./Billing.css";
import { useEffect, useState } from "react";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import AsideConfig from "../asideConfig/AsideConfig";
import { apiRequest } from "../../../../api/api"
import ConnectPayouts from "./ConnectPayouts";

export default function Billing() {
    const [darkmode, setDarkmode] = useState(
        localStorage.getItem("darkmode") === "true"
    );

    const [billing, setBilling] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const currentDarkmode =
                localStorage.getItem("darkmode") === "true";

            setDarkmode((previous) =>
                previous !== currentDarkmode
                    ? currentDarkmode
                    : previous
            );
        }, 200);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        async function loadBilling() {
            setLoading(true);
            setError("");

            try {
                const data = await apiRequest("/billing/me");
                setBilling(data.billing);
            } catch (err) {
                setError(
                    err.message ||
                    "Could not load billing information."
                );
            } finally {
                setLoading(false);
            }
        }

        loadBilling();
    }, []);

    async function openBillingPortal() {
    try {

        const response = await apiRequest(
            "/billing/portal",
            {
                method: "POST",
            }
        );

        window.location.href = response.url;

    } catch (error) {
        alert(error.message);
    }
}

    function formatDate(date) {
        if (!date) return "Not available";

        return new Date(date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    }

    function formatBrand(brand) {
        if (!brand) return "Card";

        return (
            brand.charAt(0).toUpperCase() +
            brand.slice(1)
        );
    }

    function getSubscriptionStatus(status) {
        const statuses = {
            ACTIVE: "Active",
            TRIALING: "Trial",
            PAST_DUE: "Past due",
            CANCELED: "Canceled",
            UNPAID: "Unpaid",
            INCOMPLETE: "Incomplete",
            INCOMPLETE_EXPIRED: "Expired",
            PAUSED: "Paused",
        };

        return statuses[status] || status || "Not available";
    }

    if (loading) {
        return (
            <StudioLayout>
                <div
                    className={`settings_main ${
                        darkmode ? "settings-darkmode" : ""
                    }`}
                >
                    <div className="billing_loading">
                        <div className="billing_loader">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>

                        <h2>Loading billing</h2>
                        <p>
                            Retrieving your subscription and payment
                            information...
                        </p>
                    </div>
                </div>
            </StudioLayout>
        );
    }

    const subscription = billing?.subscription;
    const paymentMethod = billing?.paymentMethod;
    const plan = billing?.plan;

    return (
        <StudioLayout>
            <div
                className={`settings_main ${
                    darkmode ? "settings-darkmode" : ""
                }`}
            >
                <div className="settings_main_container">
                    <div className="settings_main_container_intro">
                        <p className="settings_title">
                            Billing
                        </p>

                        <span>
                            Manage your plan, subscription and
                            payment information.
                        </span>
                    </div>

                    <div className="settings_main_container_grid">
                        <div className="settings_main_container_grid_element">
                            <AsideConfig />
                        </div>

                        <div className="settings_main_container_grid_element">
                            <div className="billing_content">
                                {error && (
                                    <div className="billing_alert error">
                                        <i className="fa-solid fa-circle-exclamation"></i>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <section className="billing_plan_card">
                                    <div className="billing_plan_top">
                                        <div>
                                            <span className="billing_section_label">
                                                Current plan
                                            </span>

                                            <h2>{plan?.name}</h2>

                                            <p>
                                                {plan?.price > 0
                                                    ? "Create unlimited learning journeys and manage your learners."
                                                    : "Access invited learning journeys and track your progress."}
                                            </p>
                                        </div>

                                        <div className="billing_plan_price">
                                            <strong>
                                                ${plan?.price || 0}
                                            </strong>

                                            {plan?.interval && (
                                                <span>
                                                    /{plan.interval}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="billing_plan_details">
                                        <div>
                                            <span>
                                                Subscription status
                                            </span>

                                            <strong
                                                className={`billing_status ${
                                                    subscription?.status?.toLowerCase() ||
                                                    "free"
                                                }`}
                                            >
                                                {plan?.price === 0
                                                    ? "Free"
                                                    : getSubscriptionStatus(
                                                          subscription?.status
                                                      )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Current period
                                            </span>

                                            <strong>
                                                {subscription
                                                    ? `${formatDate(
                                                          subscription.currentPeriodStart
                                                      )} – ${formatDate(
                                                          subscription.currentPeriodEnd
                                                      )}`
                                                    : "No billing period"}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Next billing date
                                            </span>

                                            <strong>
                                                {subscription?.cancelAtPeriodEnd
                                                    ? "Subscription will not renew"
                                                    : formatDate(
                                                          subscription?.currentPeriodEnd
                                                      )}
                                            </strong>
                                        </div>
                                    </div>

                                    {subscription?.cancelAtPeriodEnd && (
                                        <div className="billing_notice warning">
                                            <i className="fa-solid fa-triangle-exclamation"></i>

                                            <div>
                                                <strong>
                                                    Subscription cancellation scheduled
                                                </strong>

                                                <p>
                                                    Your Educator Plan will remain
                                                    active until{" "}
                                                    {formatDate(
                                                        subscription.currentPeriodEnd
                                                    )}.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {plan?.price > 0 && (
                                        <div className="billing_plan_actions">
                                            <button
    className="billing_primary_button"
    onClick={openBillingPortal}
>
    Manage subscription
</button>

                                            
                                        </div>
                                    )}
                                </section>

                                <section className="billing_card">
                                    <div className="billing_card_header">
                                        <div>
                                            <h2>Payment method</h2>

                                            <p>
                                                The default payment method
                                                used for your subscription.
                                            </p>
                                        </div>

                                        <button
    className="billing_small_button"
    onClick={openBillingPortal}
>
    Update
</button>
                                    </div>

                                    {paymentMethod ? (
                                        <div className="payment_method">
                                            <div className="payment_method_icon">
                                                <i className="fa-regular fa-credit-card"></i>
                                            </div>

                                            <div className="payment_method_info">
                                                <strong>
                                                    {formatBrand(
                                                        paymentMethod.brand
                                                    )}{" "}
                                                    ending in{" "}
                                                    {paymentMethod.last4}
                                                </strong>

                                                <span>
                                                    Expires{" "}
                                                    {String(
                                                        paymentMethod.expMonth
                                                    ).padStart(2, "0")}
                                                    /
                                                    {paymentMethod.expYear}
                                                </span>
                                            </div>

                                            {paymentMethod.isDefault && (
                                                <span className="default_payment_badge">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="billing_empty">
                                            <i className="fa-regular fa-credit-card"></i>

                                            <div>
                                                <strong>
                                                    No payment method
                                                </strong>

                                                <p>
                                                    No payment method is
                                                    associated with this account.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </section>



                                <section className="billing_security">
                                    <i className="fa-solid fa-shield-halved"></i>

                                    <div>
                                        <strong>
                                            Payments secured by Stripe
                                        </strong>

                                        <p>
                                            Maze Studio never stores your complete
                                            card number or security code. Payment
                                            details are securely managed by Stripe.
                                        </p>
                                    </div>
                                </section>
                                <ConnectPayouts />
                            </div>
                        </div>

                        <div className="settings_main_container_grid_element"></div>
                    </div>
                </div>
            </div>
        </StudioLayout>
    );
}
