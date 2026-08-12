import { useRef, useState } from "react";
import { uploadSpeakingResponse } from "../../../api/challengeApi";
import ContentRenderer from "../../contentRenderer/ContentRenderer";
import ReliableAudio from "../../contentRenderer/ReliableAudio";
import { normalizeRecordedAudio } from "../../../utils/audioRecording";

const LABELS = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True or false",
  FILL_BLANK: "Fill in the blank",
  SHORT_ANSWER: "Short answer",
  LONG_ANSWER: "Long answer",
  FILE_UPLOAD: "File upload",
  SPEAKING: "Speaking response",
};
const QUESTION_TYPES = new Set(Object.keys(LABELS));

export default function ChallengeRunner({
  challenge,
  onSubmit,
  submitting,
  uploadSpeaking,
}) {
  const [answers, setAnswers] = useState({});
  const set = (id, value) =>
    setAnswers((current) => ({ ...current, [id]: value }));

  return (
    <form
      className="learner_challenge_form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(answers);
      }}
    >
      <div className="learner_question_stack">
        {(challenge.blocks?.length ? challenge.blocks : (challenge.questions || []).map((question)=>({
          ...question, block_type:question.question_type, question_id:question.id,
        }))).map((block, index) => {
          if(!QUESTION_TYPES.has(block.block_type)) return <ContentRenderer blocks={[block]} key={block.id}/>;
          const question={...block,id:block.question_id||block.id,question_type:block.block_type};
          return (
          <fieldset
            className="learner_question_card"
            key={question.id}
          >
            <legend>
              <span className="learner_question_number">{index + 1}</span>
              <span>
                <small>
                  {LABELS[question.question_type] ||
                    question.question_type}
                </small>
                <strong>
                  {question.prompt_json?.text || "Question"}
                </strong>
              </span>
              <em>{question.points} pts</em>
            </legend>

            <div className="learner_question_body">
              {question.question_type === "TRUE_FALSE" ? (
                <div className="learner_option_grid two">
                  {[true, false].map((value) => (
                    <label className="learner_option_card" key={String(value)}>
                      <input
                        type="radio"
                        name={question.id}
                        required={question.is_required}
                        onChange={() => set(question.id, { value })}
                      />
                      <span>
                        <i
                          className={`fa-solid ${
                            value ? "fa-check" : "fa-xmark"
                          }`}
                        />
                        {value ? "True" : "False"}
                      </span>
                    </label>
                  ))}
                </div>
              ) : question.question_type === "SINGLE_CHOICE" ? (
                <div className="learner_option_list">
                  {(question.options_json || []).map((option, optionIndex) => (
                    <label className="learner_option_card" key={option.id}>
                      <input
                        type="radio"
                        name={question.id}
                        required={question.is_required}
                        onChange={() =>
                          set(question.id, {
                            selectedOptionIds: [option.id],
                          })
                        }
                      />
                      <span>
                        <b>{String.fromCharCode(65 + optionIndex)}</b>
                        {option.text}
                      </span>
                    </label>
                  ))}
                </div>
              ) : question.question_type === "MULTIPLE_CHOICE" ? (
                <div className="learner_option_list">
                  {(question.options_json || []).map((option, optionIndex) => (
                    <label className="learner_option_card" key={option.id}>
                      <input
                        type="checkbox"
                        onChange={(event) => {
                          const old =
                            answers[question.id]?.selectedOptionIds || [];
                          set(question.id, {
                            selectedOptionIds: event.target.checked
                              ? [...old, option.id]
                              : old.filter((id) => id !== option.id),
                          });
                        }}
                      />
                      <span>
                        <b>{String.fromCharCode(65 + optionIndex)}</b>
                        {option.text}
                      </span>
                    </label>
                  ))}
                </div>
              ) : question.question_type === "FILE_UPLOAD" ? (
                <div className="learner_upload_placeholder">
                  <i className="fa-solid fa-cloud-arrow-up" />
                  <strong>File response</strong>
                  <span>File submission is not configured yet.</span>
                </div>
              ) : question.question_type === "SPEAKING" ? (
                <SpeakingRecorder challengeId={challenge.id} required={question.is_required} uploadSpeaking={uploadSpeaking} onReady={(asset)=>set(question.id, asset)} />
              ) : (
                <textarea
                  rows={
                    question.question_type === "LONG_ANSWER" ? 7 : 3
                  }
                  required={question.is_required}
                  placeholder="Write your answer here…"
                  onChange={(event) =>
                    set(question.id, { text: event.target.value })
                  }
                />
              )}
            </div>
          </fieldset>
          );
        })}
      </div>

      <footer className="learner_challenge_submit">
        <div>
          <strong>Ready to submit?</strong>
          <span>Your attempt will be saved when you continue.</span>
        </div>
        <button disabled={submitting}>
          <i
            className={`fa-solid ${
              submitting ? "fa-spinner fa-spin" : "fa-paper-plane"
            }`}
          />
          {submitting ? "Submitting…" : "Submit attempt"}
        </button>
      </footer>
    </form>
  );
}

function SpeakingRecorder({ challengeId, required, uploadSpeaking, onReady }) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const [recording,setRecording]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [preview,setPreview]=useState("");
  const [error,setError]=useState("");
  async function start(){
    try{
      setError("");
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current=stream;chunksRef.current=[];
      const recorder=new MediaRecorder(stream);recorderRef.current=recorder;
      recorder.ondataavailable=(event)=>{if(event.data.size)chunksRef.current.push(event.data)};
      recorder.onstop=async()=>{
        stream.getTracks().forEach((track)=>track.stop());
        const recordedBlob=new Blob(chunksRef.current,{type:recorder.mimeType||"audio/webm"});setUploading(true);
        try{const normalized=await normalizeRecordedAudio(recordedBlob);durationRef.current=normalized.durationSeconds||Math.max(1,(Date.now()-startedAtRef.current)/1000);const localUrl=URL.createObjectURL(normalized.blob);setPreview(localUrl);const file=new File([normalized.blob],`speaking-${Date.now()}.${normalized.extension}`,{type:normalized.blob.type});const {asset}=await (uploadSpeaking?uploadSpeaking(file):uploadSpeakingResponse(challengeId,file));onReady({...asset,durationSeconds:durationRef.current})}
        catch(uploadError){setError(uploadError.message);setPreview("")}finally{setUploading(false)}
      };
      recorder.start(250);startedAtRef.current=Date.now();setRecording(true);
    }catch(mediaError){setError(mediaError.message||"Microphone access was denied.")}
  }
  function stop(){recorderRef.current?.stop();setRecording(false)}
  return <div className="speaking_recorder">
    <div className={`speaking_recorder_icon ${recording?"recording":""}`}><i className="fa-solid fa-microphone"/></div>
    <div><strong>{recording?"Recording your answer…":preview?"Recording ready":"Record your spoken answer"}</strong><span>{uploading?"Uploading securely…":"You can listen before submitting."}</span></div>
    {preview&&<ReliableAudio src={preview} durationSeconds={durationRef.current}/>} 
    <button type="button" onClick={recording?stop:start} disabled={uploading}>{recording?"Stop recording":preview?"Record again":"Start recording"}</button>
    {required&&<input className="speaking_required" required value={preview} onChange={()=>{}} aria-label="Speaking response required"/>}
    {error&&<p className="speaking_error">{error}</p>}
  </div>;
}
