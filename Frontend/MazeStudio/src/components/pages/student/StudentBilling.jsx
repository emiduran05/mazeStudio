import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../../api/api";
import "./StudentBilling.css";
import "./StudentBillingEnhancements.css";

const money = (amount = 0, currency = "USD") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount) / 100);

const statusLabel = (value) => String(value || "Unknown").replaceAll("_", " ").toLowerCase();

export default function StudentBilling() {
    const [billing, setBilling] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");

    async function load() {
        setLoading(true);
        setError("");
        try {
            const [billingResult, subscriptionResult, orderResult] = await Promise.all([
                apiRequest("/billing/me"),
                apiRequest("/me/offering-subscriptions"),
                apiRequest("/me/offering-orders"),
            ]);
            setBilling(billingResult.billing);
            setSubscriptions(subscriptionResult.subscriptions || []);
            setOrders(orderResult.orders || []);
        } catch (requestError) {
            setError(requestError.message || "Could not load your billing information.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const activeSubscriptions = useMemo(
        () => subscriptions.filter((item) => ["ACTIVE", "TRIALING"].includes(String(item.status).toUpperCase())),
        [subscriptions]
    );
    const totalPaid = useMemo(
        () => orders.filter((item) => item.status === "PAID").reduce((sum, item) => sum + Number(item.amount || 0), 0),
        [orders]
    );
    const primaryCurrency = orders[0]?.currency || subscriptions[0]?.currency || "USD";

    async function openPortal() {
        setBusy("portal"); setError("");
        try {
            const result = await apiRequest("/billing/portal", { method: "POST" });
            window.location.assign(result.url);
        } catch (requestError) {
            setError(requestError.message || "Stripe billing is not available yet.");
            setBusy("");
        }
    }

    async function cancelSubscription(item) {
        if (!window.confirm(`Cancel the monthly renewal for “${item.title}”? Your current paid period remains active.`)) return;
        setBusy(item.id); setError("");
        try {
            await apiRequest(`/me/offering-subscriptions/${item.id}/cancel`, { method: "POST" });
            await load();
        } catch (requestError) {
            setError(requestError.message || "Could not cancel this subscription.");
        } finally { setBusy(""); }
    }

    async function requestRefund(item) {
        const reason = window.prompt("Why are you requesting a refund?");
        if (!reason?.trim()) return;
        setBusy(item.id); setError("");
        try {
            await apiRequest("/refund-requests", { method: "POST", body: JSON.stringify({ orderId: item.id, reason }) });
            await load();
        } catch (requestError) {
            setError(requestError.message || "Could not request this refund.");
        } finally { setBusy(""); }
    }

    if (loading) return <div className="student_billing_loading"><i className="fa-solid fa-spinner fa-spin" /> Loading billing…</div>;

    return <div className="student_billing_page">
        {error && <div className="student_billing_alert"><i className="fa-solid fa-circle-exclamation" />{error}</div>}

        <section className="student_billing_hero">
            <div><span className="student_section_kicker">Learner billing</span><h2>Your classes, purchases and payments</h2><p>Review everything you have purchased through Maze Studio and manage recurring 1:1 classes.</p></div>
            <div className="student_billing_hero_icon"><i className="fa-solid fa-wallet" /></div>
        </section>

        <section className="student_billing_stats">
            <article><i className="fa-solid fa-arrows-rotate" /><span><small>Active subscriptions</small><strong>{activeSubscriptions.length}</strong></span></article>
            <article><i className="fa-solid fa-bag-shopping" /><span><small>Completed purchases</small><strong>{orders.filter((item) => item.status === "PAID").length}</strong></span></article>
            <article><i className="fa-solid fa-receipt" /><span><small>Recorded payments</small><strong>{money(totalPaid, primaryCurrency)}</strong></span></article>
        </section>

        <div className="student_billing_columns">
            <main className="student_billing_stack">
                <section className="student_billing_card">
                    <header><div><span className="student_section_kicker">Recurring</span><h2>Weekly 1:1 subscriptions</h2></div></header>
                    {subscriptions.length ? <div className="student_billing_list">{subscriptions.map((item) => <article key={item.id}>
                        <div className="student_billing_item_icon"><i className="fa-solid fa-calendar-check" /></div>
                        <div><strong>{item.title}</strong><small>{item.weekly_class_count} {item.weekly_class_count === 1 ? "class" : "classes"} each week · {money(item.monthly_amount, item.currency)} monthly</small><em className={item.cancel_at_period_end ? "ending" : "active"}>{item.cancel_at_period_end ? "Ends after current period" : statusLabel(item.status)}</em></div>
                        {!item.cancel_at_period_end && ["ACTIVE", "TRIALING"].includes(String(item.status).toUpperCase()) && <button disabled={busy === item.id} onClick={() => cancelSubscription(item)}>{busy === item.id ? "Cancelling…" : "Cancel renewal"}</button>}
                    </article>)}</div> : <div className="student_billing_empty"><i className="fa-solid fa-calendar-plus" /><div><strong>No recurring classes</strong><p>Monthly 1:1 subscriptions will appear here.</p></div><Link to="/marketplace">Explore classes</Link></div>}
                </section>

                <section className="student_billing_card">
                    <header><div><span className="student_section_kicker">History</span><h2>Purchases and refunds</h2></div></header>
                    {orders.length ? <div className="student_billing_list">{orders.map((item) => <article key={item.id}>
                        <div className="student_billing_item_icon"><i className="fa-solid fa-graduation-cap" /></div>
                        <div><strong>{item.title}</strong><small>{money(item.amount, item.currency)} · {statusLabel(item.billing_type)}</small><em>{statusLabel(item.refund_status || item.status)}</em></div>
                        {item.status === "PAID" && !item.refund_status && <button disabled={busy === item.id} onClick={() => requestRefund(item)}>{busy === item.id ? "Sending…" : "Request refund"}</button>}
                    </article>)}</div> : <div className="student_billing_empty"><i className="fa-solid fa-basket-shopping" /><div><strong>No purchases yet</strong><p>Your Marketplace purchases will be recorded here.</p></div><Link to="/marketplace">Visit Marketplace</Link></div>}
                </section>
            </main>

            <aside className="student_billing_side">
                <section className="student_billing_card stripe_card"><i className="fa-brands fa-stripe" /><h2>Payment methods</h2>{billing?.paymentMethods?.length?<div className="student_payment_methods">{billing.paymentMethods.map(method=><p key={method.id}><i className="fa-regular fa-credit-card"/><span><strong>{method.brand?.toUpperCase()} ···· {method.last4}</strong><small>Expires {method.expMonth}/{method.expYear}{method.isDefault?" · Default":""}</small></span></p>)}</div>:billing?.paymentMethod?<p>{billing.paymentMethod.brand} ending in <strong>{billing.paymentMethod.last4}</strong></p>:<p>Your card information is securely stored by Stripe after your first purchase.</p>}<button onClick={openPortal} disabled={busy === "portal" || (!orders.length && !subscriptions.length)}>{busy === "portal" ? "Opening…" : "Manage with Stripe"}</button></section>
                {billing?.paymentHistory?.length>0&&<section className="student_billing_card"><header><div><span className="student_section_kicker">Stripe history</span><h2>Receipts</h2></div></header><div className="student_billing_list compact">{billing.paymentHistory.map(item=><article key={item.id}><div className="student_billing_item_icon"><i className="fa-solid fa-file-invoice-dollar"/></div><div><strong>{money(item.amount,item.currency)}</strong><small>{new Date(item.createdAt).toLocaleDateString(undefined,{dateStyle:"medium"})} · {statusLabel(item.status)}</small></div>{item.receiptUrl&&<a href={item.receiptUrl} target="_blank" rel="noreferrer">Receipt</a>}</article>)}</div></section>}
                <section className="student_billing_card policy_card"><i className="fa-solid fa-shield-heart" /><h3>Refund protection</h3><p>You can request a refund before attending your first class. The educator reviews the request and future sessions are cancelled when approved.</p></section>
                <Link to="/student/settings" className="student_billing_back"><i className="fa-solid fa-arrow-left" /> Back to settings</Link>
            </aside>
        </div>
    </div>;
}
