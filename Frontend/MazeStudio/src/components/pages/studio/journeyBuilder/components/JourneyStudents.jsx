import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../../../api/api";
import "./JourneyStudents.css";

const STATUS_OPTIONS = [
    "ACTIVE",
    "SUSPENDED",
    "COMPLETED",
    "CANCELLED",
];

export default function JourneyStudents({ journeyId }) {
    const [enrollments, setEnrollments] = useState([]);
    const [email, setEmail] = useState("");
    const [addMode, setAddMode] = useState("MANAGED");
    const [managedForm, setManagedForm] = useState({
        firstName: "", lastName: "", email: "", privateNotes: "",
    });
    const [linkUrl, setLinkUrl] = useState("");
    const [progressPanel, setProgressPanel] = useState(null);
    const [linkPanel, setLinkPanel] = useState(null);
    const [linkEmail, setLinkEmail] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        let active = true;

        apiRequest(
            `/learning-journeys/${journeyId}/enrollments`
        )
            .then((data) => {
                if (active) {
                    setEnrollments(data.enrollments || []);
                }
            })
            .catch((err) => {
                if (active) {
                    setError(
                        err.message ||
                            "Could not load the enrolled Students."
                    );
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [journeyId]);

    async function loadEnrollments() {
        setLoading(true);
        setError("");

        try {
            const data = await apiRequest(
                `/learning-journeys/${journeyId}/enrollments`
            );

            setEnrollments(data.enrollments || []);
        } catch (err) {
            setError(
                err.message ||
                    "Could not load the enrolled Students."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleEnrollStudent(event) {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError("Enter the Student email.");
            return;
        }

        setSubmitting(true);
        setError("");
        setMessage("");

        try {
            const data = await apiRequest(
                `/learning-journeys/${journeyId}/enrollments`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        email: normalizedEmail,
                    }),
                }
            );

            const newEnrollment = {
                ...data.enrollment,
                first_name: data.learner?.first_name,
                last_name: data.learner?.last_name,
                email: data.learner?.email,
                student_account_status:
                    data.student?.status,
            };

            setEnrollments((current) => {
                const existingIndex = current.findIndex(
                    (enrollment) =>
                        enrollment.id === newEnrollment.id
                );

                if (existingIndex === -1) {
                    return [
                        newEnrollment,
                        ...current,
                    ];
                }

                return current.map((enrollment) =>
                    enrollment.id === newEnrollment.id
                        ? {
                              ...enrollment,
                              ...newEnrollment,
                          }
                        : enrollment
                );
            });

            setEmail("");
            setMessage(
                data.message ||
                    "Student enrolled successfully."
            );
        } catch (err) {
            setError(
                err.message ||
                    "Could not enroll the Student."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCreateManagedStudent(event) {
        event.preventDefault();
        if (!managedForm.firstName.trim()) {
            setError("Enter the Student first name.");
            return;
        }
        setSubmitting(true); setError(""); setMessage(""); setLinkUrl("");
        try {
            await apiRequest(`/learning-journeys/${journeyId}/managed-learners`, {
                method: "POST",
                body: JSON.stringify(managedForm),
            });
            setManagedForm({ firstName: "", lastName: "", email: "", privateNotes: "" });
            await loadEnrollments();
            setMessage("Managed Student created. You can track progress before they register.");
        } catch (err) {
            setError(err.message || "Could not create the managed Student.");
        } finally { setSubmitting(false); }
    }

    function openLinkPanel(enrollment) {
        setLinkPanel(enrollment);
        setLinkEmail(enrollment.email || "");
        setError(""); setMessage(""); setLinkUrl("");
    }

    async function createLink(event) {
        event.preventDefault();
        if (!linkPanel || !linkEmail.trim()) return;
        try {
            setError(""); setMessage(""); setLinkUrl("");
            const data = await apiRequest(
                `/learner-profiles/${linkPanel.learner_profile_id}/link-invitations`,
                { method: "POST", body: JSON.stringify({ email: linkEmail.trim().toLowerCase() }) }
            );
            setLinkUrl(data.invitationUrl);
            setEnrollments((current)=>current.map((item)=>item.id===linkPanel.id?{
                ...item,email:linkEmail.trim().toLowerCase(),learner_profile_status:"INVITED",
            }:item));
            setMessage(
                data.emailSent
                    ? `Invitation emailed to ${linkEmail.trim()}.`
                    : `Link created for ${getStudentName(linkPanel)}. Copy and share it with the Student.`
            );
            await navigator.clipboard?.writeText(data.invitationUrl);
            setLinkPanel(null);
        } catch (err) { setError(err.message || "Could not create the account link."); }
    }

    async function cancelLinkInvitation() {
        if (!linkPanel) return;
        try {
            await apiRequest(
                `/learner-profiles/${linkPanel.learner_profile_id}/link-invitations`,
                { method: "DELETE" }
            );
            setEnrollments((current)=>current.map((item)=>item.id===linkPanel.id?{
                ...item,learner_profile_status:"MANAGED",
            }:item));
            setLinkPanel(null);setLinkUrl("");
            setMessage("Account invitation cancelled. The previous link can no longer be used.");
        } catch (err) { setError(err.message || "Could not cancel the invitation."); }
    }

    async function openProgress(enrollment) {
        try {
            setError("");
            const data = await apiRequest(`/enrollments/${enrollment.id}/managed-progress`);
            setProgressPanel({ enrollment, steps: data.steps || [] });
        } catch (err) { setError(err.message || "Could not load Student progress."); }
    }

    async function recordProgress(stepId, status) {
        if (!progressPanel) return;
        try {
            await apiRequest(`/enrollments/${progressPanel.enrollment.id}/managed-progress/${stepId}`, {
                method: "PUT", body: JSON.stringify({ status }),
            });
            setProgressPanel((current)=>({
                ...current,
                steps: current.steps.map((step)=>step.id===stepId?{...step,progress_status:status}:step),
            }));
            setMessage("Student progress updated.");
        } catch (err) { setError(err.message || "Could not update progress."); }
    }

    async function changeStatus(
        enrollment,
        nextStatus
    ) {
        if (
            !nextStatus ||
            nextStatus === enrollment.status
        ) {
            return;
        }

        const actionLabel = getStatusActionLabel(
            nextStatus
        );

        const confirmed = window.confirm(
            `${actionLabel} access for ${getStudentName(
                enrollment
            )}?`
        );

        if (!confirmed) return;

        setUpdatingId(enrollment.id);
        setError("");
        setMessage("");

        try {
            const data = await apiRequest(
                `/enrollments/${enrollment.id}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: nextStatus,
                    }),
                }
            );

            setEnrollments((current) =>
                current.map((item) =>
                    item.id === enrollment.id
                        ? {
                              ...item,
                              ...data.enrollment,
                          }
                        : item
                )
            );

            setMessage(
                data.message ||
                    "Enrollment updated successfully."
            );
        } catch (err) {
            setError(
                err.message ||
                    "Could not update the enrollment."
            );
        } finally {
            setUpdatingId(null);
        }
    }

    const filteredEnrollments = useMemo(() => {
        const normalizedSearch = search
            .trim()
            .toLowerCase();

        return enrollments.filter((enrollment) => {
            const matchesStatus =
                statusFilter === "ALL" ||
                enrollment.status === statusFilter;

            if (!matchesStatus) return false;

            if (!normalizedSearch) return true;

            const searchableText = [
                enrollment.first_name,
                enrollment.last_name,
                enrollment.email,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
                normalizedSearch
            );
        });
    }, [
        enrollments,
        search,
        statusFilter,
    ]);

    const stats = useMemo(() => {
        return enrollments.reduce(
            (result, enrollment) => {
                result.total += 1;

                if (
                    enrollment.status === "ACTIVE"
                ) {
                    result.active += 1;
                }

                if (
                    enrollment.status ===
                    "SUSPENDED"
                ) {
                    result.suspended += 1;
                }

                if (
                    enrollment.status ===
                    "COMPLETED"
                ) {
                    result.completed += 1;
                }

                return result;
            },
            {
                total: 0,
                active: 0,
                suspended: 0,
                completed: 0,
            }
        );
    }, [enrollments]);

    return (
        <section className="journey_students">
            <header className="journey_students_header">
                <div>
                    <span className="journey_students_eyebrow">
                        Learner management
                    </span>

                    <h2>Students</h2>

                    <p>
                        Enroll learners, manage access and
                        review who belongs to this Learning
                        Journey.
                    </p>
                </div>

                <button
                    type="button"
                    className="journey_students_refresh"
                    onClick={loadEnrollments}
                    disabled={loading}
                >
                    <i
                        className={`fa-solid ${
                            loading
                                ? "fa-spinner fa-spin"
                                : "fa-rotate"
                        }`}
                    ></i>
                    Refresh
                </button>
            </header>

            <div className="journey_students_stats">
                <StudentStat
                    label="Total"
                    value={stats.total}
                    icon="fa-users"
                />

                <StudentStat
                    label="Active"
                    value={stats.active}
                    icon="fa-circle-check"
                />

                <StudentStat
                    label="Suspended"
                    value={stats.suspended}
                    icon="fa-user-lock"
                />

                <StudentStat
                    label="Completed"
                    value={stats.completed}
                    icon="fa-graduation-cap"
                />
            </div>

            <div className="journey_student_add_tabs">
                <button type="button" className={addMode==="MANAGED"?"active":""} onClick={()=>setAddMode("MANAGED")}><i className="fa-solid fa-user-pen"/> Create managed Student</button>
                <button type="button" className={addMode==="ACCOUNT"?"active":""} onClick={()=>setAddMode("ACCOUNT")}><i className="fa-solid fa-envelope"/> Enroll or invite account</button>
            </div>

            <section className="journey_student_create_card">
            {addMode === "ACCOUNT" ? <form
                className="journey_enroll_form"
                onSubmit={handleEnrollStudent}
            >
                <div>
                    <label htmlFor="student-email">
                        Enroll a Student
                    </label>

                    <span>
                        Existing accounts are enrolled immediately; otherwise an invitation is created.
                    </span>
                </div>

                <div className="journey_enroll_controls">
                    <input
                        id="student-email"
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(
                                event.target.value
                            )
                        }
                        placeholder="student@example.com"
                        disabled={submitting}
                    />

                    <button
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                Enrolling...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-user-plus"></i>
                                Enroll Student
                            </>
                        )}
                    </button>
                </div>
            </form> : <form className="journey_enroll_form journey_managed_form" onSubmit={handleCreateManagedStudent}>
                <div><label>Create a Student without an account</label><span>All progress will belong to this academic profile and can be linked later.</span></div>
                <div className="journey_managed_fields">
                    <input value={managedForm.firstName} onChange={(event)=>setManagedForm({...managedForm,firstName:event.target.value})} placeholder="First name" required/>
                    <input value={managedForm.lastName} onChange={(event)=>setManagedForm({...managedForm,lastName:event.target.value})} placeholder="Last name"/>
                    <input type="email" value={managedForm.email} onChange={(event)=>setManagedForm({...managedForm,email:event.target.value})} placeholder="Email (optional)"/>
                    <input value={managedForm.privateNotes} onChange={(event)=>setManagedForm({...managedForm,privateNotes:event.target.value})} placeholder="Private teacher note (optional)"/>
                    <button type="submit" disabled={submitting}><i className="fa-solid fa-user-plus"/>{submitting?"Creating…":"Create Student"}</button>
                </div>
            </form>}
            </section>

            {linkUrl && <div className="journey_profile_link"><strong>Account linking URL</strong><div><input readOnly value={linkUrl}/><button type="button" onClick={()=>navigator.clipboard?.writeText(linkUrl)}>Copy</button></div><small>The Student must sign in with the invited email and accept this link.</small></div>}

            {error && (
                <div className="journey_students_alert error">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    {error}
                </div>
            )}

            {message && (
                <div className="journey_students_alert success">
                    <i className="fa-solid fa-circle-check"></i>
                    {message}
                </div>
            )}

            <div className="journey_students_toolbar">
                <div className="journey_students_search">
                    <i className="fa-solid fa-magnifying-glass"></i>

                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search by name or email"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="ALL">
                        All statuses
                    </option>

                    {STATUS_OPTIONS.map((status) => (
                        <option
                            key={status}
                            value={status}
                        >
                            {formatStatus(status)}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="journey_students_state">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <h3>Loading Students</h3>
                    <p>
                        Preparing the enrollment list...
                    </p>
                </div>
            ) : filteredEnrollments.length === 0 ? (
                <div className="journey_students_state">
                    <div>
                        <i className="fa-solid fa-user-graduate"></i>
                    </div>

                    <h3>
                        {enrollments.length === 0
                            ? "No Students enrolled yet"
                            : "No matching Students"}
                    </h3>

                    <p>
                        {enrollments.length === 0
                            ? "Use the email field above to enroll the first learner."
                            : "Change the search or status filter to see more results."}
                    </p>
                </div>
            ) : (
                <div className="journey_students_table_wrap">
                    <table className="journey_students_table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Status</th>
                                <th>Source</th>
                                <th>Enrolled</th>
                                <th>Access</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredEnrollments.map(
                                (enrollment) => (
                                    <StudentRow
                                        key={
                                            enrollment.id
                                        }
                                        enrollment={
                                            enrollment
                                        }
                                        updating={
                                            updatingId ===
                                            enrollment.id
                                        }
                                        onChangeStatus={
                                            changeStatus
                                        }
                                        onCreateLink={openLinkPanel}
                                        onOpenProgress={openProgress}
                                    />
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {progressPanel && <div className="journey_progress_modal_backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setProgressPanel(null)}>
                <section className="journey_progress_modal">
                    <header><div><span>Teacher recorded progress</span><h3>{getStudentName(progressPanel.enrollment)}</h3></div><button type="button" onClick={()=>setProgressPanel(null)} aria-label="Close"><i className="fa-solid fa-xmark"/></button></header>
                    <p>Use this when lessons happen outside Maze Studio. These records remain attached when the Student links an account.</p>
                    <div className="journey_progress_steps">
                        {progressPanel.steps.map((step)=><div key={step.id}><span><small>{step.stage_title}</small><strong>{step.title}</strong></span><select value={step.progress_status} onChange={(event)=>recordProgress(step.id,event.target.value)}><option value="NOT_STARTED">Not started</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></div>)}
                    </div>
                </section>
            </div>}
            {linkPanel && <div className="journey_progress_modal_backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setLinkPanel(null)}>
                <form className="journey_link_modal" onSubmit={createLink}>
                    <header><div className="journey_link_modal_icon"><i className="fa-solid fa-link"/></div><button type="button" onClick={()=>setLinkPanel(null)} aria-label="Close"><i className="fa-solid fa-xmark"/></button></header>
                    <span>Connect an account</span>
                    <h3>{getStudentName(linkPanel)}</h3>
                    <p>Enter the email the Student will use for Maze Studio. They must accept the secure invitation before any progress becomes visible in their account.</p>
                    {linkPanel.learner_profile_status === "INVITED" && <div className="journey_link_replace_notice"><i className="fa-solid fa-triangle-exclamation"/><span>This profile already has a pending invitation. Sending again will revoke the old link and replace its email.</span></div>}
                    <label>Email address<input type="email" value={linkEmail} onChange={(event)=>setLinkEmail(event.target.value)} placeholder="student@example.com" autoFocus required/></label>
                    <div className="journey_link_modal_actions">
                        {linkPanel.learner_profile_status === "INVITED" && <button type="button" className="cancel-invitation" onClick={cancelLinkInvitation}>Cancel invitation</button>}
                        <button type="button" onClick={()=>setLinkPanel(null)}>Close</button>
                        <button type="submit"><i className="fa-solid fa-paper-plane"/> {linkPanel.learner_profile_status === "INVITED" ? "Replace invitation" : "Send invitation"}</button>
                    </div>
                </form>
            </div>}
        </section>
    );
}

function StudentStat({
    label,
    value,
    icon,
}) {
    return (
        <div className="journey_student_stat">
            <span>
                <i
                    className={`fa-solid ${icon}`}
                ></i>
            </span>

            <div>
                <strong>{value}</strong>
                <small>{label}</small>
            </div>
        </div>
    );
}

function StudentRow({
    enrollment,
    updating,
    onChangeStatus,
    onCreateLink,
    onOpenProgress,
}) {
    const name = getStudentName(enrollment);
    const initials = getInitials(enrollment);

    return (
        <tr>
            <td>
                <div className="journey_student_identity">
                    <span className="journey_student_avatar">
                        {initials}
                    </span>

                    <div>
                        <strong>{name}</strong>
                        <small>
                            {enrollment.email ||
                                "No email available"}
                        </small>
                        <span className={`journey_profile_badge ${enrollment.linked_user_id ? "linked" : "managed"}`}>
                            {enrollment.linked_user_id ? "Account linked" : "Teacher managed"}
                        </span>
                    </div>
                </div>
            </td>

            <td>
                <span
                    className={`journey_student_status ${String(
                        enrollment.status
                    ).toLowerCase()}`}
                >
                    {formatStatus(
                        enrollment.status
                    )}
                </span>
            </td>

            <td>
                <span className="journey_student_source">
                    {formatStatus(
                        enrollment.enrollment_source
                    )}
                </span>
            </td>

            <td>
                {formatDate(
                    enrollment.enrolled_at ||
                        enrollment.created_at
                )}
            </td>

            <td>
                <div className="journey_student_access_actions"><select
                    value={enrollment.status}
                    onChange={(event) =>
                        onChangeStatus(
                            enrollment,
                            event.target.value
                        )
                    }
                    disabled={updating}
                    aria-label={`Change access for ${name}`}
                >
                    {STATUS_OPTIONS.map((status) => (
                        <option
                            key={status}
                            value={status}
                        >
                            {formatStatus(status)}
                        </option>
                    ))}
                </select>
                <button type="button" onClick={()=>onOpenProgress(enrollment)}><i className="fa-solid fa-chart-line"/> Progress</button>
                {!enrollment.linked_user_id && <button type="button" onClick={()=>onCreateLink(enrollment)}><i className="fa-solid fa-link"/> {enrollment.learner_profile_status==="INVITED"?"Change email / resend":"Link account"}</button>}
                </div>
            </td>
        </tr>
    );
}

function getStudentName(enrollment) {
    const fullName = [
        enrollment.first_name,
        enrollment.last_name,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    return (
        fullName ||
        enrollment.email ||
        "Unnamed Student"
    );
}

function getInitials(enrollment) {
    const parts = [
        enrollment.first_name,
        enrollment.last_name,
    ].filter(Boolean);

    if (parts.length > 0) {
        return parts
            .slice(0, 2)
            .map((part) =>
                part.charAt(0).toUpperCase()
            )
            .join("");
    }

    return enrollment.email
        ? enrollment.email
              .charAt(0)
              .toUpperCase()
        : "S";
}

function formatStatus(value) {
    if (!value) return "Unknown";

    return String(value)
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric",
        }
    ).format(date);
}

function getStatusActionLabel(status) {
    switch (status) {
        case "ACTIVE":
            return "Restore";
        case "SUSPENDED":
            return "Suspend";
        case "COMPLETED":
            return "Mark as completed";
        case "CANCELLED":
            return "Remove";
        default:
            return "Update";
    }
}
