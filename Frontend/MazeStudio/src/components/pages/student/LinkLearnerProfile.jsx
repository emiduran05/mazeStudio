import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import "./StudentPages.css";

export default function LinkLearnerProfile() {
    const [params] = useSearchParams();
    const token = params.get("token") || "";
    const { user, authLoading } = useAuth();
    const [invitation, setInvitation] = useState(null);
    const [message, setMessage] = useState("");
    const [linked, setLinked] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        apiRequest(`/learner-profile-link?token=${encodeURIComponent(token)}`)
            .then(setInvitation)
            .catch((error) => setMessage(error.message));
    }, [token]);

    async function accept() {
        setSubmitting(true); setMessage("");
        try {
            await apiRequest("/learner-profile-link/accept", {
                method: "POST", body: JSON.stringify({ token }),
            });
            setLinked(true);
        } catch (error) { setMessage(error.message); }
        finally { setSubmitting(false); }
    }

    return <section className="student_link_profile">
        <div className={`student_link_profile_icon ${linked ? "linked" : ""}`}>
            <i className={`fa-solid ${linked ? "fa-circle-check" : "fa-link"}`}/>
        </div>
        <span>Academic profile</span>
        <h1>{linked ? "Your progress is now connected" : "Connect your existing progress"}</h1>
        {invitation && !linked && <p>
            Your educator created an academic profile for <strong>{[invitation.first_name,invitation.last_name].filter(Boolean).join(" ")}</strong>.
            Accept to make its Journeys, Challenges and progress available in this account.
        </p>}
        {message && <div className="student_link_profile_error">{message}</div>}
        {!authLoading && !user && <div className="student_link_profile_auth">
            <Link to={`/login?profileLink=${encodeURIComponent(token)}`}>Sign in</Link>
            <Link className="secondary" to={`/register?profileLink=${encodeURIComponent(token)}`}>Create Student account</Link>
        </div>}
        {user && (linked
            ? <Link to="/my-learning">Open My Learning <i className="fa-solid fa-arrow-right"/></Link>
            : <button type="button" onClick={accept} disabled={!invitation||submitting}>{submitting?"Connecting…":"Connect profile to my account"}</button>)}
        <small>For security, the email on your account must match the invitation.</small>
    </section>;
}
