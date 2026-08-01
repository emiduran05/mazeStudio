import { useEffect, useState } from "react";
import StudioLayout from "../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../api/api";
import "./EducatorProfile.css";

const choices=[
  ["HEADING","fa-heading","Heading"],["TEXT","fa-align-left","Text"],["IMAGE","fa-image","Image"],
  ["VIDEO","fa-video","Video"],["QUOTE","fa-quote-left","Quote"],["CALLOUT","fa-lightbulb","Callout"],
  ["TABLE","fa-table","Table"],["BUTTON","fa-link","Link"],["FILE","fa-paperclip","File"],
  ["PDF","fa-file-pdf","PDF"],["DIVIDER","fa-minus","Divider"]
];
const newBlock=type=>({id:crypto.randomUUID(),block_type:type,content:type==="TABLE"?{rows:[["Topic","Details"],["Example","Add information"]]}:{},settings:type==="HEADING"?{level:2}:{}});

export default function EducatorProfileEditor(){
 const [profile,setProfile]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{apiRequest("/educator-profile/me").then(x=>setProfile(x.profile)).catch(e=>setMessage(e.message))},[]);
 function patchBlock(index,content){setProfile(p=>({...p,blocks:p.blocks.map((b,i)=>i===index?{...b,content:{...b.content,...content}}:b)}))}
 function move(index,direction){setProfile(p=>{const blocks=[...p.blocks],target=index+direction;if(target<0||target>=blocks.length)return p;[blocks[index],blocks[target]]=[blocks[target],blocks[index]];return{...p,blocks}})}
 async function asset(index,file){if(!file)return;setBusy(true);try{const form=new FormData();form.append("file",file);const result=await apiRequest("/educator-profile/me/assets",{method:"POST",body:form});patchBlock(index,result.asset)}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function save(){setBusy(true);setMessage("");try{const result=await apiRequest("/educator-profile/me",{method:"PUT",body:JSON.stringify(profile)});setProfile(result.profile);setMessage("Your public profile was saved.")}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 if(!profile)return <StudioLayout><div className="educator_profile_loading">{message||"Loading profile…"}</div></StudioLayout>;
 return <StudioLayout><main className="educator_profile_editor">
  <header><div><span>PUBLIC EDUCATOR PROFILE</span><h1>Introduce yourself to future learners</h1><p>Your photo, story and published Learning Journeys live together in one public page.</p></div><div className="educator_profile_actions"><a href={`/educators/${profile.slug}?preview=draft`} target="_blank" rel="noreferrer">Preview draft</a><button disabled={busy} onClick={save}>{busy?"Saving…":"Save profile"}</button></div></header>
  {message&&<div className="educator_profile_message">{message}</div>}
  <section className="educator_profile_basics"><div className="educator_profile_identity">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{profile.first_name?.[0]}{profile.last_name?.[0]}</span>}<div><strong>{profile.first_name} {profile.last_name}</strong><small>Change your photo from Account settings.</small></div></div>
   <label>Professional headline<input value={profile.headline||""} onChange={e=>setProfile({...profile,headline:e.target.value})} placeholder="Spanish teacher helping adults speak confidently"/></label>
   <label>Short introduction<textarea value={profile.short_bio||""} onChange={e=>setProfile({...profile,short_bio:e.target.value})} placeholder="A short summary shown at the top of your profile."/></label>
   <div className="profile_fields"><label>Location<input value={profile.location||""} onChange={e=>setProfile({...profile,location:e.target.value})} placeholder="Mexico City, Mexico"/></label><label>Languages (comma separated)<input value={(profile.languages||[]).join(", ")} onChange={e=>setProfile({...profile,languages:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></label></div>
   <label>Specialties (comma separated)<input value={(profile.specialties||[]).join(", ")} onChange={e=>setProfile({...profile,specialties:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})}/></label>
   <label className="profile_publish"><input type="checkbox" checked={profile.is_published} onChange={e=>setProfile({...profile,is_published:e.target.checked})}/><span><strong>Publish my educator profile</strong><small>When disabled, learners cannot open this page.</small></span></label>
  </section>
  <section className="educator_profile_builder"><header><div><span>YOUR PRESENTATION</span><h2>Build it with content blocks</h2></div><p>Add as much context as learners need before choosing one of your courses.</p></header>
   <div className="profile_block_picker">{choices.map(([type,icon,label])=><button key={type} onClick={()=>setProfile({...profile,blocks:[...profile.blocks,newBlock(type)]})}><i className={`fa-solid ${icon}`}/>{label}</button>)}</div>
   <div className="profile_blocks">{profile.blocks.length?profile.blocks.map((block,index)=><ProfileBlock block={block} index={index} key={block.id} patch={x=>patchBlock(index,x)} upload={file=>asset(index,file)} move={move} remove={()=>setProfile({...profile,blocks:profile.blocks.filter((_,i)=>i!==index)})}/>):<div className="profile_blocks_empty"><i className="fa-solid fa-wand-magic-sparkles"/><strong>Start telling your story</strong><p>Add a heading, text, an image or a video above.</p></div>}</div>
  </section>
 </main></StudioLayout>
}

function ProfileBlock({block,index,patch,upload,move,remove}){const c=block.content||{};return <article className="profile_block_editor"><header><span><i className="fa-solid fa-grip-lines"/>{block.block_type.replaceAll("_"," ")}</span><div><button onClick={()=>move(index,-1)} aria-label="Move up"><i className="fa-solid fa-arrow-up"/></button><button onClick={()=>move(index,1)} aria-label="Move down"><i className="fa-solid fa-arrow-down"/></button><button onClick={remove} aria-label="Delete"><i className="fa-solid fa-trash"/></button></div></header>
 {block.block_type==="HEADING"&&<input value={c.text||""} onChange={e=>patch({text:e.target.value})} placeholder="Section heading"/>}
 {["TEXT","CALLOUT"].includes(block.block_type)&&<textarea value={c.text||""} onChange={e=>patch({text:e.target.value})} placeholder="Write your content…"/>}
 {block.block_type==="QUOTE"&&<><textarea value={c.text||""} onChange={e=>patch({text:e.target.value})} placeholder="Quote"/><input value={c.author||""} onChange={e=>patch({author:e.target.value})} placeholder="Author (optional)"/></>}
 {block.block_type==="IMAGE"&&<><input type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/>{c.url&&<img src={c.url} alt=""/>}<input value={c.caption||""} onChange={e=>patch({caption:e.target.value})} placeholder="Image caption"/></>}
 {["FILE","PDF"].includes(block.block_type)&&<><input type="file" accept={block.block_type==="PDF"?"application/pdf":undefined} onChange={e=>upload(e.target.files?.[0])}/>{c.url&&<a href={c.url} target="_blank" rel="noreferrer">{c.name||"Open uploaded file"}</a>}</>}
 {block.block_type==="VIDEO"&&<input value={c.url||""} onChange={e=>patch({url:e.target.value})} placeholder="Direct video URL"/>}
 {block.block_type==="BUTTON"&&<div className="profile_fields"><input value={c.text||""} onChange={e=>patch({text:e.target.value})} placeholder="Link label"/><input value={c.url||""} onChange={e=>patch({url:e.target.value})} placeholder="https://…"/></div>}
 {block.block_type==="TABLE"&&<textarea value={(c.rows||[]).map(row=>row.join(" | ")).join("\n")} onChange={e=>patch({rows:e.target.value.split("\n").map(row=>row.split("|").map(cell=>cell.trim()))})} placeholder="Column 1 | Column 2"/>}
 {block.block_type==="DIVIDER"&&<hr/>}
 </article>}
