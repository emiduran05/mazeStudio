import {
  createChallengeBlock,
  deleteChallengeBlock,
  uploadChallengeBlockAsset,
} from "../../../../api/challengeApi";

const questionTypes = new Set(["SINGLE_CHOICE","MULTIPLE_CHOICE","TRUE_FALSE","FILL_BLANK","SHORT_ANSWER","LONG_ANSWER","FILE_UPLOAD"]);
const palettes = [
  ["Content",[
    ["HEADING","Heading","fa-heading"],["TEXT","Text","fa-align-left"],["IMAGE","Image","fa-image"],
    ["VIDEO","Video","fa-circle-play"],["TABLE","Table","fa-table"],["CODE","Code","fa-code"],
    ["QUOTE","Quote","fa-quote-left"],["CALLOUT","Callout","fa-lightbulb"],["DIVIDER","Divider","fa-minus"],
    ["FILE","File","fa-file-arrow-up"],["PDF","PDF","fa-file-pdf"],
  ]],
  ["Questions",[
    ["SINGLE_CHOICE","Single choice","fa-circle-dot"],["MULTIPLE_CHOICE","Multiple choice","fa-list-check"],
    ["TRUE_FALSE","True / false","fa-toggle-on"],["FILL_BLANK","Fill blank","fa-pen"],
    ["SHORT_ANSWER","Short answer","fa-keyboard"],["LONG_ANSWER","Long answer","fa-align-left"],
    ["FILE_UPLOAD","Answer file","fa-paperclip"],
  ]],
];

const defaults = (type) => {
  if (questionTypes.has(type)) {
    const choice = ["SINGLE_CHOICE","MULTIPLE_CHOICE"].includes(type);
    return {
      type, prompt:{text:""}, points:1,
      options:choice?[{id:crypto.randomUUID(),text:""},{id:crypto.randomUUID(),text:""}]:[],
      answerKey:type==="MULTIPLE_CHOICE"?{correctOptionIds:[]}:type==="TRUE_FALSE"?{correctOptionId:true}:type==="FILL_BLANK"?{acceptedAnswers:[],normalization:{}}:{correctOptionId:null},
    };
  }
  if(type==="TABLE") return {type,content:{rows:[["",""],["",""]]}};
  return {type,content:{}};
};

export default function ChallengeBlockBuilder({challengeId,blocks,onChange,onMessage}) {
  const patch=(id,changes)=>onChange(blocks.map((block)=>block.id===id?{...block,...changes}:block));
  async function add(type){
    try{const block=await createChallengeBlock(challengeId,defaults(type));onChange([...blocks,block])}
    catch(error){onMessage(error.message)}
  }
  async function remove(id){
    try{await deleteChallengeBlock(id);onChange(blocks.filter((block)=>block.id!==id))}
    catch(error){onMessage(error.message)}
  }
  function move(index,direction){
    const target=index+direction;if(target<0||target>=blocks.length)return;
    const next=[...blocks];[next[index],next[target]]=[next[target],next[index]];onChange(next);
  }
  async function upload(block,file){
    if(!file)return;
    try{const updated=await uploadChallengeBlockAsset(block.id,file);patch(block.id,{content:updated.content});onMessage("File uploaded.")}
    catch(error){onMessage(error.message)}
  }
  const updateOption=(block,optionIndex,text)=>patch(block.id,{options_json:(block.options_json||[]).map((option,index)=>index===optionIndex?{...option,text}:option)});
  return <section className="challenge-block-builder challenge-mixed-builder">
    <aside className="challenge-block-palette">
      <span>Block library</span><h2>Add content</h2>
      {palettes.map(([group,items])=><div className="challenge-palette-group" key={group}><strong>{group}</strong>
        {items.map(([type,label,icon])=><button type="button" key={type} onClick={()=>add(type)}><i className={`fa-solid ${icon}`}/><span>{label}</span></button>)}
      </div>)}
    </aside>
    <div className="challenge-block-canvas">
      <header><span>Challenge canvas</span><h2>{blocks.length} blocks</h2><p>Mix explanations, media and graded questions in any order.</p></header>
      {!blocks.length&&<div className="challenge-empty-canvas"><i className="fa-solid fa-cubes"/><h3>Build your Challenge</h3><p>Add your first content or question block.</p></div>}
      {blocks.map((block,index)=><article className={`challenge-question challenge-content-block type-${block.block_type.toLowerCase()}`} key={block.id}>
        <div className="challenge-row"><h3><span className="challenge-block-number">{index+1}</span> {block.block_type.replaceAll("_"," ")}</h3>
          <div className="challenge-actions"><button type="button" disabled={!index} onClick={()=>move(index,-1)} aria-label="Move up"><i className="fa-solid fa-arrow-up"/></button><button type="button" disabled={index===blocks.length-1} onClick={()=>move(index,1)} aria-label="Move down"><i className="fa-solid fa-arrow-down"/></button><button type="button" onClick={()=>remove(block.id)}>Remove</button></div>
        </div>
        {questionTypes.has(block.block_type)?<>
          <div className="challenge-grid"><label>Prompt<input value={block.prompt_json?.text||""} onChange={(e)=>patch(block.id,{prompt_json:{...(block.prompt_json||{}),text:e.target.value}})}/></label><label>Points<input type="number" min="0" value={block.points??1} onChange={(e)=>patch(block.id,{points:e.target.value})}/></label></div>
          {["SINGLE_CHOICE","MULTIPLE_CHOICE"].includes(block.block_type)&&<div className="challenge-options-editor"><strong>Options and correct answer</strong>
            {(block.options_json||[]).map((option,optionIndex)=><div className="challenge-row" key={option.id}>
              <input type={block.block_type==="MULTIPLE_CHOICE"?"checkbox":"radio"} name={`correct-${block.id}`}
                checked={block.block_type==="MULTIPLE_CHOICE"?(block.answer_key_json?.correctOptionIds||[]).includes(option.id):block.answer_key_json?.correctOptionId===option.id}
                onChange={(e)=>patch(block.id,{answer_key_json:block.block_type==="MULTIPLE_CHOICE"
                  ?{...(block.answer_key_json||{}),correctOptionIds:e.target.checked?[...(block.answer_key_json?.correctOptionIds||[]),option.id]:(block.answer_key_json?.correctOptionIds||[]).filter((id)=>id!==option.id)}
                  :{...(block.answer_key_json||{}),correctOptionId:option.id}})}/>
              <input value={option.text||""} onChange={(e)=>updateOption(block,optionIndex,e.target.value)} placeholder={`Option ${optionIndex+1}`}/>
            </div>)}
            <button type="button" onClick={()=>patch(block.id,{options_json:[...(block.options_json||[]),{id:crypto.randomUUID(),text:""}]})}>Add option</button>
          </div>}
          {block.block_type==="TRUE_FALSE"&&<label>Correct answer<select value={String(block.answer_key_json?.correctOptionId??true)} onChange={(e)=>patch(block.id,{answer_key_json:{correctOptionId:e.target.value==="true"}})}><option value="true">True</option><option value="false">False</option></select></label>}
          {block.block_type==="FILL_BLANK"&&<label>Accepted answers<input value={(block.answer_key_json?.acceptedAnswers||[]).join(", ")} onChange={(e)=>patch(block.id,{answer_key_json:{...(block.answer_key_json||{}),acceptedAnswers:e.target.value.split(",").map((value)=>value.trim()).filter(Boolean)}})}/></label>}
          {["SHORT_ANSWER","LONG_ANSWER","FILE_UPLOAD"].includes(block.block_type)&&<p className="challenge-muted">This response is reviewed by the teacher.</p>}
        </>:<ContentFields block={block} patch={patch} upload={upload}/>}
      </article>)}
    </div>
  </section>;
}

function ContentFields({block,patch,upload}){
  const content=block.content||{};
  if(block.block_type==="DIVIDER") return <div className="challenge-divider-preview"/>;
  if(["IMAGE","FILE","PDF"].includes(block.block_type)) return <div className="challenge-asset-editor">
    {content.url&&block.block_type==="IMAGE"&&<img src={content.url} alt={content.alt||""}/>}
    {content.url&&block.block_type!=="IMAGE"&&<a href={content.url} target="_blank" rel="noreferrer">{content.name||"Open file"}</a>}
    <label className="challenge-upload-button"><i className="fa-solid fa-cloud-arrow-up"/> {content.url?"Replace file":"Choose file"}<input type="file" accept={block.block_type==="IMAGE"?"image/*":block.block_type==="PDF"?"application/pdf":undefined} onChange={(e)=>upload(block,e.target.files?.[0])}/></label>
    {block.block_type==="IMAGE"&&<input placeholder="Alternative text" value={content.alt||""} onChange={(e)=>patch(block.id,{content:{...content,alt:e.target.value}})}/>}
  </div>;
  if(block.block_type==="TABLE"){
    const rows=content.rows||[["",""],["",""]];
    return <div className="challenge-table-editor"><table><tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,colIndex)=><td key={colIndex}><input value={cell} onChange={(e)=>patch(block.id,{content:{...content,rows:rows.map((r,ri)=>ri===rowIndex?r.map((value,ci)=>ci===colIndex?e.target.value:value):r)}})}/></td>)}</tr>)}</tbody></table>
      <div className="challenge-actions"><button type="button" onClick={()=>patch(block.id,{content:{...content,rows:[...rows,Array(rows[0]?.length||2).fill("")]}})}>Add row</button><button type="button" onClick={()=>patch(block.id,{content:{...content,rows:rows.map((row)=>[...row,""])}})}>Add column</button></div>
    </div>;
  }
  if(block.block_type==="VIDEO") return <label>Video URL<input value={content.url||""} onChange={(e)=>patch(block.id,{content:{...content,url:e.target.value}})} placeholder="https://…"/></label>;
  const multiline=["TEXT","CODE","QUOTE","CALLOUT"].includes(block.block_type);
  return <label>{block.block_type==="HEADING"?"Heading":"Content"}{multiline?<textarea value={content.text||""} onChange={(e)=>patch(block.id,{content:{...content,text:e.target.value}})}/>:<input value={content.text||""} onChange={(e)=>patch(block.id,{content:{...content,text:e.target.value}})}/>}</label>;
}
