import {useEffect,useMemo,useState} from "react";
import {Link,useParams} from "react-router-dom";
import {apiRequest} from "../../../api/api";
import "./Classroom.css";
import ClassroomWhiteboard from "./ClassroomWhiteboard";

function remaining(target){
  const seconds=Math.max(0,Math.ceil((new Date(target)-new Date())/1000));
  const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;
  return [hours?`${hours}h`:null,`${minutes}m`,`${secs}s`].filter(Boolean).join(" ");
}

export default function Classroom(){
  const {eventId}=useParams();
  const [data,setData]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[clock,setClock]=useState(Date.now()),[whiteboardOpen,setWhiteboardOpen]=useState(false),[planOpen,setPlanOpen]=useState(false);
  const returnTo=data?.role==="EDUCATOR"?"/calendar":"/student/calendar";
  const joinUrl=useMemo(()=>data?.roomUrl&&data?.token?`${data.roomUrl}?t=${encodeURIComponent(data.token)}`:null,[data]);
  async function load(){setLoading(true);setError("");try{setData(await apiRequest(`/video/events/${eventId}/access`))}catch(requestError){setError(requestError.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[eventId]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>()=>{apiRequest(`/video/events/${eventId}/leave`,{method:"POST"}).catch(()=>{})},[eventId]);
  useEffect(()=>{if(data&&!data.canJoin&&new Date(data.opensAt).getTime()<=clock)load()},[clock,data?.canJoin,data?.opensAt]);

  if(loading)return <main className="classroom_state"><div className="classroom_spinner"/><h1>Preparing your classroom…</h1><p>Securing your private video session.</p></main>;
  if(error)return <main className="classroom_state error"><i className="fa-solid fa-video-slash"/><h1>Unable to open the classroom</h1><p>{error}</p><Link to="/student/calendar">Return to calendar</Link></main>;
  if(data.accessState==="EXPIRED")return <main className="classroom_lobby classroom_expired"><header><Link to={returnTo}><i className="fa-solid fa-arrow-left"/> Calendar</Link><span>MAZE VIDEO</span></header><section><div className="classroom_lobby_art"><i className="fa-solid fa-clock-rotate-left"/></div><span>Classroom closed</span><h1>This class has ended</h1><p>{data.event.title}</p><div className="classroom_expired_summary"><small>Scheduled session</small><strong>{new Date(data.event.startsAt).toLocaleString(undefined,{dateStyle:"full",timeStyle:"short"})}</strong><span>Access closed {new Date(data.closesAt).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}.</span></div><Link className="classroom_return_button" to={returnTo}>Return to calendar</Link></section></main>;
  if(!data.canJoin)return <main className="classroom_lobby"><header><Link to={returnTo}><i className="fa-solid fa-arrow-left"/> Calendar</Link><span>MAZE VIDEO</span></header><section><div className="classroom_lobby_art"><i className="fa-solid fa-chalkboard-user"/></div><span>Your upcoming live class</span><h1>{data.event.title}</h1><p>{new Date(data.event.startsAt).toLocaleString(undefined,{dateStyle:"full",timeStyle:"short"})}</p><div className="classroom_countdown"><small>The classroom opens 10 minutes before class</small><strong>{remaining(data.opensAt)}</strong></div><button type="button" onClick={load}>Check access now</button></section></main>;
  return <main className="classroom_page"><header><div><Link to={returnTo}><i className="fa-solid fa-arrow-left"/></Link><span><small>LIVE IN MAZE STUDIO</small><strong>{data.event.title}</strong></span></div><div>{data.role==="EDUCATOR"&&<Link className="classroom_tool_button" to={`/calendar/events/${eventId}/lesson-plan`}><i className="fa-solid fa-list-check"/> Edit plan</Link>}{data.lessonPlan?.length>0&&<button className="classroom_tool_button" onClick={()=>setPlanOpen(current=>!current)}><i className="fa-solid fa-route"/> Session path</button>}<button className="classroom_tool_button" onClick={()=>setWhiteboardOpen(current=>!current)}><i className="fa-solid fa-pen-ruler"/> Whiteboard</button><span><i className="fa-solid fa-lock"/> Private classroom</span></div></header><iframe title={`Live class: ${data.event.title}`} src={joinUrl} allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write" referrerPolicy="strict-origin-when-cross-origin"/>{planOpen&&<aside className="classroom_session_plan"><header><div><small>PERSONALIZED SESSION</small><strong>Your path for today</strong></div><button onClick={()=>setPlanOpen(false)} aria-label="Close session path"><i className="fa-solid fa-xmark"/></button></header><ol>{data.lessonPlan.map((step,index)=><li key={step.id}><b>{index+1}</b><span><small>{step.stage_title}</small><strong>{step.title}</strong></span></li>)}</ol></aside>}{whiteboardOpen&&<ClassroomWhiteboard eventId={eventId} onClose={()=>setWhiteboardOpen(false)}/>}</main>;
}
