import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../../api/api";
import "./StudentPortal.css";
import "./StudentPortalControls.css";

export default function StudentPortal() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [memory, setMemory] = useState(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest(`/enrollments/${enrollmentId}/managed-progress`),
      apiRequest(`/enrollments/${enrollmentId}/teaching-memory`),
    ]).then(([progress, teaching]) => { setData(progress); setMemory(teaching); })
      .catch((requestError) => setError(requestError.message || "Could not load the Student portal."));
  }, [enrollmentId]);

  const stats = useMemo(() => {
    const steps = data?.steps || [];
    const completed = steps.filter((step) => step.progress_status === "COMPLETED").length;
    const inProgress = steps.filter((step) => step.progress_status === "IN_PROGRESS").length;
    return { total: steps.length, completed, inProgress, percent: steps.length ? Math.round(completed * 100 / steps.length) : 0 };
  }, [data]);
  const grouped = useMemo(() => Object.entries((data?.steps || []).reduce((result, step) => {
    (result[step.stage_title] ??= []).push(step); return result;
  }, {})), [data]);

  async function changeProgress(stepId, status) {
    await apiRequest(`/enrollments/${enrollmentId}/managed-progress/${stepId}`, { method: "PUT", body: JSON.stringify({ status }) });
    setData((current) => ({ ...current, steps: current.steps.map((step) => step.id === stepId ? { ...step, progress_status: status } : step) }));
  }
  async function saveNote(step) {
    const summary = (notes[step.id] || "").trim(); if (!summary) return;
    setSaving(step.id);
    try {
      const saved = memory?.memory || {};
      const result = await apiRequest(`/enrollments/${enrollmentId}/session-notes`, { method: "POST", body: JSON.stringify({ currentStepId: step.id, summary, learningStatus: step.progress_status === "COMPLETED" ? "READY_TO_ADVANCE" : "IN_PROGRESS", strengths: saved.strengths || "", needsReview: saved.needs_review || "", homework: saved.homework || "", nextTopic: saved.next_topic || "", privateNote: saved.private_note || "" }) });
      setMemory((current) => ({ ...current, memory: { ...(current?.memory || {}), current_step_id: step.id }, history: [{ ...result.note, step_title: step.title }, ...(current?.history || [])] }));
      setNotes((current) => ({ ...current, [step.id]: "" }));
    } finally { setSaving(""); }
  }

  if (error) return <StudioLayout><main className="student_portal_state"><h1>Could not open this Student</h1><p>{error}</p><button onClick={() => navigate(-1)}>Go back</button></main></StudioLayout>;
  if (!data || !memory) return <StudioLayout><main className="student_portal_state"><i className="fa-solid fa-spinner fa-spin"/><h1>Loading progress…</h1></main></StudioLayout>;
  const enrollment = data.enrollment || {};
  const name = [enrollment.first_name, enrollment.last_name].filter(Boolean).join(" ") || "Student";

  return <StudioLayout><main className="student_portal">
    <header className="student_portal_hero"><button onClick={() => navigate(`/studio/journey/${enrollment.learning_journey_id}?section=students`)}><i className="fa-solid fa-arrow-left"/> Back to Students</button><div className="student_portal_identity"><span>{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><small>STUDENT PORTAL</small><h1>{name}</h1><p>Independent course progress and teaching notes</p></div></div><div className="student_portal_progress"><div style={{ "--progress": `${stats.percent}%` }}><strong>{stats.percent}%</strong></div><span><b>{stats.completed} of {stats.total}</b><small>Steps completed</small></span></div></header>
    <section className="student_portal_stats"><PortalStat icon="fa-circle-check" value={stats.completed} label="Completed"/><PortalStat icon="fa-person-running" value={stats.inProgress} label="In progress"/><PortalStat icon="fa-book-open" value={stats.total - stats.completed} label="Remaining"/><PortalStat icon="fa-note-sticky" value={memory.history?.length || 0} label="Saved notes"/></section>
    <div className="student_portal_grid"><section className="student_portal_steps"><header><div><small>COURSE JOURNEY</small><h2>Progress by Step</h2></div><span>Open a Step to teach and manage this Student&apos;s progress</span></header>
      {grouped.map(([stage, steps]) => <section className="student_stage_group" key={stage}><h3>{stage}</h3>{steps.map((step) => {
        const stepNotes = (memory.history || []).filter((note) => note.step_id === step.id);
        return <article className={`student_step_row status_${step.progress_status.toLowerCase()}`} key={step.id}><div className="student_step_status_icon"><i className={`fa-solid ${step.progress_status === "COMPLETED" ? "fa-check" : "fa-book-open"}`}/></div><div className="student_step_main"><div className="student_step_title"><button className="student_step_open" onClick={() => navigate(`/studio/students/${enrollmentId}/steps/${step.id}`)}><span><strong>{step.title}</strong><small>{step.completed_at ? `Completed ${new Date(step.completed_at).toLocaleDateString()}` : step.progress_status.replace("_", " ").toLowerCase()}</small></span><i className="fa-solid fa-chevron-right"/></button><select value={step.progress_status} onChange={(event) => changeProgress(step.id, event.target.value)}><option value="NOT_STARTED">Not started</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></div><div className="student_step_note"><textarea value={notes[step.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [step.id]: event.target.value }))} placeholder="Where did you stop? What did the Student understand? What needs review?"/><button disabled={saving === step.id || !(notes[step.id] || "").trim()} onClick={() => saveNote(step)}>{saving === step.id ? <i className="fa-solid fa-spinner fa-spin"/> : <i className="fa-solid fa-plus"/>} Save note</button></div>{stepNotes.length > 0 && <details><summary>{stepNotes.length} {stepNotes.length === 1 ? "note" : "notes"} for this Step</summary>{stepNotes.map((note) => <div className="student_saved_note" key={note.id}><span>{new Date(note.occurred_at).toLocaleDateString()}</span><p>{note.summary}</p></div>)}</details>}</div></article>;
      })}</section>)}</section>
      <aside className="student_portal_sidebar"><section><small>LAST CHECKPOINT</small><h3>{memory.memory?.current_step_id ? (memory.steps || []).find((step) => step.id === memory.memory.current_step_id)?.title || "Current Step" : "No checkpoint yet"}</h3><p>{memory.memory?.next_topic || "Open a Step and save a note to remember exactly where to continue."}</p></section><section><small>RECENT ACTIVITY</small>{(memory.history || []).slice(0, 6).map((note) => <article key={note.id}><i className="fa-solid fa-note-sticky"/><div><strong>{note.step_title || "General note"}</strong><p>{note.summary || note.next_topic}</p><small>{new Date(note.occurred_at).toLocaleDateString()}</small></div></article>)}</section></aside>
    </div>
  </main></StudioLayout>;
}

function PortalStat({ icon, value, label }) { return <article><i className={`fa-solid ${icon}`}/><span><strong>{value}</strong><small>{label}</small></span></article>; }
