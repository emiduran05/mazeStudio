const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeTableContent, normalizeGeneratedBlock, ensureVisualBlocks, curateGeneratedBlocks, planAutomaticLayouts } = require("../src/services/aiContentService");

test("normalizes AI table headers and primitive rows for the Step editor", () => {
  const table = normalizeTableContent({ headers: ["Term", "Meaning"], rows: [["hola", "hello"]] }, { striped: true });
  assert.deepEqual(table.content.rows[0], [
    { value: "Term", isHeader: true, imageUrl:"", alt:"" }, { value: "Meaning", isHeader: true, imageUrl:"", alt:"" },
  ]);
  assert.equal(table.content.rows[1][1].value, "hello");
  assert.equal(table.settings.headerRow, true);
});

test("normalizes rows represented as cell objects or record objects", () => {
  const cellRows = normalizeTableContent({ rows: [{ cells: [{ text: "A" }, { content: "B" }] }] });
  assert.deepEqual(cellRows.content.rows[0].map(cell => cell.value), ["A", "B"]);
  const records = normalizeTableContent({ columns: ["Name", "Score"], data: [{ Name: "Ana", Score: 10 }] });
  assert.deepEqual(records.content.rows[1].map(cell => cell.value), ["Ana", "10"]);
});

test("repairs empty AI tables instead of losing the generated lesson", () => {
  const table=normalizeTableContent({ rows: [["", ""]] });
  assert.equal(table.settings.requiresTeacherReview,true);
  assert.equal(table.content.rows.length,2);
});

test("creates aligned Fill in the Blanks answers and suggested responses", () => {
  const fill = normalizeGeneratedBlock({ blockType:"FILL_BLANKS", content:{ sentence:"Water freezes at [[0°C]] and boils at [[100°C]]." }, settings:{} });
  assert.equal(fill.content.text, "Water freezes at {{blank}} and boils at {{blank}}.");
  assert.deepEqual(fill.content.acceptedAnswers, ["0°C", "100°C"]);
  assert.equal(fill.content.suggestedAnswer, "0°C / 100°C");
  const short = normalizeGeneratedBlock({ blockType:"SHORT_ANSWER", content:{ question:"Why?", modelAnswer:"Because temperature changes state." }, settings:{} });
  assert.deepEqual(short.content.acceptedAnswers, ["Because temperature changes state."]);
});

test("normalizes per-item categorization as Classification instead of multiple choice", () => {
  const block=normalizeGeneratedBlock({blockType:"CLASSIFICATION",content:{prompt:"Choose the word type",categories:["Noun","Verb"],items:[{word:"house",category:"Noun"},{word:"run",category:"Verb"}]},settings:{}});
  assert.equal(block.content.items.length,2);
  assert.equal(block.content.categories.find(category=>category.id===block.content.items[1].correctCategoryId).label,"Verb");
});

test("repairs incomplete AI classifications instead of rejecting the whole lesson", () => {
  const block=normalizeGeneratedBlock({blockType:"CLASSIFICATION",content:{prompt:"Classify",categories:[{id:"noun",label:"Noun"}],items:[{word:"house",categoryId:"noun"},{word:"run",category:"Verb"},{word:"quickly"}]},settings:{}});
  assert.ok(block.content.categories.length>=2);
  assert.equal(block.content.items.length,3);
  assert.ok(block.content.items.every(item=>block.content.categories.some(category=>category.id===item.correctCategoryId)));
  assert.equal(block.settings.requiresTeacherReview,true);
});

test("accepts sourced public web images and creates safe placeholders without URLs", () => {
  const image=normalizeGeneratedBlock({blockType:"IMAGE",content:{url:"https://images.example.org/map.png",sourceUrl:"https://example.org/maps",alt:"A labeled map"},settings:{}});
  assert.equal(image.content.sourceUrl,"https://example.org/maps");
  const placeholder=normalizeGeneratedBlock({blockType:"IMAGE",content:{url:"a nice map",imageDescription:"Map of trade routes"},settings:{}});
  assert.equal(placeholder.content.url,"");
  assert.equal(placeholder.content.placeholderPrompt,"Map of trade routes");
});

test("places image placeholders only next to actual visual references", () => {
  const contextual=ensureVisualBlocks([{blockType:"HEADING",content:{text:"The water cycle"},settings:{}},{blockType:"TEXT",content:{text:"Study the diagram and identify evaporation."},settings:{}}],{hasReferenceFile:true});
  assert.deepEqual(contextual.map(block=>block.blockType),["HEADING","TEXT","IMAGE"]);
  assert.match(contextual[2].content.placeholderPrompt,/diagram/i);
  const fallback=ensureVisualBlocks([{blockType:"HEADING",content:{text:"Introduction"},settings:{}},{blockType:"TEXT",content:{text:"Read the explanation."},settings:{}}],{hasReferenceFile:true});
  assert.equal(fallback.some(block=>block.blockType==="IMAGE"),false);
});

test("curates generic filler and duplicate AI blocks before teacher review",()=>{
  const curated=curateGeneratedBlocks([
    {blockType:"HEADING",content:{text:"Spanish articles"},settings:{}},
    {blockType:"MATCHING",content:{pairs:[{left:"Item 1",right:"Match 1"},{left:"Item 2",right:"Match 2"}]},settings:{}},
    {blockType:"TEXT",content:{text:"Articles agree with noun gender and number."},settings:{}},
    {blockType:"TEXT",content:{text:"Articles agree with noun gender and number."},settings:{}},
  ]);
  assert.deepEqual(curated.map(block=>block.blockType),["HEADING","TEXT"]);
});

test("preserves images inside exercise blocks and individual matching items", () => {
  const block=normalizeGeneratedBlock({blockType:"MATCHING",content:{media:{url:"https://example.org/prompt.png",position:"above"},pairs:[{left:"Dog",leftImageUrl:"https://example.org/dog.png",right:"Perro",rightImageUrl:"https://example.org/perro.png"},{left:"Cat",right:"Gato"}]},settings:{}});
  assert.equal(block.content.media.url,"https://example.org/prompt.png");
  assert.equal(block.content.pairs[0].leftImageUrl,"https://example.org/dog.png");
  assert.equal(block.content.pairs[0].rightImageUrl,"https://example.org/perro.png");
});

test("automatically places image and explanation into a real two-column group", () => {
  const planned=planAutomaticLayouts([{blockType:"IMAGE"},{blockType:"HEADING"},{blockType:"TEXT"},{blockType:"TABLE"}]);
  assert.equal(planned[0].column,1);
  assert.equal(planned[1].column,2);
  assert.equal(planned[2].layoutGroup,planned[0].layoutGroup);
  assert.equal(planned[3].layoutGroup,undefined);
});

test("automatically creates comparison layouts even without images",()=>{
  const planned=planAutomaticLayouts([{blockType:"HEADING"},{blockType:"TEXT"},{blockType:"HEADING"},{blockType:"TEXT"}]);
  assert.deepEqual(planned.map(block=>block.column),[1,1,2,2]);
  assert.equal(new Set(planned.map(block=>block.layoutGroup)).size,1);
});

test("preserves AI column placement metadata for layout construction", () => {
  const block=normalizeGeneratedBlock({blockType:"TEXT",content:{text:"Parallel explanation"},settings:{fontSize:20,color:"#334155"},layoutGroup:"comparison-1",column:2});
  assert.equal(block.layoutGroup,"comparison-1");
  assert.equal(block.column,2);
  assert.equal(block.settings.fontSize,20);
});

test("preserves safe inline formatting runs without accepting unsafe links", () => {
  const block=normalizeGeneratedBlock({blockType:"TEXT",content:{richText:[{text:"Important",color:"#dc2626",bold:true},{text:" reference",link:"javascript:alert(1)"}]},settings:{}});
  assert.equal(block.content.richText[0].color,"#dc2626");
  assert.equal(block.content.richText[0].bold,true);
  assert.equal(block.content.richText[1].link,"");
  assert.equal(block.content.text,"Important reference");
});

test("keeps Fill in the Blanks answer keys and adds distractors to its word bank", () => {
  const fill = normalizeGeneratedBlock({ blockType:"FILL_BLANKS", content:{ text:"Paris is the capital of {{blank}}.", acceptedAnswers:["France"], options:["Spain","France","Italy"] }, settings:{} });
  assert.deepEqual(fill.content.acceptedAnswers,["France"]);
  assert.deepEqual(fill.content.wordBank,["France","Spain","Italy"]);
});

test("repairs Fill in the Blanks when the AI forgets blank markers", () => {
  const fill=normalizeGeneratedBlock({blockType:"FILL_BLANKS",content:{text:"Paris is the capital of France.",acceptedAnswers:["France"],wordBank:["France","Italy"]},settings:{}});
  assert.equal(fill.content.text,"Paris is the capital of {{blank}}.");
  assert.deepEqual(fill.content.acceptedAnswers,["France"]);
  const fallback=normalizeGeneratedBlock({blockType:"FILL_BLANKS",content:{text:"Complete this sentence",answer:"example"},settings:{}});
  assert.match(fallback.content.text,/\{\{blank\}\}/);
  assert.equal(fallback.settings.requiresTeacherReview,true);
});

test("canonicalizes malformed blank markers without turning word-bank options into extra inputs", () => {
  const fill=normalizeGeneratedBlock({blockType:"FILL_BLANKS",content:{text:"Completa con {{ blank_1 }} el artículo correcto ({{BLANK 2}}).",acceptedAnswers:["el","la","los","las","un","una","unos","unas"],wordBank:["el","la","los","las","un","una","unos","unas"]},settings:{}});
  assert.equal((fill.content.text.match(/\{\{blank\}\}/g)||[]).length,2);
  assert.equal(fill.content.acceptedAnswers.length,2);
  assert.equal(fill.content.wordBank.length,8);
});

test("repairs every incomplete AI exercise instead of rejecting the lesson", () => {
  const choice=normalizeGeneratedBlock({blockType:"MULTIPLE_CHOICE",content:{question:"Capital?",options:["Paris","Rome"]},settings:{}});
  assert.equal(choice.settings.requiresTeacherReview,true);
  assert.ok(choice.content.options.some(option=>option.isCorrect));
  const short=normalizeGeneratedBlock({blockType:"SHORT_ANSWER",content:{question:"Explain it"},settings:{}});
  assert.equal(short.settings.requiresTeacherReview,true);
  assert.ok(short.content.acceptedAnswers.length);
  assert.equal(normalizeGeneratedBlock({blockType:"TRUE_FALSE",content:{},settings:{}}).settings.requiresTeacherReview,true);
  assert.equal(normalizeGeneratedBlock({blockType:"MATCHING",content:{pairs:[]},settings:{}}).content.pairs.length,2);
  assert.equal(normalizeGeneratedBlock({blockType:"ORDERING",content:{items:[]},settings:{}}).content.items.length,2);
  const repaired=normalizeGeneratedBlock({blockType:"FILL_BLANKS",content:{text:"Capital: {{blank}}",acceptedAnswers:["Paris"]},settings:{}});
  assert.equal(repaired.settings.requiresTeacherReview,true);
});
