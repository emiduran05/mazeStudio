import { useEffect, useState } from "react";
import { apiRequest } from "../../../../../api/api";
import "./JourneySessionsPage.css";

const toLocalInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16);
};

export default function JourneySessionsPage({ journeyId }) {
    const [cohorts, setCohorts] = useState([]);
    const [cohortId, setCohortId] = useState("");
    const [series, setSeries] = useState([]);
    const [selectedSeries, setSelectedSeries] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({
        title: "", firstStartsAt: "", durationMinutes: 60,
        frequency: "WEEKLY", occurrenceCount: 8, meetingUrl: "",
    });

    useEffect(() => {
        setLoading(true);
        setError("");
        apiRequest(`/learning-journeys/${journeyId}/offerings`).then(async (data) => {
            const eligible = (data.offerings || []).filter((item) =>
                ["COHORT", "HYBRID"].includes(item.offering_type));
            const nested = await Promise.all(eligible.map(async (offering) => {
                const result = await apiRequest(`/offerings/${offering.id}/cohorts`);
                return (result.cohorts || []).map((cohort) => ({
                    ...cohort, offeringTitle: offering.title,
                }));
            }));
            const groups = nested.flat();
            setCohorts(groups);
            if (groups[0]) setCohortId(groups[0].id);
        }).catch((requestError) => setError(requestError.message || "Could not load session groups."))
            .finally(() => setLoading(false));
    }, [journeyId]);

    function loadSeries() {
        if (!cohortId) { setSeries([]); return; }
        setError("");
        apiRequest(`/cohorts/${cohortId}/session-series`)
            .then((data) => setSeries(data.series || []))
            .catch((requestError) => setError(requestError.message || "Could not load session series."));
    }
    useEffect(() => { loadSeries(); }, [cohortId]);

    async function createSeries(event) {
        event.preventDefault();
        setError("");
        try { await apiRequest(`/cohorts/${cohortId}/session-series`, {
            method: "POST",
            body: JSON.stringify({
                ...form,
                firstStartsAt: new Date(form.firstStartsAt).toISOString(),
                durationMinutes: Number(form.durationMinutes),
                occurrenceCount: Number(form.occurrenceCount),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }),
        });
        setCreateOpen(false);
        loadSeries();
        } catch (requestError) { setError(requestError.message || "Could not create the session series."); }
    }

    async function showSeries(item) {
        setSelectedSeries(item);
        try { const data = await apiRequest(`/session-series/${item.id}/events`);
        setEvents(data.events || []); } catch (requestError) { setError(requestError.message || "Could not load the sessions."); }
    }

    async function updateEvent(event) {
        event.preventDefault();
        await apiRequest(`/calendar/events/${editing.event.id}/scope`, {
            method: "PATCH",
            body: JSON.stringify({
                scope: editing.scope,
                startsAt: new Date(editing.startsAt).toISOString(),
                status: editing.status,
                meetingUrl: editing.meetingUrl,
            }),
        });
        setEditing(null);
        await showSeries(selectedSeries);
        loadSeries();
    }

    if (loading) return <div className="builder_empty_state"><div className="builder_empty_icon"><i className="fa-solid fa-spinner fa-spin" /></div><h2>Loading Sessions</h2><p>Finding your live offers, cohorts and recurring schedules.</p></div>;
    if (error && !cohorts.length) return <div className="builder_empty_state"><div className="builder_empty_icon"><i className="fa-solid fa-triangle-exclamation" /></div><h2>Sessions could not be loaded</h2><p>{error}</p><button className="builder_primary_button" onClick={() => window.location.reload()}>Try again</button></div>;
    if (!cohorts.length) return <div className="builder_empty_state">
        <div className="builder_empty_icon"><i className="fa-solid fa-calendar-days" /></div>
        <h2>Create a cohort first</h2>
        <p>Session series require a Cohort or Hybrid offer with at least one cohort.</p>
    </div>;

    return <section className="sessions_workspace">
        {error && <div className="sessions_error"><i className="fa-solid fa-circle-exclamation" /> {error}</div>}
        <header><div><span>Live delivery</span><h2>Session series</h2>
            <p>Generate recurring classes and keep learner calendars synchronized.</p></div>
            <div><select value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                {cohorts.map((item) => <option value={item.id} key={item.id}>{item.offeringTitle} — {item.title}</option>)}
            </select><button onClick={() => setCreateOpen(true)}><i className="fa-solid fa-plus" /> Schedule series</button></div>
        </header>
        {series.length ? <div className="session_series_grid">{series.map((item) => <article key={item.id}>
            <div className="session_series_icon"><i className="fa-solid fa-repeat" /></div>
            <div><span>{item.recurrence_rule?.frequency || "WEEKLY"}</span><h3>{item.title}</h3>
                <p>{item.occurrence_count} sessions · {item.upcoming_count} upcoming</p>
                {item.next_session && <small>Next: {new Date(item.next_session).toLocaleString()}</small>}</div>
            <button onClick={() => showSeries(item)}>View sessions</button>
        </article>)}</div> : <div className="sessions_empty"><i className="fa-solid fa-calendar-plus"/><div><h3>No session series yet</h3><p>Create a recurring schedule for this Cohort. Every member will receive the classes in their calendar.</p></div><button onClick={()=>setCreateOpen(true)}>Schedule first series</button></div>}

        {createOpen && <div className="session_modal_backdrop"><form className="session_modal" onSubmit={createSeries}>
            <header><div><span>Recurring schedule</span><h2>Create session series</h2></div>
                <button type="button" onClick={() => setCreateOpen(false)}><i className="fa-solid fa-xmark" /></button></header>
            <label>Series title<input required value={form.title} onChange={(e) => setForm({...form, title:e.target.value})} /></label>
            <div className="session_form_grid">
                <label>First session<input type="datetime-local" required value={form.firstStartsAt} onChange={(e) => setForm({...form, firstStartsAt:e.target.value})} /></label>
                <label>Frequency<select value={form.frequency} onChange={(e) => setForm({...form, frequency:e.target.value})}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option></select></label>
                <label>Number of sessions<input type="number" min="1" max="104" value={form.occurrenceCount} onChange={(e) => setForm({...form, occurrenceCount:e.target.value})} /></label>
                <label>Duration (minutes)<input type="number" min="15" value={form.durationMinutes} onChange={(e) => setForm({...form, durationMinutes:e.target.value})} /></label>
            </div>
            <label>Meeting link<input type="url" value={form.meetingUrl} onChange={(e) => setForm({...form, meetingUrl:e.target.value})} /></label>
            <footer><button type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit">Generate sessions</button></footer>
        </form></div>}

        {selectedSeries && <div className="session_modal_backdrop"><section className="session_modal session_list_modal">
            <header><div><span>Series schedule</span><h2>{selectedSeries.title}</h2></div><button onClick={() => setSelectedSeries(null)}><i className="fa-solid fa-xmark" /></button></header>
            <div className="session_event_list">{events.map((item) => <article key={item.id} className={item.status.toLowerCase()}>
                <time><strong>{new Date(item.starts_at).toLocaleDateString()}</strong><span>{new Date(item.starts_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></time>
                <div><strong>Session {item.occurrence_index}</strong><small>{item.status}</small></div>
                <button onClick={() => setEditing({event:item,scope:"SINGLE",startsAt:toLocalInput(item.starts_at),meetingUrl:item.meeting_url || "",status:item.status})}>Manage</button>
            </article>)}</div>
        </section></div>}

        {editing && <div className="session_modal_backdrop"><form className="session_modal" onSubmit={updateEvent}>
            <header><div><span>Update schedule</span><h2>Manage session {editing.event.occurrence_index}</h2></div><button type="button" onClick={() => setEditing(null)}><i className="fa-solid fa-xmark" /></button></header>
            <label>Apply change to<select value={editing.scope} onChange={(e) => setEditing({...editing,scope:e.target.value})}><option value="SINGLE">This session only</option><option value="FUTURE">This and future sessions</option><option value="SERIES">Entire series</option></select></label>
            <label>New date and time<input type="datetime-local" value={editing.startsAt} onChange={(e) => setEditing({...editing,startsAt:e.target.value})} /></label>
            <label>Meeting link<input type="url" value={editing.meetingUrl} onChange={(e) => setEditing({...editing,meetingUrl:e.target.value})} /></label>
            <label>Status<select value={editing.status} onChange={(e) => setEditing({...editing,status:e.target.value})}><option value="SCHEDULED">Scheduled</option><option value="CANCELLED">Cancelled</option><option value="COMPLETED">Completed</option></select></label>
            <footer><button type="button" onClick={() => setEditing(null)}>Close</button><button type="submit">Save changes</button></footer>
        </form></div>}
    </section>;
}
