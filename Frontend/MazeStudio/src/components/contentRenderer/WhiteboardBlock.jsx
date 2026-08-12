import { useEffect, useRef, useState } from "react";
import "./WhiteboardBlock.css";

const palette = ["#111827", "#4f46e5", "#dc2626", "#059669", "#f59e0b"];

export default function WhiteboardBlock({ block, readOnly = false }) {
  const canvasRef = useRef(null);
  const activeStrokeRef = useRef(null);
  const storageKey = `maze-step-whiteboard:${block.id}`;
  const [strokes, setStrokes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  });
  const [color, setColor] = useState(palette[0]);
  const [width, setWidth] = useState(4);
  const height = Math.min(900, Math.max(240, Number(block.settings?.height) || 420));

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(strokes)); }
    catch (error) { console.warn("Whiteboard could not be saved locally", error); }
  }, [strokes, storageKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const context = canvas.getContext("2d");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.lineCap = "round"; context.lineJoin = "round";
      for (const stroke of strokes) {
        if (!stroke.points?.length) continue;
        context.beginPath(); context.strokeStyle = stroke.color; context.lineWidth = stroke.width;
        stroke.points.forEach((point, index) => index
          ? context.lineTo(point.x * rect.width, point.y * rect.height)
          : context.moveTo(point.x * rect.width, point.y * rect.height));
        if (stroke.points.length === 1) context.lineTo(stroke.points[0].x * rect.width + .1, stroke.points[0].y * rect.height + .1);
        context.stroke();
      }
    };
    render();
    const observer = new ResizeObserver(render); observer.observe(canvas);
    return () => observer.disconnect();
  }, [strokes, height]);

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };
  function down(event) {
    if (readOnly) return;
    event.preventDefault();
    const stroke = { id: crypto.randomUUID(), color, width, points: [point(event)] };
    activeStrokeRef.current = stroke;
    setStrokes((current) => [...current, stroke]);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function move(event) {
    const active = activeStrokeRef.current;
    if (!active) return;
    event.preventDefault();
    const nextStroke = { ...active, points: [...active.points, point(event)] };
    activeStrokeRef.current = nextStroke;
    setStrokes((current) => current.map((stroke) => stroke.id === nextStroke.id ? nextStroke : stroke));
  }
  function up(event) {
    activeStrokeRef.current = null;
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <div className={`step_whiteboard background_${String(block.settings?.background || "GRID").toLowerCase()}`}>
    <header><div><strong>{block.content?.title || "Whiteboard"}</strong>{block.content?.prompt && <p>{block.content.prompt}</p>}</div>
      {!readOnly && <nav>{palette.map((item) => <button type="button" aria-label={`Use color ${item}`} className={color === item ? "active" : ""} style={{ "--color": item }} onClick={() => setColor(item)} key={item}/>)}
        <select value={width} onChange={(event) => setWidth(Number(event.target.value))}><option value="2">Thin</option><option value="4">Medium</option><option value="8">Thick</option></select>
        {block.settings?.allowLearnerClear !== false && <button type="button" className="clear" onClick={() => setStrokes([])}><i className="fa-solid fa-trash"/> Clear</button>}
      </nav>}
    </header>
    <canvas aria-label="Interactive whiteboard" style={{ height }} ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(event) => { if (event.buttons === 0) up(event); }}/>
  </div>;
}
