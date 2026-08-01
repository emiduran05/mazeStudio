import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import {
  attachChallengeStep,
  assignChallengeLearner,
  detachChallengeStep,
  getAssignableLearners,
  getChallenge,
  getChallengeAssignments,
  revokeChallengeAssignment,
  reorderChallengeBlocks,
  updateChallengeBlock,
  updateChallenge,
} from "../../../../api/challengeApi";
import { apiRequest } from "../../../../api/api";
import "./Challenges.css";
import JourneyWorkspaceNav from "../journeyBuilder/components/JourneyWorkspaceNav";
import "../journeyBuilder/JourneyBuilder.css";
import ChallengeBlockBuilder from "./ChallengeBlockBuilder";

export default function ChallengeEditor() {
  const { challengeId } = useParams();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [availableSteps,setAvailableSteps]=useState([]);
  const [linkedSteps,setLinkedSteps]=useState([]);
  const [selectedStep,setSelectedStep]=useState("");
  const [learners,setLearners]=useState([]);
  const [assignments,setAssignments]=useState([]);
  const [selectedEnrollment,setSelectedEnrollment]=useState("");
  const [journeyId,setJourneyId]=useState("");
  const [blocks,setBlocks]=useState([]);
  useEffect(() => { getChallenge(challengeId).then(async(d) => {
    setJourneyId(d.learning_journey_id);
    setForm({
    title:d.title||"",description:d.description||"",
    instructions:typeof d.instructions==="string"?d.instructions:(d.instructions?.text||""),
    status:d.status||"DRAFT",
    gradingMode:d.grading_mode||"AUTO",maxAttempts:d.max_attempts??"",passingPercentage:d.passing_percentage??70,
    totalPoints:d.total_points??100,releaseAt:d.release_at?.slice(0,16)||"",dueAt:d.due_at?.slice(0,16)||"",
    questions:(d.questions||[]).map((q)=>({id:q.id,type:q.question_type,prompt:q.prompt_json?.text||"",points:q.points,options:q.options_json||[],answerKey:q.answer_key_json||{}}))
    });
    setLinkedSteps(d.steps||[]);
    setBlocks(d.builderBlocks||[]);
    const builder=await apiRequest(`/learning-journeys/${d.learning_journey_id}/builder`);
    setAvailableSteps(builder.steps||[]);
    const [learnerData,assignmentData]=await Promise.all([
      getAssignableLearners(challengeId),
      getChallengeAssignments(challengeId),
    ]);
    setLearners(learnerData.learners||[]);
    setAssignments(assignmentData.assignments||[]);
  }).catch((e)=>setMessage(e.message)); },[challengeId]);
  if (!form) return <StudioLayout><main className="challenge-page">{message || "Loading…"}</main></StudioLayout>;
  const change=(key,value)=>setForm((f)=>({...f,[key]:value}));
  const updateQuestion=(index,changes)=>change("questions",form.questions.map((question,current)=>current===index?{...question,...changes}:question));
  function addQuestion(type="SINGLE_CHOICE"){
    const choice=["SINGLE_CHOICE","MULTIPLE_CHOICE"].includes(type);
    change("questions",[...form.questions,{type,prompt:"",points:1,
      options:choice?[{id:crypto.randomUUID(),text:""},{id:crypto.randomUUID(),text:""}]:[],
      answerKey:type==="MULTIPLE_CHOICE"?{correctOptionIds:[]}:type==="TRUE_FALSE"?{correctOptionId:true}:type==="FILL_BLANK"?{acceptedAnswers:[],normalization:{}}:{correctOptionId:null}}]);
  }
  function moveQuestion(index,direction){const target=index+direction;if(target<0||target>=form.questions.length)return;const next=[...form.questions];[next[index],next[target]]=[next[target],next[index]];change("questions",next)}
  function addOption(index){const question=form.questions[index];updateQuestion(index,{options:[...question.options,{id:crypto.randomUUID(),text:""}]})}
  async function save(e){e.preventDefault();setMessage("");try{
    await updateChallenge(challengeId,{...form,maxAttempts:form.maxAttempts===""?null:Number(form.maxAttempts),
      passingPercentage:Number(form.passingPercentage),totalPoints:Number(form.totalPoints),
      releaseAt:form.releaseAt||null,dueAt:form.dueAt||null,questions:undefined});
    await Promise.all(blocks.map((block)=>updateChallengeBlock(block.id,{
      content:block.content,settings:block.settings,
      prompt:block.prompt_json,options:block.options_json,config:block.config_json,
      points:Number(block.points||0),required:block.is_required,
      answerKey:block.answer_key_json,gradingConfig:block.grading_config_json,
    })));
    await reorderChallengeBlocks(challengeId,blocks.map((block)=>block.id));
    setMessage("Challenge saved.");
  }catch(err){setMessage(err.message)}}
  async function attachToStep(){
    if(!selectedStep)return;
    setMessage("");
    try{
      await attachChallengeStep(challengeId,{stepId:selectedStep,required:true});
      const step=availableSteps.find((item)=>item.id===selectedStep);
      setLinkedSteps((current)=>[...current,{step_id:selectedStep,title:step?.title,is_required_for_step:true}]);
      setSelectedStep("");
      setMessage("Challenge added to the Step.");
    }catch(error){setMessage(error.message)}
  }
  async function removeReviewedStep(stepId){
    try{
      await detachChallengeStep(challengeId,stepId);
      setLinkedSteps((current)=>current.filter((step)=>step.step_id!==stepId));
      setMessage("Reviewed topic removed.");
    }catch(error){setMessage(error.message)}
  }
  async function assignLearner(){
    if(!selectedEnrollment)return;
    try{
      await assignChallengeLearner(challengeId,selectedEnrollment);
      const data=await getChallengeAssignments(challengeId);
      setAssignments(data.assignments||[]);
      setSelectedEnrollment("");
      setMessage("Challenge assigned to learner.");
    }catch(error){setMessage(error.message)}
  }
  async function unassignLearner(enrollmentId){
    try{
      await revokeChallengeAssignment(challengeId,enrollmentId);
      const data=await getChallengeAssignments(challengeId);
      setAssignments(data.assignments||[]);
    }catch(error){setMessage(error.message)}
  }
  async function assignAllLearners(){
    const unassigned=learners.filter((learner)=>
      !assignments.some((assignment)=>
        assignment.enrollment_id===learner.enrollment_id&&
        assignment.status!=="REVOKED"
      )
    );
    if(unassigned.length===0){
      setMessage("Every enrolled learner is already assigned.");
      return;
    }
    try{
      await Promise.all(unassigned.map((learner)=>
        assignChallengeLearner(challengeId,learner.enrollment_id)
      ));
      const data=await getChallengeAssignments(challengeId);
      setAssignments(data.assignments||[]);
      setMessage(`Challenge assigned to ${unassigned.length} learners.`);
    }catch(error){setMessage(error.message)}
  }
  async function unassignAllLearners(){
    const active=assignments.filter((assignment)=>assignment.status!=="REVOKED");
    if(active.length===0)return;
    if(!window.confirm(`Remove this Challenge from ${active.length} learners?`))return;
    try{
      await Promise.all(active.map((assignment)=>
        revokeChallengeAssignment(challengeId,assignment.enrollment_id)
      ));
      const data=await getChallengeAssignments(challengeId);
      setAssignments(data.assignments||[]);
      setMessage("All learner assignments removed.");
    }catch(error){setMessage(error.message)}
  }
  return <StudioLayout><main className="challenge-page">{journeyId&&<JourneyWorkspaceNav journeyId={journeyId} active="CHALLENGES"/>}<header className="challenge-head"><h1>Edit Challenge</h1><Link to={`/studio/challenges/${challengeId}/submissions`}>Submissions & private links</Link></header><form className="challenge-panel" onSubmit={save}>
    <section className="challenge-card">
      <h2>Topics reviewed</h2>
      <p className="challenge-muted">Choose one or more Steps only to describe which topics this independent Challenge evaluates.</p>
      {linkedSteps.map((step)=><div className="challenge-row challenge-topic-row" key={step.step_id}><span><i className="fa-solid fa-check"/> {step.title||step.step_id}</span><button type="button" onClick={()=>removeReviewedStep(step.step_id)}><i className="fa-solid fa-xmark"/> Remove</button></div>)}
      <div className="challenge-row">
        <select value={selectedStep} onChange={(e)=>setSelectedStep(e.target.value)}>
          <option value="">Choose a Step…</option>
          {availableSteps.filter((step)=>!linkedSteps.some((linked)=>linked.step_id===step.id)).map((step)=><option value={step.id} key={step.id}>{step.title}</option>)}
        </select>
        <button type="button" onClick={attachToStep} disabled={!selectedStep}>Add topic</button>
      </div>
    </section>
    <section className="challenge-card">
      <div className="challenge-row"><div><h2>Assigned learners</h2><p className="challenge-muted">Only assigned learners can open and submit this Challenge.</p></div><div className="challenge-actions"><button type="button" onClick={assignAllLearners}><i className="fa-solid fa-users"/> Assign all</button><button type="button" className="challenge-danger-button" onClick={unassignAllLearners}>Remove all</button></div></div>
      {assignments.filter((assignment)=>assignment.status!=="REVOKED").map((assignment)=><div className="challenge-row" key={assignment.enrollment_id}>
        <span>{[assignment.first_name,assignment.last_name].filter(Boolean).join(" ")||assignment.email} · {assignment.status}</span>
        <button type="button" onClick={()=>unassignLearner(assignment.enrollment_id)}>Remove</button>
      </div>)}
      <div className="challenge-row">
        <select value={selectedEnrollment} onChange={(event)=>setSelectedEnrollment(event.target.value)}>
          <option value="">Choose an enrolled learner…</option>
          {learners.filter((learner)=>!assignments.some((assignment)=>assignment.enrollment_id===learner.enrollment_id&&assignment.status!=="REVOKED")).map((learner)=><option value={learner.enrollment_id} key={learner.enrollment_id}>{[learner.first_name,learner.last_name].filter(Boolean).join(" ")||learner.email}</option>)}
        </select>
        <button type="button" onClick={assignLearner} disabled={!selectedEnrollment}>Assign Challenge</button>
      </div>
    </section>
    <div className="challenge-grid">
      <label>Title<input value={form.title} onChange={(e)=>change("title",e.target.value)} required/></label>
      <label>Status<select value={form.status} onChange={(e)=>change("status",e.target.value)}><option>DRAFT</option><option>PUBLISHED</option></select></label>
      <label>Grading<select value={form.gradingMode} onChange={(e)=>change("gradingMode",e.target.value)}><option>AUTO</option><option>MANUAL</option><option>HYBRID</option></select></label>
      <label>Attempts (blank = unlimited)<input type="number" min="1" value={form.maxAttempts} onChange={(e)=>change("maxAttempts",e.target.value)}/></label>
      <label>Passing %<input type="number" min="0" max="100" value={form.passingPercentage} onChange={(e)=>change("passingPercentage",e.target.value)}/></label>
      <label>Total points<input type="number" min="1" value={form.totalPoints} onChange={(e)=>change("totalPoints",e.target.value)}/></label>
      <label>Release<input type="datetime-local" value={form.releaseAt} onChange={(e)=>change("releaseAt",e.target.value)}/></label>
      <label>Deadline<input type="datetime-local" value={form.dueAt} onChange={(e)=>change("dueAt",e.target.value)}/></label>
    </div>
    <label>Description<textarea value={form.description} onChange={(e)=>change("description",e.target.value)}/></label>
    <label>Instructions<textarea value={form.instructions} onChange={(e)=>change("instructions",e.target.value)}/></label>
    <ChallengeBlockBuilder challengeId={challengeId} blocks={blocks} onChange={setBlocks} onMessage={setMessage}/>
    <section className="challenge-block-builder challenge-legacy-builder" aria-hidden="true">
      <aside className="challenge-block-palette">
        <span>Question blocks</span>
        <h2>Add a block</h2>
        {[
          ["SINGLE_CHOICE","Single choice","fa-circle-dot"],
          ["MULTIPLE_CHOICE","Multiple choice","fa-list-check"],
          ["TRUE_FALSE","True / false","fa-toggle-on"],
          ["FILL_BLANK","Fill blank","fa-pen"],
          ["SHORT_ANSWER","Short answer","fa-keyboard"],
          ["LONG_ANSWER","Long answer","fa-align-left"],
          ["FILE_UPLOAD","File upload","fa-paperclip"],
        ].map(([type,label,icon])=><button type="button" key={type} onClick={()=>addQuestion(type)}><i className={`fa-solid ${icon}`}/><span>{label}</span></button>)}
      </aside>
      <div className="challenge-block-canvas">
        <header><span>Challenge content</span><h2>{form.questions.length} question blocks</h2></header>
        {form.questions.length===0&&<div className="challenge-empty-canvas"><i className="fa-solid fa-cubes"/><h3>Build your Challenge</h3><p>Choose a question block from the left.</p></div>}
    {form.questions.map((q,index)=><div className="challenge-question" key={q.id||index}>
      <div className="challenge-row"><h3><span className="challenge-block-number">{index+1}</span> {q.type.replaceAll("_"," ")}</h3><div className="challenge-actions"><button type="button" disabled={index===0} onClick={()=>moveQuestion(index,-1)} aria-label="Move up"><i className="fa-solid fa-arrow-up"/></button><button type="button" disabled={index===form.questions.length-1} onClick={()=>moveQuestion(index,1)} aria-label="Move down"><i className="fa-solid fa-arrow-down"/></button><button type="button" onClick={()=>change("questions",form.questions.filter((_,i)=>i!==index))}>Remove</button></div></div>
      <div className="challenge-grid"><label>Type<select value={q.type} onChange={(e)=>updateQuestion(index,{type:e.target.value,answerKey:{},options:["SINGLE_CHOICE","MULTIPLE_CHOICE"].includes(e.target.value)?[{id:crypto.randomUUID(),text:""},{id:crypto.randomUUID(),text:""}]:[]})}>
        {["SINGLE_CHOICE","MULTIPLE_CHOICE","TRUE_FALSE","FILL_BLANK","SHORT_ANSWER","LONG_ANSWER","FILE_UPLOAD"].map((x)=><option key={x}>{x}</option>)}</select></label>
        <label>Points<input type="number" min="0" value={q.points} onChange={(e)=>updateQuestion(index,{points:e.target.value})}/></label></div>
      <label>Prompt<input value={q.prompt} onChange={(e)=>updateQuestion(index,{prompt:e.target.value})}/></label>

      {["SINGLE_CHOICE","MULTIPLE_CHOICE"].includes(q.type)&&<div className="challenge-panel">
        <strong>Options and correct answer</strong>
        {q.options.map((option,optionIndex)=><div className="challenge-row" key={option.id}>
          <input
            type={q.type==="MULTIPLE_CHOICE"?"checkbox":"radio"}
            name={`correct-${index}`}
            checked={q.type==="MULTIPLE_CHOICE"?(q.answerKey.correctOptionIds||[]).includes(option.id):q.answerKey.correctOptionId===option.id}
            onChange={(e)=>updateQuestion(index,{answerKey:q.type==="MULTIPLE_CHOICE"
              ?{...q.answerKey,correctOptionIds:e.target.checked?[...(q.answerKey.correctOptionIds||[]),option.id]:(q.answerKey.correctOptionIds||[]).filter((id)=>id!==option.id)}
              :{...q.answerKey,correctOptionId:option.id}})}
            aria-label={`Correct option ${optionIndex+1}`}
          />
          <input value={option.text} placeholder={`Option ${optionIndex+1}`} onChange={(e)=>updateQuestion(index,{options:q.options.map((x,i)=>i===optionIndex?{...x,text:e.target.value}:x)})}/>
          <button type="button" disabled={q.options.length<=2} onClick={()=>updateQuestion(index,{options:q.options.filter((x)=>x.id!==option.id)})}>Remove</button>
        </div>)}
        <button type="button" onClick={()=>addOption(index)}>Add option</button>
      </div>}

      {q.type==="TRUE_FALSE"&&<label>Correct answer<select value={String(q.answerKey.correctOptionId??true)} onChange={(e)=>updateQuestion(index,{answerKey:{correctOptionId:e.target.value==="true"}})}><option value="true">True</option><option value="false">False</option></select></label>}

      {q.type==="FILL_BLANK"&&<>
        <label>Accepted answers<input value={(q.answerKey.acceptedAnswers||[]).join(", ")} onChange={(e)=>updateQuestion(index,{answerKey:{...q.answerKey,acceptedAnswers:e.target.value.split(",").map((value)=>value.trim()).filter(Boolean)}})} placeholder="Answer one, Answer two"/></label>
        <div className="challenge-grid">
          <label><input type="checkbox" checked={q.answerKey.normalization?.caseSensitive===true} onChange={(e)=>updateQuestion(index,{answerKey:{...q.answerKey,normalization:{...q.answerKey.normalization,caseSensitive:e.target.checked}}})}/> Case sensitive</label>
          <label><input type="checkbox" checked={q.answerKey.normalization?.ignoreDiacritics===true} onChange={(e)=>updateQuestion(index,{answerKey:{...q.answerKey,normalization:{...q.answerKey.normalization,ignoreDiacritics:e.target.checked}}})}/> Ignore accents</label>
        </div>
      </>}

      {["SHORT_ANSWER","LONG_ANSWER","FILE_UPLOAD"].includes(q.type)&&<p className="challenge-muted">This response requires teacher review.</p>}
    </div>)}
      </div>
    </section>
    <div className="challenge-actions challenge-save-bar"><span>{blocks.length} blocks · {blocks.reduce((sum,block)=>sum+Number(block.points||0),0)} points</span><button type="submit">Save Challenge</button></div>
    {message&&<p className={message.includes("saved")?"challenge-success":"challenge-error"}>{message}</p>}
  </form></main></StudioLayout>;
}
