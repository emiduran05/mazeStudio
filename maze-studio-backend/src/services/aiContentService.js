const pool = require("../config/db");
const stepModel = require("../models/stepModel");
const journeyAccess = require("./journeyAccessService");
const blockService = require("./blockService");
const { parseJsonPayload } = require("../utils/jsonPayload");

const TYPES = new Set(["HEADING","TEXT","IMAGE","CALLOUT","QUOTE","DIVIDER","TABLE","CHECKLIST","FLASHCARDS","EQUATION","MULTIPLE_CHOICE","TRUE_FALSE","SHORT_ANSWER","FILL_BLANKS","MATCHING","CLASSIFICATION","ORDERING"]);
const httpError=(message,statusCode)=>Object.assign(new Error(message),{statusCode});

async function stepAccess(userId,stepId){
  const step=await stepModel.findStepById(stepId);
  if(!step)throw httpError("Step not found",404);
  await journeyAccess.requireAccess(userId,step.learning_journey_id,"EDIT");
  return step;
}

async function openai(path,options={}){
  const key=process.env.OPENAI_API_KEY;
  if(!key)throw httpError("OPENAI_API_KEY is not configured",503);
  const response=await fetch(`https://api.openai.com/v1${path}`,{...options,headers:{Authorization:`Bearer ${key}`,...options.headers}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw httpError(data.error?.message||"AI generation failed",502);
  return data;
}

const schema={type:"object",additionalProperties:false,required:["title","summary","blocks"],properties:{title:{type:"string"},summary:{type:"string"},blocks:{type:"array",minItems:2,maxItems:20,items:{type:"object",additionalProperties:false,required:["blockType","contentJson","settingsJson","layoutGroup","column"],properties:{blockType:{type:"string",enum:[...TYPES]},contentJson:{type:"string"},settingsJson:{type:"string"},layoutGroup:{type:"string"},column:{type:"integer",minimum:0,maximum:3}}}}}};

const id=()=>require("crypto").randomUUID();
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
const strings=value=>Array.isArray(value)?value.map(item=>String(item?.correctAnswer??item?.answer??item?.value??item?.text??item??"").trim()).filter(Boolean):[];
function normalizeFillBlanks(value){
  let text=String(value.text||value.prompt||value.sentence||"").replace(/\\[nrt]+/g," ").replace(/\s+/g," ").trim();
  const explicitAnswers=strings(value.acceptedAnswers||value.correctAnswers),fallbackAnswers=strings(value.answers||value.blanks);
  let answers=explicitAnswers.length?explicitAnswers:fallbackAnswers;
  let requiresTeacherReview=false;
  if(!answers.length&&value.answer!==undefined)answers=[String(value.answer).trim()].filter(Boolean);
  text=text
    .replace(/\{\{\s*(?:blank|gap|answer)(?:[_\s-]*\d+)?\s*\}\}/gi,"{{blank}}")
    .replace(/\[\[\s*(?:blank|gap|answer)(?:[_\s-]*\d+)?\s*\]\]/gi,"{{blank}}")
    .replace(/<\s*(?:blank|gap|answer)(?:[_\s-]*\d+)?\s*>/gi,"{{blank}}")
    .replace(/\[\s*(?:blank|gap)(?:[_\s-]*\d+)?\s*\]/gi,"{{blank}}")
    .replace(/\(\s*(?:blank|gap)(?:[_\s-]*\d+)?\s*\)/gi,"{{blank}}")
    .replace(/(?:bla)?nk\s*\}\}/gi,"{{blank}}");
  const embedded=[];
  text=text.replace(/\[\[([^\]]+)\]\]|\{\{(?!blank\}\})([^}]+)\}\}/gi,(_,square,curly)=>{embedded.push(String(square||curly).trim());return "{{blank}}"});
  text=text.replace(/_{2,}|\.{3,}/gi,"{{blank}}");
  if(!answers.length&&embedded.length)answers=embedded;
  const suppliedOptions=strings(value.wordBank||value.options||value.choices);
  if(!answers.length&&suppliedOptions.length){answers=[suppliedOptions[0]];requiresTeacherReview=true}
  if(!answers.length){answers=["Answer"];requiresTeacherReview=true}
  if(!text.trim()){text="Complete the answer: {{blank}}";requiresTeacherReview=true}
  if(!(text.match(/\{\{blank\}\}/g)||[]).length){
    for(const answer of answers){
      const escaped=answer.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),matcher=new RegExp(escaped,"i");
      if(matcher.test(text))text=text.replace(matcher,"{{blank}}");
    }
    if(!(text.match(/\{\{blank\}\}/g)||[]).length){text=`${text.trim()} {{blank}}`;requiresTeacherReview=true}
  }
  let finalCount=(text.match(/\{\{blank\}\}/g)||[]).length;
  const originalAnswers=[...answers];
  if(answers.length<finalCount){const candidates=suppliedOptions.filter(option=>!answers.includes(option));while(answers.length<finalCount)answers.push(candidates.shift()||`Answer ${answers.length+1}`);requiresTeacherReview=true}
  if(answers.length>finalCount){answers=answers.slice(0,finalCount);requiresTeacherReview=true}
  const wordBank=[...new Set([...originalAnswers,...answers,...suppliedOptions].map(option=>option.trim()).filter(Boolean))];
  if(wordBank.length<2)requiresTeacherReview=true;
  return{text,acceptedAnswers:answers,wordBank,suggestedAnswer:answers.join(" / "),explanation:String(value.explanation||value.rationale||""),requiresTeacherReview};
}

function validateGeneratedExercise(type,content){
  return content;
}

function normalizeClassification(value,rawSettings={}){
  const settings=object(rawSettings),rawItems=Array.isArray(value.items)?value.items:Array.isArray(value.words)?value.words:Array.isArray(value.terms)?value.terms:[];
  const categories=(Array.isArray(value.categories)?value.categories:[]).map(category=>typeof category==="string"?{id:id(),label:category.trim()}:{id:String(category.id||id()),label:String(category.label||category.name||category.category||"").trim()}).filter(category=>category.label);
  let requiresTeacherReview=false;
  const categoryByLabel=()=>new Map(categories.map(category=>[category.label.toLowerCase(),category]));
  for(const item of rawItems){
    if(!item||typeof item==="string")continue;
    const label=String(item.category||item.correctCategory||item.type||item.categoryLabel||"").trim();
    if(label&&!categoryByLabel().has(label.toLowerCase())&&!categories.some(category=>category.id===label))categories.push({id:id(),label});
  }
  while(categories.length<2)categories.push({id:id(),label:`Category ${categories.length+1}`});
  const byLabel=categoryByLabel();
  const items=(rawItems.length?rawItems:[{text:"Item to classify"}]).map((item,index)=>{
    const source=typeof item==="string"?{text:item}:object(item),text=String(source.text||source.word||source.term||source.value||`Item ${index+1}`).trim();
    const candidate=String(source.correctCategoryId||source.categoryId||source.category||source.correctCategory||source.type||source.categoryLabel||"").trim();
    let category=categories.find(entry=>entry.id===candidate)||byLabel.get(candidate.toLowerCase());
    if(!category&&/^\d+$/.test(candidate)){const numeric=Number(candidate);category=categories[numeric]||categories[numeric-1]}
    if(!category){category=categories[index%categories.length];requiresTeacherReview=true}
    return{id:String(source.id||id()),text,correctCategoryId:category.id,imageUrl:/^https?:\/\//i.test(String(source.imageUrl||source.url||""))?String(source.imageUrl||source.url):"",alt:String(source.alt||"")};
  });
  return{content:{prompt:String(value.prompt||value.question||value.instructions||"Classify each item"),categories,items,explanation:String(value.explanation||value.rationale||"")},settings:{...settings,points:Number(settings.points)||items.length,requiresTeacherReview,aiWarning:requiresTeacherReview?"Maze AI preserved this exercise but could not infer every category with certainty. Review the answer key before publishing.":""}};
}
function normalizeTableContent(raw,rawSettings={}){
  const value=object(raw),nested=object(value.table),settings=object(rawSettings);
  const source=Object.keys(nested).length?nested:value;
  const headers=Array.isArray(source.headers)?source.headers:Array.isArray(source.columns)?source.columns:[];
  const sourceRows=Array.isArray(source.rows)?source.rows:Array.isArray(source.data)?source.data:Array.isArray(source.body)?source.body:Array.isArray(raw)?raw:[];
  const cell=(item,isHeader=false)=>({
    value:String(item&&typeof item==="object"?item.value??item.text??item.label??item.content??item.name??"":item??""),
    isHeader:Boolean(item&&typeof item==="object"&&item.isHeader!==undefined?item.isHeader:isHeader),
    imageUrl:item&&typeof item==="object"&&/^https?:\/\//i.test(String(item.imageUrl||item.url||""))?String(item.imageUrl||item.url):"",
    alt:item&&typeof item==="object"?String(item.alt||item.altText||""):"",
  });
  const body=sourceRows.map((row,rowIndex)=>{
    const values=Array.isArray(row)?row:Array.isArray(row?.cells)?row.cells:row&&typeof row==="object"?Object.values(row):[];
    return values.map(item=>cell(item,!headers.length&&rowIndex===0&&Boolean(source.headerRow??value.headerRow??settings.headerRow)));
  }).filter(row=>row.length);
  const rows=[...(headers.length?[headers.map(item=>cell(item,true))]:[]),...body];
  if(!rows.length||!rows.some(row=>row.some(item=>item.value.trim())))return{content:{rows:[[cell("Column 1",true),cell("Column 2",true)],[cell("Add content"),cell("Add content")]]},settings:{striped:false,showBorders:true,headerRow:true,requiresTeacherReview:true,aiWarning:"Maze AI returned an empty table. Add or review its cells before publishing."}};
  const width=Math.max(...rows.map(row=>row.length));
  const padded=rows.map((row,rowIndex)=>[...row,...Array.from({length:width-row.length},()=>cell("",rowIndex===0&&Boolean(headers.length||settings.headerRow)))]);
  return{content:{rows:padded},settings:{striped:Boolean(settings.striped),showBorders:settings.showBorders!==false,headerRow:headers.length>0||Boolean(settings.headerRow||source.headerRow||value.headerRow)}};
}
function normalizeGeneratedBlock(block){
  const type=block.blockType,raw=block.content,value=object(raw),plain=typeof raw==="string"?raw:"";
  let content=value,settings=object(block.settings);
  if(type==="HEADING")content={text:String(value.text||value.title||plain),level:Number(value.level)||2};
  if(type==="TEXT"){
    const richText=Array.isArray(value.richText||value.runs)?(value.richText||value.runs).map(run=>run.type==="image"?{type:"image",url:/^https?:\/\//i.test(String(run.url||""))?String(run.url):"",alt:String(run.alt||""),width:Math.min(800,Math.max(24,Number(run.width)||180))}:{text:String(run.text||""),color:String(run.color||""),backgroundColor:String(run.backgroundColor||""),fontSize:Math.min(72,Math.max(10,Number(run.fontSize)||16)),bold:Boolean(run.bold),italic:Boolean(run.italic),underline:Boolean(run.underline),link:/^https?:\/\//i.test(String(run.link||""))?String(run.link):""}).filter(run=>run.type==="image"?run.url:run.text):[];
    content=richText.length?{text:richText.map(run=>run.text||"").join(""),richText}:{text:String(value.text||value.body||value.markdown||plain)};
  }
  if(type==="IMAGE"){
    const url=String(value.url||value.imageUrl||value.src||"").trim(),sourceUrl=String(value.sourceUrl||value.source||"").trim();
    content={url:/^https?:\/\//i.test(url)?url:"",caption:String(value.caption||""),alt:String(value.alt||value.altText||""),sourceUrl:/^https?:\/\//i.test(sourceUrl)?sourceUrl:"",placeholderPrompt:String(value.placeholderPrompt||value.imageDescription||value.searchQuery||value.alt||"Add a relevant image")};settings={...settings,fit:settings.fit||"contain",placeholder:!/^https?:\/\//i.test(url)};
  }
  if(type==="CALLOUT")content={text:String(value.text||value.body||plain)};
  if(type==="QUOTE")content={text:String(value.text||value.quote||plain),author:String(value.author||"")};
  if(type==="EQUATION")content={expression:String(value.expression||value.latex||value.equation||plain),caption:String(value.caption||"")};
  if(type==="TABLE"){
    const table=normalizeTableContent(raw,settings);content=table.content;settings=table.settings;
  }
  if(type==="MULTIPLE_CHOICE"){
    const explicitIndex=Number.isInteger(value.correctAnswerIndex)?value.correctAnswerIndex:Number.isInteger(value.correctIndex)?value.correctIndex:null;
    const answerText=String(value.correctAnswer??value.answer??"").trim().toLowerCase();
    let requiresTeacherReview=false;
    let options=(Array.isArray(value.options)?value.options:[]).map((option,index)=>typeof option==="string"?{id:id(),text:option.trim(),isCorrect:explicitIndex!==null&&index===explicitIndex}:{id:option.id||id(),text:String(option.text||option.label||option.value||"").trim(),isCorrect:Boolean(option.isCorrect??option.correct),imageUrl:/^https?:\/\//i.test(String(option.imageUrl||option.url||""))?String(option.imageUrl||option.url):"",alt:String(option.alt||"") }).filter(option=>option.text||option.imageUrl);
    if(answerText)options=options.map((option,index)=>({...option,isCorrect:option.text.trim().toLowerCase()===answerText||String(index).toLowerCase()===answerText||String.fromCharCode(65+index).toLowerCase()===answerText}));
    if(answerText&&!options.some(option=>option.isCorrect)&&![/^\d+$/,/^[a-z]$/].some(pattern=>pattern.test(answerText))){options.push({id:id(),text:String(value.correctAnswer??value.answer),isCorrect:true});requiresTeacherReview=true}
    while(options.length<2){options.push({id:id(),text:options.length?"Alternative":"Correct answer",isCorrect:options.length===0});requiresTeacherReview=true}
    if(!options.some(option=>option.isCorrect)){options[0].isCorrect=true;requiresTeacherReview=true}
    content={question:String(value.question||value.prompt||"Choose the correct answer"),options,explanation:String(value.explanation||value.rationale||"")};
    settings={...settings,shuffleOptions:Boolean(settings.shuffleOptions),allowMultiple:Boolean(settings.allowMultiple),points:Number(settings.points)||1,requiresTeacherReview,aiWarning:requiresTeacherReview?"Maze AI repaired this Multiple Choice exercise. Review its choices and answer key before publishing.":""};
  }
  if(type==="TRUE_FALSE"){const answer=value.correctAnswer??value.answer,requiresTeacherReview=answer===undefined||answer===null||answer===""||!String(value.statement||value.question||"").trim();content={statement:String(value.statement||value.question||"Review this statement"),correctAnswer:typeof answer==="string"?answer.trim().toLowerCase()==="true":Boolean(answer),explanation:String(value.explanation||value.rationale||"")};if(requiresTeacherReview)settings={...settings,requiresTeacherReview:true,aiWarning:"Maze AI repaired this True or False exercise. Review its statement and answer before publishing."}}
  if(type==="SHORT_ANSWER"){
    const suggested=String(value.suggestedAnswer??value.modelAnswer??value.answer??value.correctAnswer??"").trim();
    const accepted=strings(value.acceptedAnswers||value.correctAnswers);
    const answers=accepted.length?accepted:suggested?[suggested]:["Answer"],requiresTeacherReview=!String(value.question||value.prompt||"").trim()||!accepted.length&&!suggested;
    content={question:String(value.question||value.prompt||"Write your answer"),acceptedAnswers:answers,suggestedAnswer:suggested||answers[0],explanation:String(value.explanation||value.rationale||"")};
    if(requiresTeacherReview)settings={...settings,requiresTeacherReview:true,aiWarning:"Maze AI repaired this Short Answer exercise. Review its prompt and suggested answer before publishing."};
  }
  if(type==="FILL_BLANKS"){
    content=normalizeFillBlanks(value);
    if(content.requiresTeacherReview)settings={...settings,requiresTeacherReview:true,aiWarning:"Maze AI repaired this Fill in the Blanks exercise. Review its blank positions, answers and word bank before publishing."};
  }
  if(type==="MATCHING"){
    let requiresTeacherReview=false,pairs=(Array.isArray(value.pairs)?value.pairs:[]).map((pair,index)=>({id:pair?.id||id(),left:String(pair?.left||pair?.term||pair?.prompt||`Item ${index+1}`).trim(),right:String(pair?.right||pair?.match||pair?.definition||pair?.answer||`Match ${index+1}`).trim(),leftImageUrl:/^https?:\/\//i.test(String(pair?.leftImageUrl||pair?.leftImage||""))?String(pair.leftImageUrl||pair.leftImage):"",rightImageUrl:/^https?:\/\//i.test(String(pair?.rightImageUrl||pair?.rightImage||""))?String(pair.rightImageUrl||pair.rightImage):"",leftAlt:String(pair?.leftAlt||""),rightAlt:String(pair?.rightAlt||"")}));
    while(pairs.length<2){const index=pairs.length+1;pairs.push({id:id(),left:`Item ${index}`,right:`Match ${index}`});requiresTeacherReview=true}
    content={pairs,explanation:String(value.explanation||value.rationale||"")};if(requiresTeacherReview)settings={...settings,requiresTeacherReview:true,aiWarning:"Maze AI repaired this Matching exercise. Review its pairs before publishing."};
  }
  if(type==="CLASSIFICATION"){
    const classification=normalizeClassification(value,settings);content=classification.content;settings=classification.settings;
  }
  if(type==="ORDERING"){
    let requiresTeacherReview=false,items=(Array.isArray(value.items)?value.items:[]).map((item,index)=>typeof item==="string"?{id:id(),text:item.trim()}:{id:item?.id||id(),text:String(item?.text||item?.value||`Step ${index+1}`).trim(),imageUrl:/^https?:\/\//i.test(String(item?.imageUrl||item?.url||""))?String(item.imageUrl||item.url):"",alt:String(item?.alt||"")});
    while(items.length<2){items.push({id:id(),text:`Step ${items.length+1}`});requiresTeacherReview=true}
    content={prompt:String(value.prompt||value.question||"Put the items in the correct order"),items,explanation:String(value.explanation||value.rationale||"")};if(requiresTeacherReview)settings={...settings,requiresTeacherReview:true,aiWarning:"Maze AI repaired this Ordering exercise. Review the correct sequence before publishing."};
  }
  if(type==="CHECKLIST")content={title:String(value.title||"Checklist"),items:(value.items||[]).map(item=>typeof item==="string"?{id:id(),text:item}:{id:item.id||id(),text:String(item.text||"")})};
  if(type==="FLASHCARDS")content={title:String(value.title||"Review cards"),cards:(value.cards||[]).map(card=>({id:card.id||id(),front:String(card.front||card.term||""),back:String(card.back||card.definition||"")}))};
  if(type==="DIVIDER")content={};
  const media=object(value.media);
  if(type!=="IMAGE"&&(media.url||media.placeholderPrompt))content={...content,media:{url:/^https?:\/\//i.test(String(media.url||""))?String(media.url):"",objectKey:String(media.objectKey||""),alt:String(media.alt||""),caption:String(media.caption||""),position:media.position==="below"?"below":"above",placeholderPrompt:String(media.placeholderPrompt||"")}};
  validateGeneratedExercise(type,content);
  return{blockType:type,content,settings,layoutGroup:String(block.layoutGroup||""),column:Number(block.column)||0};
}

function ensureVisualBlocks(input,{hasReferenceFile=false,visualRequested=false}={}){
  const blocks=input.map(block=>({...block}));
  if(!hasReferenceFile&&!visualRequested)return blocks;
  const visualCue=/\b(image|photo|photograph|figure|diagram|illustration|chart|graph|map|screenshot|visual|imagen|foto(?:graf[ií]a)?|figura|diagrama|ilustraci[oó]n|gr[aá]fica|mapa|captura)\b/i;
  const readable=block=>String(block.content?.text||block.content?.question||block.content?.statement||block.content?.prompt||block.content?.caption||block.content?.title||"").trim();
  const insertAfter=[];
  blocks.forEach((block,index)=>{
    if(block.blockType==="IMAGE"||!visualCue.test(readable(block)))return;
    if(blocks[index-1]?.blockType==="IMAGE"||blocks[index+1]?.blockType==="IMAGE")return;
    insertAfter.push(index);
  });
  const targets=insertAfter.slice(0,4);
  if(!visualRequested&&!targets.length)return blocks;
  let offset=0;
  for(const target of targets){
    if(blocks.length>=20)break;
    const anchor=blocks[target+offset],context=readable(anchor).slice(0,180);
    blocks.splice(target+offset+1,0,normalizeGeneratedBlock({blockType:"IMAGE",content:{url:"",caption:"Reference visual",alt:"Visual from the reference material",placeholderPrompt:context?`Add the source image, diagram or figure related to: ${context}`:"Add the visual from the reference material in this position"},settings:{placeholder:true,requiresTeacherReview:true,aiWarning:"Maze AI reserved this position for a visual from the reference. Upload it or paste its URL before publishing."},layoutGroup:"",column:0}));
    offset+=1;
  }
  return blocks;
}

const GENERIC_TEXT=/^(?:item|match|step|answer|alternative|add content|correct answer|category|option)\s*\d*$/i;
function hasMeaningfulText(value){const text=String(value||"").trim();return Boolean(text)&&!GENERIC_TEXT.test(text)}
function isUsefulGeneratedBlock(block){
  const content=object(block.content);
  if(["HEADING","TEXT","CALLOUT","QUOTE"].includes(block.blockType))return hasMeaningfulText(content.text);
  if(block.blockType==="IMAGE")return Boolean(content.url||content.placeholderPrompt)&&!GENERIC_TEXT.test(String(content.placeholderPrompt||""));
  if(block.blockType==="TABLE")return(content.rows||[]).some(row=>(row.cells||row||[]).some(cell=>hasMeaningfulText(cell?.value??cell?.text??cell)));
  if(block.blockType==="MULTIPLE_CHOICE")return hasMeaningfulText(content.question)&&(content.options||[]).filter(option=>hasMeaningfulText(option.text)||option.imageUrl).length>=2;
  if(block.blockType==="TRUE_FALSE")return hasMeaningfulText(content.statement);
  if(block.blockType==="SHORT_ANSWER")return hasMeaningfulText(content.question)&&hasMeaningfulText(content.suggestedAnswer);
  if(block.blockType==="FILL_BLANKS")return hasMeaningfulText(content.text)&&content.text.includes("{{blank}}")&&(content.acceptedAnswers||[]).some(hasMeaningfulText);
  if(block.blockType==="MATCHING")return(content.pairs||[]).filter(pair=>(hasMeaningfulText(pair.left)||pair.leftImageUrl)&&(hasMeaningfulText(pair.right)||pair.rightImageUrl)).length>=2;
  if(block.blockType==="CLASSIFICATION")return(content.items||[]).some(item=>hasMeaningfulText(item.text)||item.imageUrl)&&(content.categories||[]).filter(category=>hasMeaningfulText(category.label)).length>=2;
  if(block.blockType==="ORDERING")return(content.items||[]).filter(item=>hasMeaningfulText(item.text)||item.imageUrl).length>=2;
  if(block.blockType==="CHECKLIST")return(content.items||[]).some(item=>hasMeaningfulText(item.text));
  if(block.blockType==="FLASHCARDS")return(content.cards||[]).some(card=>hasMeaningfulText(card.front)&&hasMeaningfulText(card.back));
  if(block.blockType==="EQUATION")return hasMeaningfulText(content.expression);
  return block.blockType==="DIVIDER";
}
function curateGeneratedBlocks(blocks,{maxBlocks=12}={}){
  const result=[];
  for(const block of blocks){if(!isUsefulGeneratedBlock(block))continue;const previous=result[result.length-1];if(previous&&previous.blockType===block.blockType&&JSON.stringify(previous.content)===JSON.stringify(block.content))continue;result.push(block);if(result.length>=maxBlocks)break}
  return result;
}

async function generate(userId,stepId,{prompt,language="English",level="All levels",file,useWebImages=false,fidelity="SOURCE"}){
  const step=await stepAccess(userId,stepId);
  const instruction=String(prompt||"").trim();
  if(!instruction&&!file)throw httpError("Add a prompt or reference file",400);
  const existing=(await pool.query("SELECT block_type,content,settings FROM step_blocks WHERE step_id=$1 ORDER BY position LIMIT 80",[stepId])).rows;
  const existingContext=JSON.stringify(existing).slice(0,50000);
  const preserveSource=String(fidelity||"SOURCE").toUpperCase()!=="ENRICH";
  let fileId=null;
  try{
    if(file){
      const form=new FormData();form.append("purpose","user_data");form.append("file",new Blob([file.buffer],{type:file.mimetype}),file.originalname);
      fileId=(await openai("/files",{method:"POST",body:form})).id;
    }
    const content=[{type:"input_text",text:`Create editable lesson blocks for the Step "${step.title}". Teacher request: ${instruction||"Improve the current lesson using the reference"}. Audience: ${level}. Output language: ${language}. Existing Step blocks are authoritative context; avoid repeating them and keep terminology consistent. Existing content: ${existingContext}. Build a natural sequence and include practice when requested. Never invent claims absent from the source. Choose exercise types by instructional intent: CLASSIFICATION whenever the learner must choose a type or category for EACH word, term, example or item (such as noun/verb/adjective); include categories and items where every item has its category label, and NEVER model this as MULTIPLE_CHOICE. FILL_BLANKS is for completing one or more missing words in sentences or expressions, including activities that provide one shared list of words for several gaps. It MUST use one {{blank}} marker and one acceptedAnswers entry per gap, plus a wordBank containing every correct answer and plausible distractors. Do not model a shared word-bank activity as separate MULTIPLE_CHOICE questions. SHORT_ANSWER is for a learner-produced response and MUST include suggestedAnswer and acceptedAnswers. MULTIPLE_CHOICE is only one shared question with at least three plausible alternatives and an explicitly correct option. MATCHING MUST contain at least two complete one-to-one pairs. CLASSIFICATION MUST give every item its correct category. ORDERING MUST list at least two items already in the correct order. TRUE_FALSE MUST contain an explicit correctAnswer. Every exercise, without exception, must contain a complete answer key grounded in the provided context, plausible alternatives where applicable, and a short explanation. Do not convert an open reflection into Fill in the Blanks. EQUATION uses LaTeX in a latex field. Encode each content object in contentJson and settings object in settingsJson. For every TABLE, contentJson must contain populated rows, for example {"rows":[[{"value":"Header","isHeader":true}],[{"value":"Data","isHeader":false}]]}; never return empty cells or a visual description of a table.`}];
    content.push({type:"input_text",text:(String(useWebImages)==="true"?"When a visual would improve the lesson, add an IMAGE block. Use a directly relevant public HTTPS image with sourceUrl when web search finds one; otherwise still add the IMAGE block with url='' and a precise placeholderPrompt telling the teacher what image belongs there. Never invent a URL.":"When the source document contains a visual or the lesson clearly needs one, add an IMAGE block. Use an exact source URL when available; otherwise use url='' and a precise placeholderPrompt so the teacher can upload or paste the image later.")+" VISUAL PLACEMENT IS REQUIRED: inspect the reference in reading order. For every photograph, figure, diagram, chart, map, screenshot or illustration, emit an IMAGE block at the same relative point between the surrounding content blocks. Never silently describe a source visual only as text. If the visual itself cannot be extracted or no trustworthy URL exists, still emit IMAGE with url='' and a precise placeholderPrompt describing that exact source visual and its location. For TEXT blocks, use settingsJson when visual hierarchy from the reference matters. Supported keys are fontSize (10-72), color, backgroundColor, fontFamily, fontWeight, textAlign, lineHeight, letterSpacing and maxWidth. Individual words may use richText safe runs. A richText run may also be an inline image node with type='image', url, alt and width; if no URL exists use an independent IMAGE placeholder instead. TABLE cells may include imageUrl and alt alongside value. Do not output HTML. Use two-column layouts for image plus explanation, comparisons, examples beside solutions, or parallel sections. Assign the same non-empty layoutGroup and column 1 or 2. Use layoutGroup='' and column=0 only for normal full-width blocks. Never place only one block in a layout group."});
    content.push({type:"input_text",text:"Images are valid inside every Block, not only standalone IMAGE Blocks. Use content.media={url,alt,caption,position} for a visual attached to any Heading, Text, Callout, Quote, Equation or exercise prompt. Exercise items may also be visual: MULTIPLE_CHOICE options support imageUrl and alt; MATCHING pairs support leftImageUrl,leftAlt,rightImageUrl,rightAlt; CLASSIFICATION and ORDERING items support imageUrl and alt. Preserve text when useful, but image-only items are allowed. When the reference activity matches pictures, never replace those pictures with generic labels such as Item 1 or Match 1."});
    content.push({type:"input_text",text:"QUALITY GATE: never emit generic filler such as Item 1, Match 1, Step 1, Answer, Alternative, Add content or Correct answer. Every generated prompt, option, pair and answer must be meaningful and grounded in the reference or teacher request. For FILL_BLANKS use the exact literal marker {{blank}} with no spaces or numbering. acceptedAnswers must contain exactly one correct answer per {{blank}}; wordBank contains the correct answers plus distractors and must not determine the number of blanks. Keep the sentence readable and never include escaped marker fragments in visible text."});
    content.push({type:"input_text",text:preserveSource?"SOURCE FIDELITY MODE: convert and organize only information, examples, exercises and visuals actually present in the reference or explicitly requested by the teacher. Do not enrich, expand, add practice, invent transitions or create extra sections. Prefer fewer complete Blocks over many small Blocks. Merge consecutive paragraphs that belong to the same idea. Preserve source reading order.":"ENRICHMENT MODE: you may add concise explanations and practice only when they directly support the teacher request. Keep the draft compact and grounded in the provided context."});
    if(fileId)content.push({type:"input_file",file_id:fileId});
    const request={model:process.env.OPENAI_CONTENT_MODEL||"gpt-4.1-mini",input:[{role:"user",content}],text:{format:{type:"json_schema",name:"lesson_blocks",strict:true,schema}}};
    if(String(useWebImages)==="true")request.tools=[{type:"web_search_preview",search_context_size:"medium"}];
    const response=await openai("/responses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)});
    const raw=response.output_text||response.output?.flatMap(item=>item.content||[]).find(item=>item.type==="output_text")?.text;
    if(!raw)throw httpError("The AI returned no lesson content",502);
    const draft=parseJsonPayload(raw,"AI lesson response",value=>Array.isArray(value?.blocks));
    draft.blocks=draft.blocks.filter(block=>TYPES.has(block.blockType)).map((block,index)=>{
      let content;
      try{content=parseJsonPayload(block.contentJson||{},`Content for Block ${index+1}`)}catch(error){
        if(["HEADING","TEXT","CALLOUT","QUOTE","EQUATION"].includes(block.blockType))content={text:String(block.contentJson||"")};else throw error;
      }
      const settings=parseJsonPayload(block.settingsJson||{},`Settings for Block ${index+1}`);
      return normalizeGeneratedBlock({blockType:block.blockType,content,settings,layoutGroup:block.layoutGroup,column:block.column});
    });
    draft.blocks=ensureVisualBlocks(draft.blocks,{hasReferenceFile:Boolean(file),visualRequested:String(useWebImages)==="true"||/\b(image|visual|diagram|figure|photo|imagen|diagrama|figura|foto)\b/i.test(instruction)});
    draft.blocks=curateGeneratedBlocks(draft.blocks,{maxBlocks:preserveSource?12:15});
    draft.stats={proposed:draft.blocks.length,mode:preserveSource?"SOURCE":"ENRICH",filtered:true};
    return draft;
  }finally{if(fileId)openai(`/files/${fileId}`,{method:"DELETE"}).catch(()=>{})}
}

async function apply(userId,stepId,blocks){
  await stepAccess(userId,stepId);
  if(!Array.isArray(blocks)||!blocks.length||blocks.length>20)throw httpError("Choose between 1 and 20 generated blocks",400);
  blocks=planAutomaticLayouts(blocks);
  const created=[],layouts=new Map(),groupColumns=new Map();
  for(const draft of blocks){if(draft.layoutGroup&&Number(draft.column)>0){if(!groupColumns.has(draft.layoutGroup))groupColumns.set(draft.layoutGroup,new Set());groupColumns.get(draft.layoutGroup).add(Number(draft.column))}}
  for(const draft of blocks){
    if(!TYPES.has(draft.blockType))throw httpError(`Unsupported generated Block: ${draft.blockType}`,400);
    const normalized=normalizeGeneratedBlock(draft);let parentBlockId=null;
    if(normalized.layoutGroup&&normalized.column>0&&groupColumns.get(normalized.layoutGroup)?.size>1){
      if(!layouts.has(normalized.layoutGroup)){const built=await blockService.createLayout(userId,stepId,{preset:"50_50"});layouts.set(normalized.layoutGroup,built);created.push(built.layout,...built.columns)}
      parentBlockId=layouts.get(normalized.layoutGroup).columns[Math.min(1,normalized.column-1)]?.id||null;
    }
    created.push(await blockService.createBlock(userId,stepId,{parentBlockId,blockType:normalized.blockType,content:normalized.content,settings:{...normalized.settings,generatedByAI:true}}));
  }
  return created;
}

function planAutomaticLayouts(input){
  const blocks=input.map(block=>({...block}));let sequence=0;
  for(let index=0;index<blocks.length;index+=1){const block=blocks[index];if(block.layoutGroup||block.blockType!=="IMAGE")continue;const next=blocks[index+1],after=blocks[index+2];if(!next||next.layoutGroup||!["HEADING","TEXT","CALLOUT","QUOTE","CHECKLIST"].includes(next.blockType))continue;const group=`auto-visual-${sequence++}`;block.layoutGroup=group;block.column=1;next.layoutGroup=group;next.column=2;if(next.blockType==="HEADING"&&after&&!after.layoutGroup&&["TEXT","CALLOUT","CHECKLIST"].includes(after.blockType)){after.layoutGroup=group;after.column=2;index+=1}}
  for(let index=0;index<blocks.length-3;index+=1){const slice=blocks.slice(index,index+4);if(slice.some(block=>block.layoutGroup)||slice.map(block=>block.blockType).join(",")!=="HEADING,TEXT,HEADING,TEXT")continue;const group=`auto-compare-${sequence++}`;slice.forEach((block,position)=>{block.layoutGroup=group;block.column=position<2?1:2});index+=3}
  for(let index=0;index<blocks.length-1;index+=1){const left=blocks[index],right=blocks[index+1];if(left.layoutGroup||right.layoutGroup||left.blockType!==right.blockType||!["CALLOUT","QUOTE","CHECKLIST"].includes(left.blockType))continue;const group=`auto-pair-${sequence++}`;left.layoutGroup=group;left.column=1;right.layoutGroup=group;right.column=2;index+=1}
  return blocks;
}

module.exports={generate,apply,openai,normalizeGeneratedBlock,normalizeTableContent,normalizeFillBlanks,normalizeClassification,validateGeneratedExercise,ensureVisualBlocks,isUsefulGeneratedBlock,curateGeneratedBlocks,planAutomaticLayouts};
