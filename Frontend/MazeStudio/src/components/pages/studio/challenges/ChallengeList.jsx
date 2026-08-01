import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { createChallenge, deleteChallenge, listChallenges } from "../../../../api/challengeApi";
import JourneyWorkspaceNav from "../journeyBuilder/components/JourneyWorkspaceNav";
import "../journeyBuilder/JourneyBuilder.css";
import "./Challenges.css";

export default function ChallengeList() {
  const { journeyId } = useParams();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { listChallenges(journeyId).then((d) => setItems(d.challenges || [])).catch((e) => setError(e.message)); }, [journeyId]);
  async function add(){
    try{
      const challenge=await createChallenge({
        learningJourneyId:journeyId,
        title:"Untitled Challenge",
        instructions:"",
        gradingMode:"AUTO",
        status:"DRAFT",
        questions:[],
      });
      window.location.assign(`/studio/challenges/${challenge.id}/edit`);
    }catch(error){setError(error.message)}
  }
  async function remove(item){
    if(!window.confirm(`Delete “${item.title}”? It will no longer be available to learners or through private links.`))return;
    setError("");
    try{
      await deleteChallenge(item.id);
      setItems((current)=>current.filter((challenge)=>challenge.id!==item.id));
    }catch(deleteError){setError(deleteError.message)}
  }
  return <StudioLayout><main className="challenge-page">
    <JourneyWorkspaceNav journeyId={journeyId} active="CHALLENGES"/>
    <header className="challenge-head"><div><h1>Challenges</h1><p className="challenge-muted">Build independent assessments from question blocks, map reviewed topics and assign learners.</p></div><div className="challenge-actions"><Link to={`/studio/journey/${journeyId}`}>Back to Journey</Link><button type="button" onClick={add}>New Challenge</button></div></header>
    {error && <p className="challenge-error">{error}</p>}
    {items.map((item) => <article className="challenge-card challenge-row" key={item.id}>
      <div><span className="challenge-status">{item.status}</span><h2>{item.title}</h2><small>{item.step_count} Steps · {item.attempt_count} submissions</small></div>
      <div className="challenge-actions"><Link to={`/studio/challenges/${item.id}/submissions`}>Submissions</Link><Link className="challenge-primary" to={`/studio/challenges/${item.id}/edit`}>Edit</Link><button className="challenge-delete-button" type="button" onClick={()=>remove(item)} aria-label={`Delete ${item.title}`}><i className="fa-solid fa-trash"/> Delete</button></div>
    </article>)}
  </main></StudioLayout>;
}
