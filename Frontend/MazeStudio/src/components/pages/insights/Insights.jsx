import { useEffect, useState } from "react";
import StudioLayout from "../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../api/api";
import "./Insights.css";
import "./InsightsFilters.css";
import RefundRequests from "./RefundRequests";

const relativeDate = (value) => {
    if (!value) return "No activity yet";
    const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
};

export default function Insights() {
    const [data, setData] = useState(null);
    const [scope, setScope] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        const [scopeType, scopeId] = scope.split(":");
        const query = scopeType === "journey"
            ? `?journeyId=${encodeURIComponent(scopeId)}`
            : scopeType === "path"
                ? `?pathId=${encodeURIComponent(scopeId)}`
                : "";
        apiRequest(`/insights/overview${query}`)
            .then((response) => active && setData(response))
            .catch((requestError) => active && setError(requestError.message || "Could not load insights."))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [scope]);

    if (loading) return <StudioLayout><main className="insights_page"><div className="insights_state"><i className="fa-solid fa-chart-line" /><h2>Preparing your insights</h2><p>Analyzing learner progress and activity…</p></div></main></StudioLayout>;
    if (error) return <StudioLayout><main className="insights_page"><div className="insights_state error"><i className="fa-solid fa-triangle-exclamation" /><h2>Insights are unavailable</h2><p>{error}</p></div></main></StudioLayout>;

    const summary = data?.summary || {};
    const finance = data?.finance?.currencies?.[0];
    const formatMoney = (amount = 0, currency = "MXN") => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100);
    const cards = [
        ["fa-user-graduate", "Active enrollments", summary.enrollments || 0, `${summary.completed_enrollments || 0} completed`],
        ["fa-chart-simple", "Average progress", `${summary.average_progress || 0}%`, "Across all active journeys"],
        ["fa-route", "Learning Journeys", summary.journeys || 0, "Published and draft courses"],
        ["fa-triangle-exclamation", "Need attention", summary.learners_at_risk || 0, "Inactive for 14+ days"],
    ];

    return <StudioLayout><main className="insights_page">
        <header className="insights_header"><div><span>Studio analytics</span><h1>Insights</h1><p>A practical view of learner momentum, course health, and what deserves your attention.</p></div><div className="insights_period"><i className="fa-regular fa-calendar" /> All-time overview</div></header>

        <section className="insights_scope_bar">
            <div><i className="fa-solid fa-filter" /><span><strong>Insight scope</strong><small>Compare your whole Studio, a Journey, or one personalized Path.</small></span></div>
            <label><span>View data for</span><select value={scope} onChange={(event)=>setScope(event.target.value)}>
                <option value="all">All Studio</option>
                {data.filters?.journeys?.length > 0 && <optgroup label="Learning Journeys">{data.filters.journeys.map((journey)=><option value={`journey:${journey.id}`} key={journey.id}>{journey.title}</option>)}</optgroup>}
                {data.filters?.paths?.length > 0 && <optgroup label="Personalized Learning Paths">{data.filters.paths.map((path)=><option value={`path:${path.id}`} key={path.id}>{path.learner_name} — {path.title} ({path.journey_title})</option>)}</optgroup>}
            </select></label>
        </section>

        <section className="insights_metrics">{cards.map(([icon,label,value,hint])=><article key={label}><div className="insights_metric_icon"><i className={`fa-solid ${icon}`} /></div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></article>)}</section>

        <section className="insights_grid">
            <RefundRequests />
            <article className="insights_card insights_courses"><header><div><span>Course health</span><h2>Journey performance</h2></div><small>{data.journeys.length} journeys</small></header>
                <div className="insights_course_list">{data.journeys.length ? data.journeys.map((journey)=><div className="insights_course" key={journey.id}><div className="insights_course_top"><div><strong>{journey.title}</strong><span>{journey.students} students · {journey.total_steps} steps</span></div><b>{journey.average_progress}%</b></div><div className="insights_progress"><span style={{width:`${journey.average_progress}%`}} /></div></div>) : <Empty text="Create a Learning Journey to start measuring course performance." />}</div>
            </article>

            <article className="insights_card insights_revenue"><header><div><span>Business</span><h2>Course earnings</h2></div><em>{finance?.currency || "Live"}</em></header><div className="insights_revenue_value"><strong>{formatMoney(finance?.educator_earnings, finance?.currency)}</strong><span>Net educator earnings after Maze Studio's 5% fee</span></div><div className="insights_future_grid"><div><span>Gross sales</span><strong>{formatMoney(finance?.gross_revenue, finance?.currency)}</strong></div><div><span>Sales</span><strong>{finance?.sales || 0}</strong></div><div><span>Platform fees</span><strong>{formatMoney(finance?.platform_fees, finance?.currency)}</strong></div><div><span>Refunds</span><strong>{finance?.refunds || 0}</strong></div></div><p><i className="fa-solid fa-circle-info" /> Includes course purchases and recurring 1:1 subscriptions. Payout timing is managed by Stripe Connect.</p></article>

            <article className="insights_card insights_learners"><header><div><span>Intervention queue</span><h2>Learners to follow up</h2></div></header><div className="insights_learner_list">{data.learners.length ? data.learners.map((learner)=><div key={`${learner.id}-${learner.journey_title}`}><span className="insights_avatar">{learner.name?.split(" ").map((part)=>part[0]).slice(0,2).join("") || "L"}</span><div><strong>{learner.name || "Managed learner"}</strong><small>{learner.journey_title} · {relativeDate(learner.last_activity)}</small></div><b>{learner.progress}%</b></div>) : <Empty text="No enrolled learners require attention yet." />}</div></article>

            <article className="insights_card insights_activity"><header><div><span>Live signal</span><h2>Recent learning activity</h2></div></header><div className="insights_activity_list">{data.recentActivity.length ? data.recentActivity.map((item,index)=><div key={`${item.type}-${item.occurred_at}-${index}`}><i className={`fa-solid ${item.type === "CHALLENGE" ? "fa-flag-checkered" : "fa-circle-check"}`} /><div><strong>{item.learner || "Private learner"}</strong><span>{item.type === "CHALLENGE" ? "submitted" : "updated"} {item.item}</span><small>{item.journey} · {relativeDate(item.occurred_at)}</small></div><b>{item.detail?.replaceAll("_", " ")}</b></div>) : <Empty text="Completed Steps and Challenge submissions will appear here." />}</div></article>
        </section>
    </main></StudioLayout>;
}

function Empty({ text }) { return <div className="insights_empty"><i className="fa-regular fa-compass" /><p>{text}</p></div>; }
