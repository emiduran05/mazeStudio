import { useEffect, useRef } from "react";
import { Stage, Layer, Rect, Text, Line, Group, Image as KonvaImage, Transformer } from "react-konva";
import useImage from "use-image";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./mazeCanvasDocument";

function CanvasImage({ element, common }) {
  const [image, status] = useImage(element.src || "");
  const message=element.src?(status==="failed"?"No se pudo cargar la imagen":"Cargando imagen…"):"Agrega una imagen";
  const imageRatio=image?(image.naturalWidth||image.width)/(image.naturalHeight||image.height):1;
  const frameRatio=element.width/element.height;
  const drawWidth=imageRatio>frameRatio?element.width:element.height*imageRatio;
  const drawHeight=imageRatio>frameRatio?element.width/imageRatio:element.height;
  return <Group {...common} clipX={0} clipY={0} clipWidth={element.width} clipHeight={element.height}><Rect width={element.width} height={element.height} fill="#EEF0FF" cornerRadius={18}/>{image ? <KonvaImage image={image} x={(element.width-drawWidth)/2} y={(element.height-drawHeight)/2} width={drawWidth} height={drawHeight}/> : <><Text text={message} width={element.width} y={element.height / 2 - 15} align="center" fontSize={22} fontStyle="bold" fill="#4A45FF"/><Text text={element.src&&status==="failed"?"Revisa el archivo o vuelve a subirlo":"Sube un archivo o pega una URL"} width={element.width} y={element.height / 2 + 22} align="center" fontSize={15} fill="#667085"/></>}</Group>;
}

function CanvasElement({ element, selected, onSelect, onChange, preview }) {
  const nodeRef = useRef(null);
  const transformerRef = useRef(null);
  useEffect(() => {
    if (selected && transformerRef.current && nodeRef.current) {
      transformerRef.current.nodes([nodeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  const common = {
    ref: nodeRef,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation || 0,
    opacity: element.opacity ?? 1,
    draggable: !preview,
    onClick: event => { event.cancelBubble = true; onSelect(element.id); },
    onTap: event => { event.cancelBubble = true; onSelect(element.id); },
    onDragEnd: event => onChange(element.id, { x: Math.round(event.target.x()), y: Math.round(event.target.y()) }),
    onTransformEnd: () => {
      const node = nodeRef.current;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1); node.scaleY(1);
      onChange(element.id, { x: Math.round(node.x()), y: Math.round(node.y()), width: Math.max(40, Math.round(node.width() * scaleX)), height: Math.max(30, Math.round(node.height() * scaleY)), rotation: Math.round(node.rotation()) });
    },
  };

  let rendered;
  if (element.type === "TEXT") rendered = <Group {...common}><Rect width={element.width} height={element.height} fill={element.backgroundColor&&element.backgroundColor!=="transparent"?element.backgroundColor:undefined} cornerRadius={element.cornerRadius||0}/>{element.runs?.length?<RichTextRuns element={element}/>:<Text width={element.width} height={element.height} text={element.text} fontSize={element.fontSize} fontFamily={element.fontFamily} fontStyle={element.fontStyle} textDecoration={element.textDecoration} fill={element.fill} align={element.align} verticalAlign="middle" wrap="word" lineHeight={element.lineHeight||1.15} letterSpacing={element.letterSpacing||0}/>}</Group>;
  else if (element.type === "IMAGE") rendered = <CanvasImage element={element} common={common}/>;
  else if (element.type === "SHAPE") rendered = element.shape === "ellipse" ? <Rect {...common} cornerRadius={Math.min(element.width, element.height) / 2} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth}/> : <Rect {...common} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} cornerRadius={element.cornerRadius || 0}/>;
  else if (element.type === "LINE") rendered = <Line {...common} points={[0, 0, element.width, 0]} stroke={element.stroke} strokeWidth={element.strokeWidth} lineCap="round" height={20}/>;
  else if (element.type === "CODE") rendered = <Group {...common}><Rect width={element.width} height={element.height} fill={element.fill} cornerRadius={20}/><Text x={24} y={20} width={element.width - 48} height={element.height - 40} text={element.code} fontFamily="monospace" fontSize={20} fill={element.textColor} wrap="word"/></Group>;
  else if (element.type === "TABLE") {
    const rows = element.rows?.length ? element.rows : [["", ""]]; const rowHeight = element.height / rows.length; const cols = Math.max(...rows.map(row => row.length), 1); const colWidth = element.width / cols;
    rendered = <Group {...common}>{rows.flatMap((row, ri) => Array.from({ length: cols }, (_, ci) => <Group key={`${ri}-${ci}`} x={ci * colWidth} y={ri * rowHeight}><Rect width={colWidth} height={rowHeight} fill={ri === 0 ? "#E7E7FF" : "#FFFFFF"} stroke="#C7CADB"/><Text text={row[ci] || ""} width={colWidth} height={rowHeight} padding={12} verticalAlign="middle" fontSize={18} fontStyle={ri === 0 ? "bold" : "normal"} fill="#101828"/></Group>))}</Group>;
  } else rendered = <Group {...common}><Rect width={element.width} height={element.height} fill="#F4F3FF" stroke="#B9B7FF" cornerRadius={20}/><Text text={element.type === "VIDEO_EMBED" ? `▶ ${element.title || "Video"}` : `↗ ${element.label || "Archivo"}`} width={element.width} height={element.height} align="center" verticalAlign="middle" fontSize={22} fontStyle="bold" fill="#3530D8"/></Group>;

  return <>{rendered}{selected && !preview && <Transformer ref={transformerRef} rotateEnabled enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]} boundBoxFunc={(oldBox, nextBox) => nextBox.width < 40 || nextBox.height < 30 ? oldBox : nextBox}/>}</>;
}

export default function MazeCanvasStage({ page, scale, selectedId, onSelect, onElementChange, preview }) {
  return <Stage width={CANVAS_WIDTH * scale} height={CANVAS_HEIGHT * scale} scaleX={scale} scaleY={scale} onMouseDown={event => { if (event.target === event.target.getStage()) onSelect(null); }} onTouchStart={event => { if (event.target === event.target.getStage()) onSelect(null); }}>
    <Layer><Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={page.background || "#FFFFFF"} fillLinearGradientStartPoint={page.backgroundType==="gradient"?{x:0,y:0}:undefined} fillLinearGradientEndPoint={page.backgroundType==="gradient"?{x:CANVAS_WIDTH,y:CANVAS_HEIGHT}:undefined} fillLinearGradientColorStops={page.backgroundType==="gradient"?[0,page.background||"#FFFFFF",1,page.backgroundColor2||"#E7E7FF"]:undefined}/>{page.elements.map(element => <CanvasElement key={element.id} element={element} selected={element.id === selectedId} onSelect={onSelect} onChange={onElementChange} preview={preview}/>)}</Layer>
  </Stage>;
}

function RichTextRuns({element}){
  let x=0,y=0;const nodes=[];const defaultSize=element.fontSize||42;const maxWidth=element.width;
  element.runs.forEach((run,index)=>{const text=run.text||"";const size=run.fontSize||defaultSize;const estimated=Math.max(4,text.length*size*.56+(run.letterSpacing||0)*text.length);if(x+estimated>maxWidth&&x>0){x=0;y+=size*(element.lineHeight||1.2)}nodes.push(<Text key={run.id||index} x={x} y={y} text={text} fontSize={size} fontFamily={run.fontFamily||element.fontFamily} fontStyle={`${run.bold?"bold ":""}${run.italic?"italic":""}`.trim()||"normal"} textDecoration={run.underline?"underline":""} fill={run.color||element.fill} letterSpacing={run.letterSpacing||element.letterSpacing||0}/>);x+=estimated});return <>{nodes}</>;
}
