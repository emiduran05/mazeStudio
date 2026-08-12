import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import MazeCanvasStage from "./MazeCanvasStage";
import { CANVAS_HEIGHT, CANVAS_WIDTH, createCanvasDocument, elementFactories, normalizeCanvasDocument, templates } from "./mazeCanvasDocument";
import { uploadCanvasAsset } from "../../../../api/blockAssetApi";
import "./CanvasLab.css";
import "./CanvasExtensions.css";
import "./CanvasMobile.css";
import "./CanvasPageActions.css";
import "./CanvasAssetSource.css";
import "./CanvasCustomization.css";

const STORAGE_KEY = "maze-studio:canvas-lab:v1";
const clone = value => JSON.parse(JSON.stringify(value));

function readInitialDocument(storageKey = STORAGE_KEY) {
  try { return normalizeCanvasDocument(JSON.parse(localStorage.getItem(storageKey))); }
  catch { return createCanvasDocument(); }
}

export default function CanvasLab({ initialDocument = null, storageKey = STORAGE_KEY, onSave = null, onExit = null, blockId = null, bare = false }) {
  const [document, setDocument] = useState(() => initialDocument ? normalizeCanvasDocument(initialDocument) : readInitialDocument(storageKey));
  const [pageId, setPageId] = useState(() => document.pages[0].id);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(0.66);
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [activePanel, setActivePanel] = useState("elements");
  const [mobilePanelOpen,setMobilePanelOpen]=useState(false);
  const [history, setHistory] = useState(() => [clone(document)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const clipboard = useRef(null);
  const saveTimer = useRef(null);
  const page = document.pages.find(item => item.id === pageId) || document.pages[0];
  const selected = page?.elements.find(item => item.id === selectedId) || null;

  useEffect(()=>{const fit=()=>{if(window.innerWidth<=900)setZoom(Math.max(.2,Math.min(.55,(window.innerWidth-32)/CANVAS_WIDTH)))};fit();window.addEventListener("resize",fit);return()=>window.removeEventListener("resize",fit)},[]);

  const commit = useCallback((nextOrUpdater) => {
    setDocument(current => {
      const next = typeof nextOrUpdater === "function" ? nextOrUpdater(current) : nextOrUpdater;
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      setHistory(previous => [...previous.slice(0, historyIndex + 1), clone(stamped)].slice(-60));
      setHistoryIndex(index => Math.min(index + 1, 59));
      setSaveStatus("unsaved");
      return stamped;
    });
  }, [historyIndex]);

  useEffect(() => {
    if (saveStatus !== "unsaved") return undefined;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        if (onSave) await onSave(document);
        else localStorage.setItem(storageKey, JSON.stringify(document));
        setSaveStatus("saved");
      }
      catch { setSaveStatus("failed"); }
    }, 550);
    return () => clearTimeout(saveTimer.current);
  }, [document, onSave, saveStatus, storageKey]);

  const updatePage = useCallback((updater) => commit(current => ({ ...current, pages: current.pages.map(item => item.id === pageId ? updater(item) : item) })), [commit, pageId]);
  const updateElement = useCallback((id, patch) => updatePage(current => ({ ...current, elements: current.elements.map(item => item.id === id ? { ...item, ...patch } : item) })), [updatePage]);

  const addElement = type => {
    const factory = elementFactories[type]; if (!factory) return;
    const element = factory();
    updatePage(current => ({ ...current, elements: [...current.elements, element] }));
    setSelectedId(element.id); setActivePanel("inspector"); setMobilePanelOpen(true);
  };
  const addPage = template => {
    const next = template.create(); commit(current => ({ ...current, pages: [...current.pages, next] })); setPageId(next.id); setSelectedId(null);
  };
  const duplicatePage = () => {
    const next = { ...clone(page), id: `${page.id}_copy_${Date.now().toString(36)}`, name: `${page.name} copia`, elements: page.elements.map(item => ({ ...item, id: `${item.id}_copy_${Math.random().toString(36).slice(2, 7)}` })) };
    commit(current => ({ ...current, pages: [...current.pages, next] })); setPageId(next.id);
  };
  const removePageById = (targetId) => {
    if (document.pages.length === 1) return;
    const target=document.pages.find(item=>item.id===targetId);
    if(!window.confirm(`¿Eliminar “${target?.name||"esta página"}”?`))return;
    const index = document.pages.findIndex(item => item.id === targetId); const remaining = document.pages.filter(item => item.id !== targetId);
    commit(current => ({ ...current, pages: current.pages.filter(item=>item.id!==targetId) })); if(targetId===pageId)setPageId(remaining[Math.max(0, index - 1)].id); setSelectedId(null);
  };
  const removePage=()=>removePageById(pageId);
  const movePage = direction => {
    const index = document.pages.findIndex(item => item.id === pageId); const target = index + direction;
    if (target < 0 || target >= document.pages.length) return;
    commit(current => { const pages = [...current.pages]; [pages[index], pages[target]] = [pages[target], pages[index]]; return { ...current, pages }; });
  };
  const removeSelected = useCallback(() => { if (!selectedId) return; updatePage(current => ({ ...current, elements: current.elements.filter(item => item.id !== selectedId) })); setSelectedId(null); }, [selectedId, updatePage]);
  const duplicateSelected = useCallback(() => {
    if (!selected) return; const next = { ...clone(selected), id: `${selected.id}_copy_${Date.now().toString(36)}`, x: selected.x + 28, y: selected.y + 28 };
    updatePage(current => ({ ...current, elements: [...current.elements, next] })); setSelectedId(next.id);
  }, [selected, updatePage]);
  const changeLayer = direction => {
    if (!selectedId) return;
    updatePage(current => { const elements = [...current.elements]; const index = elements.findIndex(item => item.id === selectedId); const target = direction === "front" ? elements.length - 1 : direction === "back" ? 0 : index + (direction === "forward" ? 1 : -1); if (index < 0 || target < 0 || target >= elements.length) return current; const [item] = elements.splice(index, 1); elements.splice(target, 0, item); return { ...current, elements }; });
  };
  const undo = useCallback(() => { if (historyIndex <= 0) return; const nextIndex = historyIndex - 1; setHistoryIndex(nextIndex); setDocument(clone(history[nextIndex])); setSaveStatus("unsaved"); setSelectedId(null); }, [history, historyIndex]);
  const redo = useCallback(() => { if (historyIndex >= history.length - 1) return; const nextIndex = historyIndex + 1; setHistoryIndex(nextIndex); setDocument(clone(history[nextIndex])); setSaveStatus("unsaved"); setSelectedId(null); }, [history, historyIndex]);

  useEffect(() => {
    const onKeyDown = event => {
      const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(window.document.activeElement?.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      if (editing) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) { event.preventDefault(); removeSelected(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateSelected(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selected) clipboard.current = clone(selected);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && clipboard.current) { event.preventDefault(); const next = { ...clone(clipboard.current), id: `${clipboard.current.id}_paste_${Date.now().toString(36)}`, x: clipboard.current.x + 32, y: clipboard.current.y + 32 }; updatePage(current => ({ ...current, elements: [...current.elements, next] })); setSelectedId(next.id); }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && selected) { event.preventDefault(); const distance = event.shiftKey ? 10 : 1; updateElement(selected.id, { x: selected.x + (event.key === "ArrowLeft" ? -distance : event.key === "ArrowRight" ? distance : 0), y: selected.y + (event.key === "ArrowUp" ? -distance : event.key === "ArrowDown" ? distance : 0) }); }
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [duplicateSelected, redo, removeSelected, selected, selectedId, undo, updateElement, updatePage]);

  const statusLabel = { saved: "Guardado", saving: "Guardando…", unsaved: "Sin guardar", failed: "Error al guardar" }[saveStatus];
  const scale = useMemo(() => Math.max(0.3, Math.min(1, zoom)), [zoom]);

  const content = <main className={`canvas_lab ${preview ? "is_preview" : ""} ${bare ? "is_embedded" : ""}`}>
    <header className="canvas_lab_header">
      <div><span className="canvas_eyebrow">MAZE CANVAS · LAB</span><input aria-label="Nombre de la presentación" value={document.title} onChange={event => commit(current => ({ ...current, title: event.target.value }))}/><small className={`canvas_save_status ${saveStatus}`}>{statusLabel} en este dispositivo</small></div>
      <div className="canvas_header_actions">{onExit&&<button onClick={onExit}><i className="fa-solid fa-arrow-left"/> Volver al step</button>}<button onClick={undo} disabled={historyIndex <= 0} title="Deshacer (Ctrl+Z)"><i className="fa-solid fa-rotate-left"/></button><button onClick={redo} disabled={historyIndex >= history.length - 1} title="Rehacer (Ctrl+Y)"><i className="fa-solid fa-rotate-right"/></button><button className={preview ? "active" : ""} onClick={() => { setPreview(value => !value); setSelectedId(null); }}><i className="fa-solid fa-play"/> {preview ? "Editar" : "Presentar"}</button></div>
    </header>
    <div className="canvas_lab_workspace">
      {!preview && <aside className="canvas_pages_panel"><div className="canvas_panel_title"><strong>Páginas</strong><button onClick={() => addPage(templates[0])} title="Nueva página"><i className="fa-solid fa-plus"/></button></div><div className="canvas_pages_list">{document.pages.map((item, index) => <div key={item.id} className={`canvas_page_item ${item.id === pageId ? "active" : ""}`}><button className="canvas_page_select" onClick={() => { setPageId(item.id); setSelectedId(null); setMobilePanelOpen(false); }}><span>{index + 1}</span><div style={{ background: item.background }}><strong>{item.name}</strong><small>{item.elements.length} elementos</small></div></button><button type="button" className="canvas_page_quick_delete" disabled={document.pages.length===1} onClick={()=>removePageById(item.id)} aria-label={`Eliminar ${item.name}`} title="Eliminar página"><i className="fa-solid fa-trash-can"/></button></div>)}</div><div className="canvas_page_actions"><button onClick={() => movePage(-1)} title="Mover arriba"><i className="fa-solid fa-arrow-up"/></button><button onClick={() => movePage(1)} title="Mover abajo"><i className="fa-solid fa-arrow-down"/></button><button onClick={duplicatePage} title="Duplicar"><i className="fa-regular fa-copy"/></button><button onClick={removePage} disabled={document.pages.length === 1} title="Eliminar"><i className="fa-regular fa-trash-can"/></button></div></aside>}
      <section className="canvas_center"><div className="canvas_toolbar">{!preview && <><button onClick={() => {setActivePanel("elements");setSelectedId(null);setMobilePanelOpen(true)}} className={activePanel === "elements"&&!selected ? "active" : ""}><i className="fa-solid fa-shapes"/> Elementos</button><button onClick={() => {setActivePanel("templates");setMobilePanelOpen(true)}} className={activePanel === "templates" ? "active" : ""}><i className="fa-solid fa-wand-magic-sparkles"/> Plantillas</button>{selected && <><button className="canvas_mobile_properties" onClick={()=>setMobilePanelOpen(true)}><i className="fa-solid fa-sliders"/> Propiedades</button><span className="canvas_toolbar_divider"/><button onClick={duplicateSelected}><i className="fa-regular fa-copy"/> Duplicar</button><button onClick={() => changeLayer("forward")} title="Traer adelante"><i className="fa-solid fa-up-long"/></button><button onClick={() => changeLayer("backward")} title="Enviar atrás"><i className="fa-solid fa-down-long"/></button><button className="danger" onClick={removeSelected}><i className="fa-regular fa-trash-can"/></button></>}</>}<label className="canvas_zoom"><i className="fa-solid fa-magnifying-glass"/><input type="range" min="0.2" max="1" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))}/><span>{Math.round(zoom * 100)}%</span></label></div><div className="canvas_stage_scroll"><div className="canvas_stage_shell" style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}><MazeCanvasStage page={page} scale={scale} selectedId={selectedId} onSelect={id=>{setSelectedId(id);if(id){setActivePanel("inspector");setMobilePanelOpen(true)}}} onElementChange={updateElement} preview={preview}/></div></div></section>
      {!preview && <aside className={`canvas_right_panel ${mobilePanelOpen?"mobile_open":""}`}><button type="button" className="canvas_mobile_panel_close" onClick={()=>setMobilePanelOpen(false)}><span>{selected?"Propiedades":"Herramientas"}</span><i className="fa-solid fa-chevron-down"/></button>{activePanel === "templates" ? <TemplatePanel onAdd={addPage}/> : selected ? <Inspector element={selected} onChange={patch => updateElement(selected.id, patch)} onLayer={changeLayer} blockId={blockId}/> : <><ElementsPanel onAdd={addElement} page={page} onPageChange={patch=>updatePage(current=>({...current,...patch}))}/><PageAppearance page={page} onChange={patch=>updatePage(current=>({...current,...patch}))}/></>}</aside>}
    </div>
  </main>;
  return bare ? content : <StudioLayout>{content}</StudioLayout>;
}

function ElementsPanel({ onAdd, page, onPageChange }) {
  const groups = [{ name: "Contenido", items: [["TEXT", "fa-font", "Texto"], ["IMAGE", "fa-image", "Imagen"], ["VIDEO_EMBED", "fa-circle-play", "Video"], ["FILE_LINK", "fa-paperclip", "Archivo"]] }, { name: "Visual", items: [["SHAPE", "fa-shapes", "Forma"], ["LINE", "fa-minus", "Línea"]] }, { name: "Clase", items: [["TABLE", "fa-table-cells", "Tabla"], ["CODE", "fa-code", "Código"]] }];
  return <div className="canvas_side_content"><h2>Agrega lo que necesitas</h2><p>Elige un elemento y personalízalo. Nada reemplaza tus bloques actuales.</p>{groups.map(group => <section key={group.name}><h3>{group.name}</h3><div className="canvas_element_grid">{group.items.map(([type, icon, label]) => <button key={type} onClick={() => onAdd(type)}><i className={`fa-solid ${icon}`}/><span>{label}</span></button>)}</div></section>)}<section className="canvas_page_settings"><h3>Esta página</h3><label>Nombre<input value={page.name||""} onChange={event=>onPageChange({name:event.target.value})}/></label><label>Fondo<input type="color" value={page.background||"#ffffff"} onChange={event=>onPageChange({background:event.target.value})}/></label><label>Notas para el profesor<textarea value={page.notes||""} onChange={event=>onPageChange({notes:event.target.value})} placeholder="Recordatorios que no verá el alumno…"/></label></section></div>;
}

function TemplatePanel({ onAdd }) { return <div className="canvas_side_content"><h2>Nueva página</h2><p>Comienza con una estructura clara y reemplaza el contenido.</p><div className="canvas_template_list">{templates.map(template => <button key={template.id} onClick={() => onAdd(template)}><i className={`fa-solid ${template.icon}`}/><span><strong>{template.name}</strong><small>Agregar como página nueva</small></span></button>)}</div></div>; }

function Inspector({ element, onChange, onLayer, blockId }) {
  const [uploading,setUploading]=useState(false);
  const [uploadError,setUploadError]=useState("");
  const [showImageUrl,setShowImageUrl]=useState(()=>Boolean(element.src&&!element.objectKey));
  async function handleUpload(event){const file=event.target.files?.[0];if(!file||!blockId)return;setUploading(true);setUploadError("");try{let naturalSize={};if(element.type==="IMAGE")naturalSize=await new Promise(resolve=>{const image=new Image();const localUrl=URL.createObjectURL(file);image.onload=()=>{const ratio=image.naturalWidth/image.naturalHeight;const width=Math.min(720,image.naturalWidth);resolve({width:Math.round(width),height:Math.round(width/ratio),naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight});URL.revokeObjectURL(localUrl)};image.onerror=()=>{resolve({});URL.revokeObjectURL(localUrl)};image.src=localUrl});const data=await uploadCanvasAsset(blockId,file);onChange({src:data.asset.url,url:data.asset.url,objectKey:data.asset.objectKey,name:data.asset.name,mimeType:data.asset.mimeType,size:data.asset.size,title:element.type==="VIDEO_EMBED"?(element.title||data.asset.name):element.title,...naturalSize});}catch(error){setUploadError(error.message||"No se pudo subir el archivo.")}finally{setUploading(false);event.target.value=""}}
  const updateRows = text => onChange({ rows: text.split("\n").map(row => row.split("|").map(cell => cell.trim())) });
  return <div className="canvas_side_content canvas_inspector"><div className="canvas_inspector_heading"><div><span>Elemento seleccionado</span><h2>{element.type.replace("_", " ")}</h2></div><i className="fa-solid fa-sliders"/></div>
    {element.type === "TEXT" && <TextAdvanced element={element} onChange={onChange}/>} 
    {element.type === "IMAGE" && <><div className="canvas_asset_source"><div><i className={`fa-solid ${element.objectKey?"fa-cloud-arrow-up":"fa-link"}`}/><span><strong>{element.objectKey?"Imagen subida":"Imagen mediante enlace"}</strong><small>{element.objectKey?(element.name||"Archivo guardado en Maze Studio"):(element.src?"Enlace externo configurado":"Todavía no hay una imagen")}</small></span></div>{element.objectKey&&<button type="button">Guardada</button>}</div><label>{element.objectKey?"Reemplazar imagen":"Subir imagen"}{blockId?<input type="file" accept="image/*" onChange={handleUpload} disabled={uploading}/>:<small>Disponible dentro de un Step</small>}</label>{!element.objectKey&&<button type="button" className="canvas_toggle_url" onClick={()=>setShowImageUrl(value=>!value)}><i className="fa-solid fa-link"/> {showImageUrl?"Ocultar enlace":"Usar imagen desde un enlace"}</button>}{showImageUrl&&!element.objectKey&&<label>Enlace de la imagen<input value={element.src} onChange={event => onChange({ src: event.target.value, url:event.target.value })} placeholder="https://..."/></label>}<label>Texto alternativo<input value={element.alt} onChange={event => onChange({ alt: event.target.value })}/></label></>}
    {element.type === "SHAPE" && <><div className="canvas_field_row"><label>Relleno<input type="color" value={element.fill} onChange={event => onChange({ fill: event.target.value })}/></label><label>Borde<input type="color" value={element.stroke} onChange={event => onChange({ stroke: event.target.value })}/></label></div><label>Forma<select value={element.shape} onChange={event => onChange({ shape: event.target.value })}><option value="rect">Rectángulo</option><option value="ellipse">Círculo / óvalo</option></select></label></>}
    {element.type === "LINE" && <div className="canvas_field_row"><label>Color<input type="color" value={element.stroke} onChange={event => onChange({ stroke: event.target.value })}/></label><label>Grosor<input type="number" min="1" max="30" value={element.strokeWidth} onChange={event => onChange({ strokeWidth: Number(event.target.value) })}/></label></div>}
    {element.type === "CODE" && <><label>Código<textarea className="code" value={element.code} onChange={event => onChange({ code: event.target.value })}/></label><label>Lenguaje<input value={element.language} onChange={event => onChange({ language: event.target.value })}/></label></>}
    {element.type === "VIDEO_EMBED" && <><label>Subir video{blockId?<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleUpload} disabled={uploading}/>:<small>Disponible dentro de un Step</small>}</label><label>Título<input value={element.title} onChange={event => onChange({ title: event.target.value })}/></label><label>O usa una URL<input value={element.url} onChange={event => onChange({ url: event.target.value })}/></label></>}
    {uploading&&<p className="canvas_hint"><i className="fa-solid fa-spinner fa-spin"/> Subiendo archivo…</p>}{uploadError&&<p className="canvas_upload_error">{uploadError}</p>}
    {element.type === "FILE_LINK" && <><label>Etiqueta<input value={element.label} onChange={event => onChange({ label: event.target.value })}/></label><label>URL del archivo<input value={element.url} onChange={event => onChange({ url: event.target.value })}/></label></>}
    {element.type === "TABLE" && <label>Contenido <small>(una fila por línea, separa columnas con |)</small><textarea value={(element.rows || []).map(row => row.join(" | ")).join("\n")} onChange={event => updateRows(event.target.value)}/></label>}
    <section><h3>Posición y tamaño</h3><div className="canvas_field_grid">{["x", "y", "width", "height", "rotation"].map(field => <label key={field}>{field}<input type="number" value={Math.round(element[field] || 0)} onChange={event => onChange({ [field]: Number(event.target.value) })}/></label>)}</div></section><section><h3>Capas</h3><div className="canvas_layer_actions"><button onClick={() => onLayer("front")}>Al frente</button><button onClick={() => onLayer("back")}>Al fondo</button></div></section>
  </div>;
}

function PageAppearance({page,onChange}){return <section className="canvas_page_appearance"><h3>Diseño de la página</h3><label>Fondo<select value={page.backgroundType||"solid"} onChange={event=>onChange({backgroundType:event.target.value})}><option value="solid">Color sólido</option><option value="gradient">Degradado</option></select></label><div className="canvas_field_row"><label>Color inicial<input type="color" value={page.background||"#ffffff"} onChange={event=>onChange({background:event.target.value})}/></label>{page.backgroundType==="gradient"&&<label>Color final<input type="color" value={page.backgroundColor2||"#e7e7ff"} onChange={event=>onChange({backgroundColor2:event.target.value})}/></label>}</div><div className="canvas_background_presets">{[["#ffffff","#ffffff"],["#101828","#101828"],["#eef2ff","#c7d2fe"],["#fff1f2","#fef3c7"],["#ecfdf3","#d1fadf"]].map(([a,b])=><button type="button" key={a+b} style={{background:`linear-gradient(135deg,${a},${b})`}} onClick={()=>onChange({background:a,backgroundColor2:b,backgroundType:a===b?"solid":"gradient"})} aria-label="Aplicar fondo"/>)}</div></section>}

function TextAdvanced({element,onChange}){const runs=element.runs||[];const update=(index,patch)=>onChange({runs:runs.map((run,i)=>i===index?{...run,...patch}:run)});return <><label>Texto<textarea value={element.text||""} onChange={event=>onChange({text:event.target.value,runs:[]})}/></label><div className="canvas_text_toolbar"><button type="button" onClick={()=>onChange({fontStyle:(element.fontStyle||"").includes("bold")?"normal":"bold"})}><b>B</b></button><button type="button" onClick={()=>onChange({fontStyle:(element.fontStyle||"").includes("italic")?"normal":"italic"})}><i>I</i></button><button type="button" onClick={()=>onChange({textDecoration:element.textDecoration==="underline"?"":"underline"})}><u>U</u></button></div><div className="canvas_field_row"><label>Tamaño<input type="number" min="10" max="140" value={element.fontSize||42} onChange={event=>onChange({fontSize:Number(event.target.value)})}/></label><label>Color<input type="color" value={element.fill||"#111827"} onChange={event=>onChange({fill:event.target.value})}/></label></div><label>Tipografía<select value={element.fontFamily||"Arial"} onChange={event=>onChange({fontFamily:event.target.value})}><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Trebuchet MS</option><option>Courier New</option></select></label><div className="canvas_field_row"><label>Interlineado<input type="number" min=".8" max="3" step=".05" value={element.lineHeight||1.15} onChange={event=>onChange({lineHeight:Number(event.target.value)})}/></label><label>Espaciado<input type="number" min="-5" max="30" value={element.letterSpacing||0} onChange={event=>onChange({letterSpacing:Number(event.target.value)})}/></label></div><label>Fondo del texto<input type="color" value={element.backgroundColor&&element.backgroundColor!=="transparent"?element.backgroundColor:"#ffffff"} onChange={event=>onChange({backgroundColor:event.target.value})}/></label><button type="button" className="canvas_clear_text_bg" onClick={()=>onChange({backgroundColor:"transparent"})}>Quitar fondo</button><section className="canvas_rich_runs"><header><div><h3>Fragmentos multicolor</h3><p>Combina colores y tamaños en el mismo texto.</p></div><button type="button" onClick={()=>onChange({runs:[...runs,{id:`run_${Date.now()}`,text:runs.length?" nuevo texto":element.text||"Texto",color:element.fill||"#111827",fontSize:element.fontSize||42}]})}><i className="fa-solid fa-plus"/></button></header>{runs.map((run,index)=><div className="canvas_run_editor" key={run.id||index}><input value={run.text||""} onChange={event=>update(index,{text:event.target.value})}/><input type="color" value={run.color||"#111827"} onChange={event=>update(index,{color:event.target.value})}/><input type="number" min="10" max="140" value={run.fontSize||42} onChange={event=>update(index,{fontSize:Number(event.target.value)})}/><button type="button" onClick={()=>update(index,{bold:!run.bold})}><b>B</b></button><button type="button" onClick={()=>onChange({runs:runs.filter((_,i)=>i!==index)})}><i className="fa-solid fa-trash"/></button></div>)}</section></>}
