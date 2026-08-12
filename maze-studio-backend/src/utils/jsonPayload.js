function stripFence(value) {
  return String(value || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
function balancedCandidates(text) {
  const results=[];
  for(let start=0;start<text.length;start+=1){
    if(text[start]!=="{"&&text[start]!=="[")continue;
    const stack=[];let quoted=false,escaped=false;
    for(let index=start;index<text.length;index+=1){
      const char=text[index];
      if(quoted){if(escaped)escaped=false;else if(char==="\\")escaped=true;else if(char==='"')quoted=false;continue}
      if(char==='"'){quoted=true;continue}
      if(char==="{"||char==="[")stack.push(char);
      else if(char==="}"||char==="]"){
        const opening=stack.pop();
        if((opening==="{"&&char!=="}")||(opening==="["&&char!=="]"))break;
        if(!stack.length){results.push(text.slice(start,index+1));break}
      }
    }
  }
  return results;
}
function parseJsonPayload(value,label="AI response",predicate=()=>true){
  if(value&&typeof value==="object")return value;
  const text=stripFence(value);
  for(const candidate of [text,...balancedCandidates(text)]){
    try{const parsed=JSON.parse(candidate);if(predicate(parsed))return parsed}catch(_){/* try next candidate */}
  }
  const error=new Error(`${label} was not valid JSON. Please generate it again.`);error.statusCode=502;throw error;
}
module.exports={parseJsonPayload};
