import { Link } from "react-router-dom";
import {useEffect,useState} from "react";
import {apiRequest} from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import "./StudentPages.css";

export default function StudentSettings() {
    const { user,setUser } = useAuth();
    const [form,setForm]=useState({firstName:"",lastName:"",email:"",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}),[message,setMessage]=useState("");
    useEffect(()=>{if(user)setForm({firstName:user.first_name||"",lastName:user.last_name||"",email:user.email||"",timezone:user.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone})},[user]);
    async function save(event){event.preventDefault();setMessage("Saving…");try{const result=await apiRequest("/users/profile",{method:"PUT",body:JSON.stringify(form)});setUser(result.user);setMessage("Profile updated.")}catch(error){setMessage(error.message)}}

    return (
        <div className="student_settings_grid">
            <section className="student_panel">
                <div className="student_section_header compact">
                    <div>
                        <span className="student_section_kicker">Profile</span>
                        <h2>Personal information</h2>
                    </div>
                </div>

                <form className="student_settings_form" onSubmit={save}>
                    <label>
                        First name
                        <input required type="text" value={form.firstName} onChange={event=>setForm({...form,firstName:event.target.value})}/>
                    </label>
                    <label>
                        Last name
                        <input required type="text" value={form.lastName} onChange={event=>setForm({...form,lastName:event.target.value})}/>
                    </label>
                    <label className="full">
                        Email address
                        <input required type="email" value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/>
                    </label>
                    <label className="full">Timezone<input value={form.timezone} onChange={event=>setForm({...form,timezone:event.target.value})}/></label>
                    <button type="submit">Save profile</button>{message&&<p className="student_settings_note">{message}</p>}
                </form>
            </section>

            <aside className="student_panel">
                <div className="student_section_header compact">
                    <div>
                        <span className="student_section_kicker">Security</span>
                        <h2>Account access</h2>
                    </div>
                </div>

                <Link to="/student/settings/security" className="student_settings_option">
                    <i className="fa-solid fa-key" />
                    <span>
                        <strong>Change password</strong>
                        <small>Use the existing account security flow.</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" />
                </Link>
                <Link to="/student/settings/billing" className="student_settings_option">
                    <i className="fa-solid fa-credit-card" />
                    <span>
                        <strong>Billing and purchases</strong>
                        <small>Manage 1:1 subscriptions, payments and refunds.</small>
                    </span>
                    <i className="fa-solid fa-chevron-right" />
                </Link>
            </aside>
        </div>
    );
}
