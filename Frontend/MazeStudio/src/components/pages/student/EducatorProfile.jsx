import {useEffect,useState} from "react";
import {Link,useParams,useSearchParams} from "react-router-dom";
import {apiRequest} from "../../../api/api";
import ContentRenderer from "../../contentRenderer/ContentRenderer";
import "./EducatorProfile.css";
import "./EducatorProfileDraft.css";
import "./JourneyImageFixes.css";
import EducatorReviews from "./EducatorReviews";

export default function EducatorProfile(){
 const {identifier}=useParams(),[params]=useSearchParams(),[profile,setProfile]=useState(null),[error,setError]=useState("");
 const draftPreview=params.get("preview")==="draft";
 useEffect(()=>{apiRequest(draftPreview?"/educator-profile/me":`/educators/${identifier}`).then(result=>setProfile(result.profile)).catch(requestError=>setError(requestError.message))},[identifier,draftPreview]);
 if(!profile)return <main className="public_educator_status">{error||"Loading educator…"}</main>;
 const blocks=profile.blocks||[],journeys=profile.journeys||[];
 return <main className="public_educator_page">
  <Link className="public_educator_back" to={draftPreview?"/my-settings/educator-profile":"/marketplace"}><i className="fa-solid fa-arrow-left"/> {draftPreview?"Back to profile editor":"Marketplace"}</Link>
  {draftPreview&&!profile.is_published&&<div className="public_educator_draft"><i className="fa-solid fa-eye"/><span><strong>Draft preview</strong>This profile is only visible to you until you publish it.</span></div>}
  <section className="public_educator_hero"><div className="public_educator_avatar">{profile.avatar_url?<img src={profile.avatar_url} alt={`${profile.first_name} ${profile.last_name}`}/>:<span>{profile.first_name?.[0]}{profile.last_name?.[0]}</span>}</div><div><span className="student_section_kicker">MAZE STUDIO EDUCATOR</span><h1>{profile.first_name} {profile.last_name}</h1><h2>{profile.headline||"Educator and course creator"}</h2><p>{profile.short_bio||profile.description||"This educator has not added an introduction yet."}</p><div className="public_educator_tags">{profile.location&&<span><i className="fa-solid fa-location-dot"/>{profile.location}</span>}{(profile.languages||[]).map(language=><span key={language}><i className="fa-solid fa-language"/>{language}</span>)}</div></div></section>
  {(profile.specialties||[]).length>0&&<section className="public_educator_specialties"><strong>Specializes in</strong><div>{profile.specialties.map(item=><span key={item}>{item}</span>)}</div></section>}
  {blocks.length>0&&<section className="public_educator_story"><header><span className="student_section_kicker">MEET YOUR EDUCATOR</span><h2>About {profile.first_name}</h2></header><ContentRenderer blocks={blocks}/></section>}
  <EducatorReviews educatorId={profile.educator_user_id}/>
  <section className="public_educator_courses"><header><div><span className="student_section_kicker">LEARN WITH {profile.first_name?.toUpperCase()}</span><h2>Published Learning Journeys</h2></div><small>{journeys.length} {journeys.length===1?"course":"courses"}</small></header>{journeys.length?<div>{journeys.map(journey=><article key={journey.id}><div>{journey.cover_url?<img src={journey.cover_url} alt=""/>:<i className="fa-solid fa-route"/>}</div><main><small>{journey.difficulty||"All levels"} · {journey.language||"Flexible"}</small><h3>{journey.title}</h3><p>{journey.description||"A structured learning experience."}</p><Link to={`/marketplace/journeys/${journey.id}`}>See course <i className="fa-solid fa-arrow-right"/></Link></main></article>)}</div>:<p>No published Learning Journeys yet.</p>}</section>
 </main>;
}
