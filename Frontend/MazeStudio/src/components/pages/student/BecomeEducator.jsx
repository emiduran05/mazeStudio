import {useState} from "react";
import {apiRequest} from "../../../api/api";
import "./StudentPages.css";

export default function BecomeEducator(){
  const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  async function subscribe(){
    setLoading(true);setError("");
    try{
      const data=await apiRequest("/billing/educator-upgrade",{method:"POST"});
      if(!data.checkoutUrl)throw new Error("Checkout URL was not returned");
      window.location.assign(data.checkoutUrl);
    }catch(requestError){setError(requestError.message||"Could not start the Educator subscription.");setLoading(false)}
  }
  return <section className="student_educator_upgrade">
    <div className="student_upgrade_intro"><span>Teach with Maze Studio</span><h1>Turn your learner account into an Educator Studio</h1><p>Keep your current learning history and add the tools you need to create classes, manage Students and track personalized progress.</p>
      <div className="student_upgrade_price"><strong>$10</strong><span>USD<br/>per month</span></div>
      <button type="button" onClick={subscribe} disabled={loading}>{loading?<><i className="fa-solid fa-spinner fa-spin"/>Opening checkout…</>:<>Subscribe to Educator Plan<i className="fa-solid fa-arrow-right"/></>}</button>
      {error&&<div className="student_link_profile_error">{error}</div>}
      <small>Secure subscription through Stripe. Your role changes only after payment is confirmed.</small>
    </div>
    <div className="student_upgrade_features">
      <span>Educator tools</span>
      {[["fa-route","Learning Journeys","Build reusable curricula from Stages and Steps."],["fa-user-graduate","Managed Students","Track learners with or without an account."],["fa-flag-checkered","Challenges","Create graded assessments and private links."],["fa-chart-line","Progress insights","Record and review individual learning progress."]].map(([icon,title,text])=><article key={title}><i className={`fa-solid ${icon}`}/><div><strong>{title}</strong><p>{text}</p></div></article>)}
    </div>
  </section>
}
