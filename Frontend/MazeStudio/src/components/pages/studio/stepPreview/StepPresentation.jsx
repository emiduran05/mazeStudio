import {useEffect,useMemo,useState} from "react";
import {useNavigate,useParams} from "react-router-dom";
import {apiRequest} from "../../../../api/api";
import ContentRenderer from "../../../contentRenderer/ContentRenderer";
import "./StepPresentation.css";

export default function StepPresentation(){
 const {stepId}=useParams(),navigate=useNavigate();
 const [step,setStep]=useState(null),[blocks,setBlocks]=useState([]),[index,setIndex]=useState(0),[error,setError]=useState("");
 useEffect(()=>{Promise.all([apiRequest(`/steps/${stepId}`),apiRequest(`/steps/${stepId}/blocks`)]).then(([stepData,blockData])=>{setStep(stepData.step);setBlocks(blockData.blocks||[])}).catch(requestError=>setError(requestError.message))},[stepId]);
 const slides=useMemo(()=>{const roots=blocks.filter(block=>!block.parent_block_id&&block.block_type!=="COLUMN").sort((a,b)=>a.position-b.position);const descendants=root=>{const ids=new Set([root.id]);let changed=true;while(changed){changed=false;for(const block of blocks)if(block.parent_block_id&&ids.has(block.parent_block_id)&&!ids.has(block.id)){ids.add(block.id);changed=true}}return blocks.filter(block=>ids.has(block.id))};return roots.map(root=>({id:root.id,blocks:descendants(root)}))},[blocks]);
 useEffect(()=>{const keydown=event=>{if(["ArrowRight","PageDown"," "].includes(event.key)){event.preventDefault();setIndex(current=>Math.min(slides.length-1,current+1))}if(["ArrowLeft","PageUp"].includes(event.key)){event.preventDefault();setIndex(current=>Math.max(0,current-1))}if(event.key==="Escape")navigate(-1)};window.addEventListener("keydown",keydown);return()=>window.removeEventListener("keydown",keydown)},[slides.length,navigate]);
 useEffect(()=>{setIndex(current=>Math.min(current,Math.max(0,slides.length-1)))},[slides.length]);
 if(error)return <main className="presentation_state"><i className="fa-solid fa-triangle-exclamation"/><h1>Presentation unavailable</h1><p>{error}</p><button onClick={()=>navigate(-1)}>Go back</button></main>;
 if(!step)return <main className="presentation_state"><i className="fa-solid fa-spinner fa-spin"/><h1>Preparing presentation…</h1></main>;
 return <main className="step_presentation"><header><button onClick={()=>navigate(-1)}><i className="fa-solid fa-xmark"/> Exit</button><span><small>LIVE STEP PRESENTATION</small><strong>{step.title}</strong></span><em>{slides.length?`${index+1} / ${slides.length}`:"No slides"}</em></header><section className="presentation_stage">{slides.length?<article key={slides[index].id}><ContentRenderer blocks={slides[index].blocks} exerciseChecker={(blockId,answer)=>apiRequest(`/blocks/${blockId}/presentation-check`,{method:"POST",body:JSON.stringify({answer})})}/></article>:<div className="presentation_empty"><i className="fa-solid fa-cubes"/><h2>This Step has no blocks yet</h2></div>}</section><footer><button disabled={index===0} onClick={()=>setIndex(current=>current-1)}><i className="fa-solid fa-arrow-left"/> Previous</button><div>{slides.map((slide,position)=><button aria-label={`Slide ${position+1}`} className={position===index?"active":""} onClick={()=>setIndex(position)} key={slide.id}/>)}</div><button disabled={index>=slides.length-1} onClick={()=>setIndex(current=>current+1)}>Next <i className="fa-solid fa-arrow-right"/></button></footer></main>;
}
