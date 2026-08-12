import { useEffect, useState } from "react";
import { apiRequest } from "../../../../../api/api";
import "./JourneyCohorts.css";

const initial = { title: "", startsAt: "", endsAt: "", capacity: "", weekly: true, meetingUrl: "" };

export default function JourneyCohorts({ offerings }) {
    const eligible = offerings.filter(item => ["COHORT", "HYBRID", "WEBINAR"].includes(item.offering_type));
    const [offeringId, setOfferingId] = useState("");
    const [cohorts, setCohorts] = useState([]);
    const [form, setForm] = useState(initial);
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => { if (!offeringId && eligible[0]) setOfferingId(eligible[0].id); }, [offerings, offeringId]);
    const load = () => offeringId && apiRequest(`/offerings/${offeringId}/cohorts`).then(data => setCohorts(data.cohorts || []));
    useEffect(() => { load(); }, [offeringId]);
    async function create(event) {
        event.preventDefault();
        setError("");
        try { await apiRequest(`/offerings/${offeringId}/cohorts`, { method: "POST", body: JSON.stringify({ ...form, capacity: Number(form.capacity), startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, recurrenceRule: form.weekly ? { frequency: "WEEKLY", interval: 1 } : {} }) });
        setOpen(false); setForm(initial); load(); } catch (requestError) { setError(requestError.message); }
    }
    async function manage(cohort) { const data = await apiRequest(`/cohorts/${cohort.id}/members`); setMembers({ cohort, rows: data.members || [] }); }
    async function toggle(row) {
        if (row.member_status === "ACTIVE") await apiRequest(`/cohorts/${members.cohort.id}/members/${row.enrollment_id}`, { method: "DELETE" });
        else await apiRequest(`/cohorts/${members.cohort.id}/members`, { method: "POST", body: JSON.stringify({ enrollmentId: row.enrollment_id }) });
        manage(members.cohort); load();
    }
    async function toggleSales(cohort) {
        const status = cohort.status === "OPEN" ? "DRAFT" : "OPEN";
        setError("");
        try { await apiRequest(`/cohorts/${cohort.id}`, { method: "PUT", body: JSON.stringify({ status }) }); load(); }
        catch (requestError) { setError(requestError.message); }
    }
    if (!eligible.length) return null;
    return <section className="cohorts_section">{error&&<div className="offers_alert">{error}</div>}<header><div><span>Groups</span><h2>Groups</h2><p>Run the same experience with separate dates, capacity and students.</p></div><div><select value={offeringId} onChange={e => setOfferingId(e.target.value)}>{eligible.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select><button onClick={() => setOpen(true)}><i className="fa-solid fa-plus"/> New group</button></div></header>
        <div className="cohort_cards">{cohorts.map(cohort => <article key={cohort.id}><div><span className={`cohort_state ${cohort.status.toLowerCase()}`}>{cohort.status}</span><h3>{cohort.title}</h3><p>{cohort.starts_at ? new Date(cohort.starts_at).toLocaleDateString() : "Dates not set"}{cohort.ends_at ? ` — ${new Date(cohort.ends_at).toLocaleDateString()}` : ""}</p></div><div className="cohort_capacity"><strong>{cohort.member_count}/{cohort.capacity}</strong><span>students</span></div><button onClick={() => toggleSales(cohort)}>{cohort.status === "OPEN" ? "Close enrollment" : "Open enrollment"}</button><button onClick={() => manage(cohort)}>Manage students</button></article>)}</div>
        {open && <div className="cohort_modal_backdrop" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}><form className="cohort_modal" onSubmit={create}><header><div><span>New group</span><h2>Create a group</h2></div><button type="button" onClick={() => setOpen(false)}><i className="fa-solid fa-xmark"/></button></header><label>Group name<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="September 2026 group"/></label><div className="cohort_form_grid"><label>Starts<input type="datetime-local" value={form.startsAt} onChange={e => setForm({ ...form, startsAt: e.target.value })}/></label><label>Ends<input type="datetime-local" value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })}/></label><label>Capacity<input type="number" min="1" required value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}/></label><label>Meeting link<input type="url" value={form.meetingUrl} onChange={e => setForm({ ...form, meetingUrl: e.target.value })}/></label></div><label className="cohort_check"><input type="checkbox" checked={form.weekly} onChange={e => setForm({ ...form, weekly: e.target.checked })}/> Weekly class schedule</label><footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="submit">Create open group</button></footer></form></div>}
        {members && <div className="cohort_modal_backdrop" onMouseDown={e => e.target === e.currentTarget && setMembers(null)}><section className="cohort_modal"><header><div><span>Group members</span><h2>{members.cohort.title}</h2></div><button onClick={() => setMembers(null)}><i className="fa-solid fa-xmark"/></button></header><div className="cohort_member_list">{members.rows.map(row => <div key={row.enrollment_id}><span><strong>{row.first_name} {row.last_name}</strong><small>{row.contact_email || "Managed student"}</small></span><button className={row.member_status === "ACTIVE" ? "remove" : ""} onClick={() => toggle(row)}>{row.member_status === "ACTIVE" ? "Remove" : "Add"}</button></div>)}</div></section></div>}
    </section>;
}
