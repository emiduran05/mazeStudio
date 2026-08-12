import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../../../api/api";
import CanvasLab from "./CanvasLab";
import { createCanvasDocument } from "./mazeCanvasDocument";

export default function StepCanvasEditor() {
  const { stepId, blockId } = useParams();
  const navigate = useNavigate();
  const [block, setBlock] = useState(null);
  const [error, setError] = useState("");
  const blockRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiRequest(`/steps/${stepId}/blocks`)
      .then((data) => {
        const blocks = Array.isArray(data) ? data : data.blocks || [];
        const found = blocks.find(
          (item) => item.id === blockId && item.block_type === "CANVAS"
        );
        if (!found) throw new Error("No se encontró esta presentación en el Step.");
        if (active) {
          blockRef.current = found;
          setBlock(found);
        }
      })
      .catch((reason) => {
        if (active) setError(reason.message || "No se pudo abrir la presentación.");
      });
    return () => { active = false; };
  }, [blockId, stepId]);

  const save = useCallback(async (document) => {
    const current = blockRef.current;
    const content = { ...(current?.content || {}), document };
    const data = await apiRequest(`/blocks/${blockId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    const updated = data?.block || { ...current, content };
    blockRef.current = updated;
    setBlock(updated);
  }, [blockId]);

  if (error) return <main className="canvas_route_state"><i className="fa-solid fa-triangle-exclamation"/><h1>No se pudo abrir Canvas</h1><p>{error}</p><button onClick={() => navigate(`/studio/step/${stepId}`)}>Volver al Step</button></main>;
  if (!block) return <main className="canvas_route_state"><i className="fa-solid fa-spinner fa-spin"/><h1>Preparando Canvas…</h1></main>;
  return <CanvasLab bare blockId={blockId} initialDocument={block?.content?.document || createCanvasDocument()} onSave={save} onExit={() => navigate(`/studio/step/${stepId}`)}/>;
}
