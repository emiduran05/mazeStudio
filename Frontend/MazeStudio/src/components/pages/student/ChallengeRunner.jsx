import { useState } from "react";

const LABELS = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True or false",
  FILL_BLANK: "Fill in the blank",
  SHORT_ANSWER: "Short answer",
  LONG_ANSWER: "Long answer",
  FILE_UPLOAD: "File upload",
};
const QUESTION_TYPES = new Set(Object.keys(LABELS));

export default function ChallengeRunner({
  challenge,
  onSubmit,
  submitting,
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
          if(!QUESTION_TYPES.has(block.block_type)) return <ContentBlock block={block} key={block.id}/>;
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

function ContentBlock({block}){
  const content=block.content||{};
  const type=block.block_type;
  if(type==="HEADING") return <h2 className="learner_content_heading">{content.text}</h2>;
  if(type==="TEXT") return <div className="learner_content_text">{content.text}</div>;
  if(type==="IMAGE") return <figure className="learner_content_media"><img src={content.url} alt={content.alt||""}/>{content.caption&&<figcaption>{content.caption}</figcaption>}</figure>;
  if(type==="VIDEO") return <div className="learner_content_media"><iframe src={content.url} title="Challenge video" allowFullScreen/></div>;
  if(type==="TABLE") return <div className="learner_content_table"><table><tbody>{(content.rows||[]).map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
  if(type==="CODE") return <pre className="learner_content_code"><code>{content.text}</code></pre>;
  if(type==="QUOTE") return <blockquote className="learner_content_quote">{content.text}</blockquote>;
  if(type==="CALLOUT") return <aside className="learner_content_callout"><i className="fa-solid fa-lightbulb"/><span>{content.text}</span></aside>;
  if(type==="DIVIDER") return <hr className="learner_content_divider"/>;
  if(["FILE","PDF"].includes(type)) return <a className="learner_content_file" href={content.url} target="_blank" rel="noreferrer"><i className={`fa-solid ${type==="PDF"?"fa-file-pdf":"fa-file-arrow-down"}`}/><span><strong>{content.name||"Attached file"}</strong><small>Open attachment</small></span></a>;
  return null;
}
