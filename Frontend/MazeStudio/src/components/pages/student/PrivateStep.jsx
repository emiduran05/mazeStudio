import {useEffect,useState} from "react";
import {useParams} from "react-router-dom";
import ContentRenderer from "../../contentRenderer/ContentRenderer";
import {checkPrivateStepAnswer,completePrivateStep,getPrivateStepMetadata,startPrivateStepSession} from "../../../api/privateStepApi";
import "./LearnerFlow.css";

export default function PrivateStep(){
  const{token}=useParams();const storageKey=`private-step:${token}`;
  const[meta,setMeta]=useState(null);const[step,setStep]=useState(null);
  const[session,setSession]=useState(()=>sessionStorage.getItem(storageKey));
  const[message,setMessage]=useState("");const[loading,setLoading]=useState(false);const[completed,setCompleted]=useState(false);
  const[darkMode,setDarkMode]=useState(()=>localStorage.getItem("darkmode")==="true");
  useEffect(()=>localStorage.setItem("darkmode",String(darkMode)),[darkMode]);
  useEffect(()=>{getPrivateStepMetadata(token).then(setMeta).catch(e=>setMessage(e.message))},[token]);
  async function begin(){setLoading(true);setMessage("");try{const data=await startPrivateStepSession(token);sessionStorage.setItem(storageKey,data.sessionToken);setSession(data.sessionToken);setStep(data.step)}catch(e){setMessage(e.message)}finally{setLoading(false)}}
  async function complete(){setLoading(true);try{await completePrivateStep(token,session);setCompleted(true)}catch(e){setMessage(e.message)}finally{setLoading(false)}}
  return <main className={`private_step_page ${darkMode?"private_dark":""}`}><header className="private_challenge_brand"><div className="private_challenge_logo"><i className="fa-solid fa-route"/></div><strong>Maze Studio</strong><span>Private Step</span><button type="button" className="private_challenge_theme" onClick={()=>setDarkMode(current=>!current)} aria-label={darkMode?"Activate light mode":"Activate dark mode"}><i className={`fa-solid ${darkMode?"fa-sun":"fa-moon"}`}/></button></header>
    {message&&<div className="private_challenge_notice"><i className="fa-solid fa-circle-exclamation"/>{message}</div>}
    {meta&&!step&&!completed&&<section className="private_step_welcome"><span>Assigned learning content</span><h1>{meta.title}</h1><p>{meta.description}</p><div><i className="fa-solid fa-user-graduate"/><span>This Step is assigned to <strong>{meta.learnerName}</strong>. Completion will be saved to that academic profile.</span></div><button onClick={begin} disabled={loading}>{loading?"Opening…":"Open Step"}<i className="fa-solid fa-arrow-right"/></button></section>}
    {step&&!completed&&<article className="private_step_document"><header><span>{step.stageTitle}</span><h1>{step.title}</h1>{step.description&&<p>{step.description}</p>}</header><ContentRenderer blocks={step.blocks} privateStepAccess={{checkAnswer:(blockId,answer)=>checkPrivateStepAnswer(token,session,blockId,answer)}}/><footer><div><strong>Finished this Step?</strong><span>Your educator will see this progress immediately.</span></div><button onClick={complete} disabled={loading}>{loading?"Saving…":"Complete Step"}<i className="fa-solid fa-check"/></button></footer></article>}
    {completed&&<section className="private_step_complete"><div><i className="fa-solid fa-circle-check"/></div><span>Progress saved</span><h1>Step completed</h1><p>Your educator can now see this Step as completed. It will remain in your profile if you connect an account later.</p></section>}
  </main>
}
