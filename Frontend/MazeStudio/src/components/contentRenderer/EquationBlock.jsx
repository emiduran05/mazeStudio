import "./EquationBlock.css";

const SYMBOLS = { "\\times":"×", "\\div":"÷", "\\pm":"±", "\\cdot":"·", "\\le":"≤", "\\ge":"≥", "\\ne":"≠", "\\approx":"≈", "\\pi":"π", "\\theta":"θ", "\\alpha":"α", "\\beta":"β", "\\infty":"∞" };

function group(source, start) {
  if (source[start] !== "{") return { value: source[start] || "", end: start + 1 };
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return { value: source.slice(start + 1, index), end: index + 1 };
  }
  return { value: source.slice(start + 1), end: source.length };
}

export function MathExpression({ expression = "" }) {
  const nodes = []; let index = 0; let pending = "";
  const flush = () => { if (pending) { nodes.push(pending); pending = ""; } };
  while (index < expression.length) {
    if (expression.startsWith("\\frac", index)) {
      flush(); const top = group(expression, index + 5); const bottom = group(expression, top.end);
      nodes.push(<span className="math_fraction" key={index}><span><MathExpression expression={top.value}/></span><span><MathExpression expression={bottom.value}/></span></span>); index = bottom.end; continue;
    }
    if (expression.startsWith("\\sqrt", index)) {
      flush(); const value = group(expression, index + 5);
      nodes.push(<span className="math_root" key={index}><span>√</span><span><MathExpression expression={value.value}/></span></span>); index = value.end; continue;
    }
    if (expression[index] === "^" || expression[index] === "_") {
      flush(); const Tag = expression[index] === "^" ? "sup" : "sub"; const value = group(expression, index + 1);
      nodes.push(<Tag key={index}><MathExpression expression={value.value}/></Tag>); index = value.end; continue;
    }
    if (expression[index] === "\\") {
      const token = expression.slice(index).match(/^\\[a-zA-Z]+/)?.[0];
      if (token && SYMBOLS[token]) { pending += SYMBOLS[token]; index += token.length; continue; }
    }
    if (expression[index] === "{" || expression[index] === "}") { index += 1; continue; }
    pending += expression[index]; index += 1;
  }
  flush(); return <>{nodes}</>;
}

export default function EquationBlock({ block }) {
  const expression = block.content?.expression || "Add an equation";
  return <figure className={`equation_block align_${block.settings?.align || "center"}`}>
    <div role="math" aria-label={expression}><MathExpression expression={expression}/></div>
    {block.content?.caption && <figcaption>{block.content.caption}</figcaption>}
  </figure>;
}
