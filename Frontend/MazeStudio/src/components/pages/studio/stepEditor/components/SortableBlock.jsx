import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import EquationBlock from "../../../../contentRenderer/EquationBlock";
import RichTextEditor from "./RichTextEditor";
import {
    uploadBlockAsset,
    deleteBlockAsset,
    uploadInlineBlockImage,
} from "../../../../../api/blockAssetApi";


export default function SortableBlock({
    block,
    onUpdate,
    onDelete,
    onReplace,
    availableChallenges = [],

}) {
    const navigate = useNavigate();


    const [uploadingAsset, setUploadingAsset] =
        useState(false);




    const [assetError, setAssetError] =
        useState("");

    const [draftContent, setDraftContent] = useState(
        block.content || {}
    );

    const [draftSettings, setDraftSettings] = useState(
        block.settings || {}
    );

    const [saving, setSaving] = useState(false);

    const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
} = useSortable({
    id: block.id,
    data: {
        parentBlockId: block.parent_block_id ?? null,
        blockType: block.block_type,
    },
});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 20 : "auto",
    };

    async function handleAssetSelection(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        setUploadingAsset(true);
        setAssetError("");

        try {
            const data = await uploadBlockAsset(
                block.id,
                file
            );

            setDraftContent(data.block.content || {});
            onReplace(data.block);
        } catch (error) {
            setAssetError(
                error.message ||
                "Could not upload the file."
            );
        } finally {
            setUploadingAsset(false);
            event.target.value = "";
        }
    }

    async function handleRemoveAsset() {
        const confirmed = window.confirm(
            "Remove this file?"
        );

        if (!confirmed) return;

        setUploadingAsset(true);
        setAssetError("");

        try {
            const data = await deleteBlockAsset(
                block.id
            );

            setDraftContent(data.block.content || {});
            onReplace(data.block);
        } catch (error) {
            setAssetError(
                error.message ||
                "Could not remove the file."
            );
        } finally {
            setUploadingAsset(false);
        }
    }
    function updateContent(field, value) {
        setDraftContent((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function updateSettings(field, value) {
        setDraftSettings((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function handleSave() {
        setSaving(true);

        try {
            await onUpdate(block.id, {
                content: draftContent,
                settings: draftSettings,
            });
        } finally {
            setSaving(false);
        }
    }

    function renderEditor() {
        switch (block.block_type) {
            case "CANVAS": {
                const pageCount = draftContent.document?.pages?.length || 0;
                return <div className="canvas_block_editor_card">
                    <div className="canvas_block_editor_visual"><i className="fa-solid fa-object-group"/><span>{pageCount || "—"}</span><small>{pageCount === 1 ? "página" : "páginas"}</small></div>
                    <div><span className="canvas_block_kicker">PRESENTACIÓN VISUAL</span><h3>{draftContent.document?.title || "Nueva presentación Canvas"}</h3><p>Diseña páginas libremente con texto, imágenes, videos, formas, tablas y plantillas.</p><button type="button" onClick={()=>navigate(`/studio/step/${block.step_id}/canvas/${block.id}`)}><i className="fa-solid fa-pen-ruler"/> Abrir editor Canvas</button></div>
                </div>;
            }
            case "HEADING":
                return (
                    <div className="block_heading_editor">
                        <select
                            value={draftContent.level || 2}
                            onChange={(event) =>
                                updateContent(
                                    "level",
                                    Number(event.target.value)
                                )
                            }
                        >
                            <option value={1}>H1</option>
                            <option value={2}>H2</option>
                            <option value={3}>H3</option>
                        </select>

                        <input
                            value={draftContent.text || ""}
                            onChange={(event) =>
                                updateContent(
                                    "text",
                                    event.target.value
                                )
                            }
                            placeholder="Write a heading..."
                        />
                    </div>
                );

            case "TEXT":
                return <div className="block_rich_text_editor"><RichTextEditor content={draftContent} onChange={setDraftContent} baseStyle={{fontSize:`${Number(draftSettings.fontSize)||16}px`,color:draftSettings.color||undefined,backgroundColor:draftSettings.backgroundColor||undefined,fontFamily:draftSettings.fontFamily||undefined,fontWeight:draftSettings.fontWeight||undefined,textAlign:draftSettings.textAlign||undefined,lineHeight:draftSettings.lineHeight||undefined,letterSpacing:`${Number(draftSettings.letterSpacing)||0}px`}}/><div className="block_text_style_grid"><label>Block size<input type="number" min="10" max="72" value={draftSettings.fontSize||16} onChange={event=>updateSettings("fontSize",Number(event.target.value))}/></label><label>Block text color<input type="color" value={draftSettings.color||"#111827"} onChange={event=>updateSettings("color",event.target.value)}/></label><label>Block background<input type="color" value={draftSettings.backgroundColor||"#ffffff"} onChange={event=>updateSettings("backgroundColor",event.target.value)}/></label><label>Font<select value={draftSettings.fontFamily||"inherit"} onChange={event=>updateSettings("fontFamily",event.target.value)}><option value="inherit">Theme default</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="'Courier New', monospace">Monospace</option><option value="'Trebuchet MS', sans-serif">Trebuchet</option></select></label><label>Weight<select value={draftSettings.fontWeight||400} onChange={event=>updateSettings("fontWeight",Number(event.target.value))}><option value="300">Light</option><option value="400">Regular</option><option value="600">Semibold</option><option value="700">Bold</option><option value="900">Black</option></select></label><label>Align<select value={draftSettings.textAlign||"left"} onChange={event=>updateSettings("textAlign",event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label><label>Line height<input type="number" min="1" max="3" step=".1" value={draftSettings.lineHeight||1.7} onChange={event=>updateSettings("lineHeight",Number(event.target.value))}/></label><label>Letter spacing<input type="number" min="-2" max="12" step=".25" value={draftSettings.letterSpacing||0} onChange={event=>updateSettings("letterSpacing",Number(event.target.value))}/></label><label>Width<select value={draftSettings.maxWidth||"100%"} onChange={event=>updateSettings("maxWidth",event.target.value)}><option value="100%">Full</option><option value="900px">Wide</option><option value="720px">Reading</option><option value="560px">Narrow</option></select></label><button type="button" onClick={()=>setDraftSettings({fontSize:16,color:"",backgroundColor:"",fontFamily:"inherit",fontWeight:400,textAlign:"left",lineHeight:1.7,letterSpacing:0,maxWidth:"100%"})}>Reset block style</button></div></div>;

            case "QUOTE":
                return (
                    <div className="block_quote_editor">
                        <textarea
                            value={draftContent.text || ""}
                            onChange={(event) =>
                                updateContent(
                                    "text",
                                    event.target.value
                                )
                            }
                            placeholder="Write a quote..."
                            rows={4}
                        />

                        <input
                            value={draftContent.author || ""}
                            onChange={(event) =>
                                updateContent(
                                    "author",
                                    event.target.value
                                )
                            }
                            placeholder="Author or source"
                        />
                    </div>
                );

            case "CALLOUT":
                return (
                    <div className="block_callout_editor">
                        <div className="block_callout_options">
                            <input
                                value={
                                    draftSettings.icon || "💡"
                                }
                                onChange={(event) =>
                                    updateSettings(
                                        "icon",
                                        event.target.value
                                    )
                                }
                                maxLength={10}
                                aria-label="Callout icon"
                            />

                            <select
                                value={
                                    draftSettings.variant ||
                                    "INFO"
                                }
                                onChange={(event) =>
                                    updateSettings(
                                        "variant",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="INFO">
                                    Information
                                </option>
                                <option value="SUCCESS">
                                    Success
                                </option>
                                <option value="WARNING">
                                    Warning
                                </option>
                                <option value="DANGER">
                                    Danger
                                </option>
                            </select>
                        </div>

                        <textarea
                            value={draftContent.text || ""}
                            onChange={(event) =>
                                updateContent(
                                    "text",
                                    event.target.value
                                )
                            }
                            placeholder="Important information..."
                            rows={4}
                        />
                    </div>
                );

            case "CODE":
                return (
                    <div className="block_code_editor">
                        <input
                            value={
                                draftSettings.language ||
                                "javascript"
                            }
                            onChange={(event) =>
                                updateSettings(
                                    "language",
                                    event.target.value
                                )
                            }
                            placeholder="Language"
                        />

                        <textarea
                            value={draftContent.code || ""}
                            onChange={(event) =>
                                updateContent(
                                    "code",
                                    event.target.value
                                )
                            }
                            placeholder="Write code..."
                            rows={10}
                            spellCheck={false}
                        />
                    </div>
                );

            case "DIVIDER":
                return (
                    <div className="block_divider_preview">
                        <hr />
                        <span>Divider</span>
                    </div>
                );

            case "IMAGE":
                  return (
                      <div className="block_asset_editor">
                          {draftContent.placeholderPrompt&&!draftContent.url&&<div className="block_asset_error"><i className="fa-solid fa-wand-magic-sparkles"/> Suggested visual: {draftContent.placeholderPrompt}</div>}
                        {draftContent.url ? (
                            <figure className="block_image_preview">
                                <img
                                    src={draftContent.url}
                                    alt={
                                        draftContent.alt ||
                                        draftContent.name ||
                                        "Block image"
                                    }
                                />

                                <button
                                    type="button"
                                    onClick={handleRemoveAsset}
                                    disabled={uploadingAsset}
                                >
                                    <i className="fa-regular fa-trash-can"></i>
                                    Remove image
                                </button>
                            </figure>
                        ) : (
                            <label className="block_asset_dropzone">
                                <i className="fa-regular fa-image"></i>

                                <strong>
                                    {uploadingAsset
                                        ? "Uploading..."
                                        : "Choose an image"}
                                </strong>

                                <span>
                                    JPG, PNG, WEBP or GIF · Maximum 20 MB
                                </span>

                          <label className="block_remote_image_url">Or paste an image URL<input type="url" value={draftContent.objectKey?"":draftContent.url||""} onChange={event=>setDraftContent(current=>({...current,url:event.target.value,objectKey:"",name:"",mimeType:""}))} placeholder="https://example.com/image.jpg"/></label><input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={handleAssetSelection}
                                    disabled={uploadingAsset}
                                    hidden
                                />
                            </label>
                        )}

                        <input
                            value={draftContent.caption || ""}
                            onChange={(event) =>
                                updateContent(
                                    "caption",
                                    event.target.value
                                )
                            }
                            placeholder="Optional image caption"
                        />

                        <input
                            value={draftContent.alt || ""}
                            onChange={(event) =>
                                updateContent(
                                    "alt",
                                    event.target.value
                                )
                            }
                            placeholder="Alternative text"
                        />

                        {assetError && (
                            <div className="block_asset_error">
                                {assetError}
                            </div>
                        )}
                    </div>
                );

            case "AUDIO":
                return <div className="block_asset_editor">{draftContent.url&&<audio controls src={draftContent.url}/>}<label className="block_asset_dropzone"><i className="fa-solid fa-volume-high"/><strong>{uploadingAsset?"Uploading…":draftContent.url?"Replace audio":"Upload audio"}</strong><span>MP3, WAV, OGG or WebM · maximum 100 MB</span><input type="file" accept="audio/*" onChange={handleAssetSelection} disabled={uploadingAsset} hidden/></label>{draftContent.url&&<button type="button" onClick={handleRemoveAsset}>Remove audio</button>}{assetError&&<div className="block_asset_error">{assetError}</div>}</div>;

            case "VIDEO":
                return (
                    <div className="block_url_editor">
                        <label>Video URL</label>

                        <input
                            value={draftContent.url || ""}
                            onChange={(event) =>
                                updateContent(
                                    "url",
                                    event.target.value
                                )
                            }
                            placeholder="YouTube, Vimeo or video URL"
                        />

                        <input
                            value={draftContent.caption || ""}
                            onChange={(event) =>
                                updateContent(
                                    "caption",
                                    event.target.value
                                )
                            }
                            placeholder="Optional caption"
                        />
                        <label className="block_asset_dropzone"><i className="fa-solid fa-cloud-arrow-up"/><strong>{uploadingAsset?"Uploading…":draftContent.objectKey?"Replace uploaded video":"Or upload a video"}</strong><span>MP4, WebM or MOV · maximum 100 MB</span><input type="file" accept="video/*" onChange={handleAssetSelection} disabled={uploadingAsset} hidden/></label>
                        {draftContent.objectKey&&<button type="button" onClick={handleRemoveAsset}>Remove uploaded video</button>}
                        {assetError&&<div className="block_asset_error">{assetError}</div>}
                    </div>
                );


            case "PDF":
            case "FILE": {
                const isPdf = block.block_type === "PDF";

                return (
                    <div className="block_asset_editor">
                        {draftContent.url ? (
                            <div className="block_file_preview">
                                <span>
                                    <i
                                        className={`fa-solid ${isPdf
                                                ? "fa-file-pdf"
                                                : "fa-paperclip"
                                            }`}
                                    ></i>
                                </span>

                                <div>
                                    <strong>
                                        {draftContent.name ||
                                            "Uploaded file"}
                                    </strong>

                                    <small>
                                        {formatFileSize(
                                            draftContent.size
                                        )}
                                    </small>
                                </div>

                                <a
                                    href={draftContent.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open file"
                                >
                                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                </a>

                                <button
                                    type="button"
                                    onClick={handleRemoveAsset}
                                    disabled={uploadingAsset}
                                    title="Remove file"
                                >
                                    <i className="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        ) : (
                            <label className="block_asset_dropzone">
                                <i
                                    className={`fa-solid ${isPdf
                                            ? "fa-file-pdf"
                                            : "fa-cloud-arrow-up"
                                        }`}
                                ></i>

                                <strong>
                                    {uploadingAsset
                                        ? "Uploading..."
                                        : isPdf
                                            ? "Choose a PDF"
                                            : "Choose a file"}
                                </strong>

                                <span>Maximum 20 MB</span>

                                <input
                                    type="file"
                                    accept={
                                        isPdf
                                            ? "application/pdf"
                                            : undefined
                                    }
                                    onChange={handleAssetSelection}
                                    disabled={uploadingAsset}
                                    hidden
                                />
                            </label>
                        )}

                        {assetError && (
                            <div className="block_asset_error">
                                {assetError}
                            </div>
                        )}
                    </div>
                );
            }


            case "WHITEBOARD":
                return <div className="block_whiteboard_editor"><label>Title<input value={draftContent.title||""} onChange={event=>updateContent("title",event.target.value)} placeholder="Whiteboard activity"/></label><label>Instructions<textarea value={draftContent.prompt||""} onChange={event=>updateContent("prompt",event.target.value)} placeholder="What should the learner solve or draw?"/></label><div><label>Height<input type="number" min="240" max="900" value={draftSettings.height||420} onChange={event=>updateSettings("height",Number(event.target.value))}/></label><label>Background<select value={draftSettings.background||"GRID"} onChange={event=>updateSettings("background",event.target.value)}><option value="GRID">Grid</option><option value="DOTS">Dots</option><option value="PLAIN">Plain</option></select></label><label><input type="checkbox" checked={draftSettings.allowLearnerClear!==false} onChange={event=>updateSettings("allowLearnerClear",event.target.checked)}/> Learner can clear</label></div></div>;

            case "EQUATION":
                return <EquationEditor content={draftContent} settings={draftSettings} updateContent={updateContent} updateSettings={updateSettings}/>;

            case "BUTTON":
                return <div className="block_link_editor"><label>Button label<input value={draftContent.label||""} onChange={event=>updateContent("label",event.target.value)} placeholder="Open resource"/></label><label>Destination URL<input type="url" value={draftContent.url||""} onChange={event=>updateContent("url",event.target.value)} placeholder="https://example.com"/></label><div><label>Style<select value={draftSettings.variant||"primary"} onChange={event=>updateSettings("variant",event.target.value)}><option value="primary">Primary</option><option value="secondary">Secondary</option><option value="outline">Outline</option></select></label><label>Alignment<select value={draftSettings.alignment||"left"} onChange={event=>updateSettings("alignment",event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label className="block_link_checkbox"><input type="checkbox" checked={draftSettings.openInNewTab!==false} onChange={event=>updateSettings("openInNewTab",event.target.checked)}/> Open in new tab</label></div></div>;

            case "EMBED":
                return <div className="block_embed_editor"><label>Resource URL<input type="url" value={draftContent.url||""} onChange={event=>updateContent("url",event.target.value)} placeholder="https://…"/></label><label>Accessible title<input value={draftContent.title||""} onChange={event=>updateContent("title",event.target.value)} placeholder="Interactive resource"/></label><label>Height<input type="number" min="240" max="900" value={draftSettings.height||500} onChange={event=>updateSettings("height",Number(event.target.value))}/></label><p><i className="fa-solid fa-circle-info"/> The website must allow embedding. Use this for simulations, maps, forms or interactive tools.</p></div>;

            case "CHECKLIST": {
                const items=draftContent.items||[];
                return <div className="block_collection_editor"><label>Checklist title<input value={draftContent.title||""} onChange={event=>updateContent("title",event.target.value)}/></label><div>{items.map((item,index)=><div className="block_collection_row" key={item.id}><i className="fa-regular fa-square-check"/><input value={item.text||""} onChange={event=>setDraftContent(current=>({...current,items:items.map((entry,position)=>position===index?{...entry,text:event.target.value}:entry)}))} placeholder={`Item ${index+1}`}/><button type="button" onClick={()=>setDraftContent(current=>({...current,items:items.filter((_,position)=>position!==index)}))} aria-label="Remove item"><i className="fa-solid fa-xmark"/></button></div>)}</div><button type="button" className="block_collection_add" onClick={()=>setDraftContent(current=>({...current,items:[...(current.items||[]),{id:crypto.randomUUID(),text:""}]}))}><i className="fa-solid fa-plus"/> Add item</button></div>;
            }

            case "FLASHCARDS": {
                const cards=draftContent.cards||[];
                return <div className="block_collection_editor flashcard_editor"><label>Deck title<input value={draftContent.title||""} onChange={event=>updateContent("title",event.target.value)}/></label><div>{cards.map((card,index)=><div className="flashcard_editor_row" key={card.id}><span>{index+1}</span><label>Front<input value={card.front||""} onChange={event=>setDraftContent(current=>({...current,cards:cards.map((entry,position)=>position===index?{...entry,front:event.target.value}:entry)}))} placeholder="Word or concept"/></label><label>Back<input value={card.back||""} onChange={event=>setDraftContent(current=>({...current,cards:cards.map((entry,position)=>position===index?{...entry,back:event.target.value}:entry)}))} placeholder="Definition or translation"/></label><button type="button" onClick={()=>setDraftContent(current=>({...current,cards:cards.filter((_,position)=>position!==index)}))} aria-label="Remove card"><i className="fa-solid fa-trash"/></button></div>)}</div><button type="button" className="block_collection_add" onClick={()=>setDraftContent(current=>({...current,cards:[...(current.cards||[]),{id:crypto.randomUUID(),front:"",back:""}]}))}><i className="fa-solid fa-plus"/> Add card</button></div>;
            }

            case "TABLE": {
                const rows = Array.isArray(draftContent.rows)
                    ? draftContent.rows
                    : [];

                function updateCell(rowIndex, columnIndex, value) {
                    setDraftContent((current) => {
                        const nextRows = (current.rows || []).map((row) =>
                            row.map((cell) => ({ ...cell }))
                        );

                        nextRows[rowIndex][columnIndex].value = value;

                        return {
                            ...current,
                            rows: nextRows,
                        };
                    });
                }

                function addRow() {
                    setDraftContent((current) => {
                        const currentRows = current.rows || [];
                        const columnCount = currentRows[0]?.length || 2;

                        return {
                            ...current,
                            rows: [
                                ...currentRows,
                                Array.from({ length: columnCount }, () => ({
                                    value: "",
                                    isHeader: false,
                                })),
                            ],
                        };
                    });
                }

                function addColumn() {
                    setDraftContent((current) => ({
                        ...current,
                        rows: (current.rows || []).map((row, rowIndex) => [
                            ...row,
                            {
                                value: "",
                                isHeader:
                                    rowIndex === 0 &&
                                    Boolean(draftSettings.headerRow),
                            },
                        ]),
                    }));
                }

                function removeRow(rowIndex) {
                    setDraftContent((current) => ({
                        ...current,
                        rows: (current.rows || []).filter(
                            (_, index) => index !== rowIndex
                        ),
                    }));
                }

                function removeColumn(columnIndex) {
                    setDraftContent((current) => ({
                        ...current,
                        rows: (current.rows || []).map((row) =>
                            row.filter((_, index) => index !== columnIndex)
                        ),
                    }));
                }

                return (
                    <div className="block_table_editor">
                        <div className="block_table_toolbar">
                            <button type="button" onClick={addRow}>
                                <i className="fa-solid fa-plus"></i>
                                Add row
                            </button>

                            <button type="button" onClick={addColumn}>
                                <i className="fa-solid fa-plus"></i>
                                Add column
                            </button>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={Boolean(draftSettings.striped)}
                                    onChange={(event) =>
                                        updateSettings(
                                            "striped",
                                            event.target.checked
                                        )
                                    }
                                />
                                Striped rows
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={
                                        draftSettings.showBorders !== false
                                    }
                                    onChange={(event) =>
                                        updateSettings(
                                            "showBorders",
                                            event.target.checked
                                        )
                                    }
                                />
                                Borders
                            </label>
                        </div>

                        <div className="block_table_scroll">
                            <table>
                                <tbody>
                                    {rows.map((row, rowIndex) => (
                                        <tr key={`row-${rowIndex}`}>
                                            {row.map((cell, columnIndex) => (
                                                <td key={`cell-${rowIndex}-${columnIndex}`}>
                                                    <input
                                                        value={cell.value || ""}
                                                        onChange={(event) =>
                                                            updateCell(
                                                                rowIndex,
                                                                columnIndex,
                                                                event.target.value
                                                            )
                                                        }
                                                        placeholder={
                                                            cell.isHeader
                                                                ? "Header"
                                                                : "Cell"
                                                        }
                                                    />
                                                    {cell.imageUrl&&<img className="block_table_cell_image" src={cell.imageUrl} alt={cell.alt||""}/>}<button type="button" className="block_table_image_button" title="Add or change cell image" onClick={()=>{const url=window.prompt("Public image URL",cell.imageUrl||"");if(url===null)return;setDraftContent(current=>({...current,rows:(current.rows||[]).map((row,rIndex)=>row.map((entry,cIndex)=>rIndex===rowIndex&&cIndex===columnIndex?{...entry,imageUrl:/^https?:\/\//i.test(url)?url:"",alt:entry.alt||""}:entry))}))}}><i className="fa-solid fa-image"/></button>
                                                    {cell.imageUrl&&<img className="block_table_cell_image" src={cell.imageUrl} alt={cell.alt||""}/>}<button type="button" className="block_table_image_button" title="Add or change cell image" onClick={()=>{const url=window.prompt("Public image URL",cell.imageUrl||"");if(url===null)return;setDraftContent(current=>({...current,rows:(current.rows||[]).map((row,rIndex)=>row.map((entry,cIndex)=>rIndex===rowIndex&&cIndex===columnIndex?{...entry,imageUrl:/^https?:\/\//i.test(url)?url:"",alt:entry.alt||""}:entry))}))}}><i className="fa-solid fa-image"/></button>
                                                </td>
                                            ))}

                                            <td className="block_table_row_action">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeRow(rowIndex)
                                                    }
                                                    disabled={rows.length <= 1}
                                                    title="Remove row"
                                                >
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {rows[0]?.length > 1 && (
                            <div className="block_table_column_actions">
                                {rows[0].map((_, columnIndex) => (
                                    <button
                                        key={`remove-col-${columnIndex}`}
                                        type="button"
                                        onClick={() =>
                                            removeColumn(columnIndex)
                                        }
                                    >
                                        Remove column {columnIndex + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }

            case "MULTIPLE_CHOICE": {
                const options = Array.isArray(draftContent.options)
                    ? draftContent.options
                    : [];

                function updateOption(optionId, changes) {
                    setDraftContent((current) => ({
                        ...current,
                        options: (current.options || []).map((option) =>
                            option.id === optionId
                                ? { ...option, ...changes }
                                : option
                        ),
                    }));
                }

                function toggleCorrect(optionId, checked) {
                    setDraftContent((current) => ({
                        ...current,
                        options: (current.options || []).map((option) => ({
                            ...option,
                            isCorrect:
                                option.id === optionId
                                    ? checked
                                    : draftSettings.allowMultiple
                                      ? option.isCorrect
                                      : false,
                        })),
                    }));
                }

                function addOption() {
                    setDraftContent((current) => ({
                        ...current,
                        options: [
                            ...(current.options || []),
                            {
                                id: crypto.randomUUID(),
                                text: "",
                                isCorrect: false,
                            },
                        ],
                    }));
                }

                function removeOption(optionId) {
                    setDraftContent((current) => ({
                        ...current,
                        options: (current.options || []).filter(
                            (option) => option.id !== optionId
                        ),
                    }));
                }

                return (
                    <div className="block_exercise_editor">
                        <div className="block_form_group">
                            <label>Question</label>
                            <textarea
                                value={draftContent.question || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "question",
                                        event.target.value
                                    )
                                }
                                placeholder="Write the question..."
                                rows={3}
                            />
                        </div>

                        <div className="block_options_list">
                            {options.map((option, index) => (
                                <div
                                    key={option.id}
                                    className="block_option_row"
                                >
                                    <input
                                        type={
                                            draftSettings.allowMultiple
                                                ? "checkbox"
                                                : "radio"
                                        }
                                        name={`correct-${block.id}`}
                                        checked={Boolean(option.isCorrect)}
                                        onChange={(event) =>
                                            toggleCorrect(
                                                option.id,
                                                event.target.checked
                                            )
                                        }
                                        aria-label={`Mark option ${index + 1} as correct`}
                                    />

                                    <input
                                        value={option.text || ""}
                                        onChange={(event) =>
                                            updateOption(option.id, {
                                                text: event.target.value,
                                            })
                                        }
                                        placeholder={`Option ${index + 1}`}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => removeOption(option.id)}
                                        disabled={options.length <= 2}
                                        title="Remove option"
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="block_add_item_button"
                            onClick={addOption}
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add option
                        </button>

                        <div className="block_exercise_settings">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={Boolean(
                                        draftSettings.allowMultiple
                                    )}
                                    onChange={(event) =>
                                        updateSettings(
                                            "allowMultiple",
                                            event.target.checked
                                        )
                                    }
                                />
                                Allow multiple correct answers
                            </label>

                            <label>
                                <input
                                    type="checkbox"
                                    checked={Boolean(
                                        draftSettings.shuffleOptions
                                    )}
                                    onChange={(event) =>
                                        updateSettings(
                                            "shuffleOptions",
                                            event.target.checked
                                        )
                                    }
                                />
                                Shuffle options
                            </label>

                            <label>
                                Points
                                <input
                                    type="number"
                                    min="0"
                                    value={draftSettings.points ?? 1}
                                    onChange={(event) =>
                                        updateSettings(
                                            "points",
                                            Number(event.target.value)
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="block_form_group">
                            <label>Explanation</label>
                            <textarea
                                value={draftContent.explanation || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "explanation",
                                        event.target.value
                                    )
                                }
                                placeholder="Optional feedback shown after answering"
                                rows={3}
                            />
                        </div>
                    </div>
                );
            }

            case "TRUE_FALSE":
                return (
                    <div className="block_exercise_editor">
                        <div className="block_form_group">
                            <label>Statement</label>
                            <textarea
                                value={draftContent.statement || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "statement",
                                        event.target.value
                                    )
                                }
                                placeholder="Write a statement..."
                                rows={3}
                            />
                        </div>

                        <div className="block_true_false_options">
                            {[true, false].map((answer) => (
                                <label
                                    key={String(answer)}
                                    className={
                                        draftContent.correctAnswer === answer
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    <input
                                        type="radio"
                                        name={`true-false-${block.id}`}
                                        checked={
                                            draftContent.correctAnswer === answer
                                        }
                                        onChange={() =>
                                            updateContent(
                                                "correctAnswer",
                                                answer
                                            )
                                        }
                                    />
                                    {answer ? "True" : "False"}
                                </label>
                            ))}
                        </div>

                        <div className="block_exercise_settings">
                            <label>
                                Points
                                <input
                                    type="number"
                                    min="0"
                                    value={draftSettings.points ?? 1}
                                    onChange={(event) =>
                                        updateSettings(
                                            "points",
                                            Number(event.target.value)
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="block_form_group">
                            <label>Explanation</label>
                            <textarea
                                value={draftContent.explanation || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "explanation",
                                        event.target.value
                                    )
                                }
                                placeholder="Optional explanation"
                                rows={3}
                            />
                        </div>
                    </div>
                );

            case "SHORT_ANSWER": {
                const answers = Array.isArray(
                    draftContent.acceptedAnswers
                )
                    ? draftContent.acceptedAnswers
                    : [];

                function updateAnswer(index, value) {
                    setDraftContent((current) => {
                        const nextAnswers = [
                            ...(current.acceptedAnswers || []),
                        ];
                        nextAnswers[index] = value;
                        return {
                            ...current,
                            acceptedAnswers: nextAnswers,
                        };
                    });
                }

                function addAnswer() {
                    setDraftContent((current) => ({
                        ...current,
                        acceptedAnswers: [
                            ...(current.acceptedAnswers || []),
                            "",
                        ],
                    }));
                }

                function removeAnswer(index) {
                    setDraftContent((current) => ({
                        ...current,
                        acceptedAnswers: (
                            current.acceptedAnswers || []
                        ).filter((_, answerIndex) => answerIndex !== index),
                    }));
                }

                return (
                    <div className="block_exercise_editor">
                        <div className="block_form_group">
                            <label>Question</label>
                            <textarea
                                value={draftContent.question || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "question",
                                        event.target.value
                                    )
                                }
                                placeholder="Write the question..."
                                rows={3}
                            />
                        </div>

                        <div className="block_answer_list">
                            <label>Accepted answers</label>
                            {answers.map((answer, index) => (
                                <div
                                    key={`answer-${index}`}
                                    className="block_option_row"
                                >
                                    <input
                                        value={answer}
                                        onChange={(event) =>
                                            updateAnswer(
                                                index,
                                                event.target.value
                                            )
                                        }
                                        placeholder={`Accepted answer ${index + 1}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeAnswer(index)}
                                        disabled={answers.length <= 1}
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="block_add_item_button"
                            onClick={addAnswer}
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add accepted answer
                        </button>

                        <div className="block_exercise_settings">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={Boolean(
                                        draftSettings.caseSensitive
                                    )}
                                    onChange={(event) =>
                                        updateSettings(
                                            "caseSensitive",
                                            event.target.checked
                                        )
                                    }
                                />
                                Case sensitive
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={
                                        draftSettings.trimWhitespace !== false
                                    }
                                    onChange={(event) =>
                                        updateSettings(
                                            "trimWhitespace",
                                            event.target.checked
                                        )
                                    }
                                />
                                Trim whitespace
                            </label>
                            <label>
                                Points
                                <input
                                    type="number"
                                    min="0"
                                    value={draftSettings.points ?? 1}
                                    onChange={(event) =>
                                        updateSettings(
                                            "points",
                                            Number(event.target.value)
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="block_form_group">
                            <label>Explanation</label>
                            <textarea
                                value={draftContent.explanation || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "explanation",
                                        event.target.value
                                    )
                                }
                                placeholder="Optional explanation"
                                rows={3}
                            />
                        </div>
                    </div>
                );
            }

            case "FILL_BLANKS": {
                const answers = Array.isArray(
                    draftContent.acceptedAnswers
                )
                    ? draftContent.acceptedAnswers
                    : [];
                const wordBank = Array.isArray(draftContent.wordBank)
                    ? draftContent.wordBank
                    : [];

                return (
                    <div className="block_exercise_editor">
                        <div className="block_form_group">
                            <label>Sentence</label>
                            <textarea
                                value={draftContent.text || ""}
                                onChange={(event) =>
                                    updateContent("text", event.target.value)
                                }
                                placeholder="Use {{blank}} where the missing answer should appear."
                                rows={4}
                            />
                            <small>
                                {"Example: The capital of Sweden is {{blank}}."}
                            </small>
                        </div>

                        <div className="block_answer_list">
                            <label>Accepted answers</label>
                            {answers.map((answer, index) => (
                                <div
                                    key={`blank-answer-${index}`}
                                    className="block_option_row"
                                >
                                    <input
                                        value={answer}
                                        onChange={(event) => {
                                            const next = [...answers];
                                            next[index] = event.target.value;
                                            updateContent(
                                                "acceptedAnswers",
                                                next
                                            );
                                        }}
                                        placeholder={`Answer ${index + 1}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateContent(
                                                "acceptedAnswers",
                                                answers.filter(
                                                    (_, answerIndex) =>
                                                        answerIndex !== index
                                                )
                                            )
                                        }
                                        disabled={answers.length <= 1}
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="block_add_item_button"
                            onClick={() =>
                                updateContent("acceptedAnswers", [
                                    ...answers,
                                    "",
                                ])
                            }
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add accepted answer
                        </button>

                        <div className="block_form_group">
                            <label>Word bank</label>
                            <textarea
                                value={wordBank.join("\n")}
                                onChange={(event) =>
                                    updateContent(
                                        "wordBank",
                                        event.target.value.split("\n")
                                    )
                                }
                                placeholder={"One option per line\nInclude correct answers and distractors"}
                                rows={5}
                            />
                            <small>Include every correct answer plus plausible alternatives. Learners can tap an option to fill the next blank.</small>
                        </div>

                        <div className="block_exercise_settings">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={Boolean(
                                        draftSettings.caseSensitive
                                    )}
                                    onChange={(event) =>
                                        updateSettings(
                                            "caseSensitive",
                                            event.target.checked
                                        )
                                    }
                                />
                                Case sensitive
                            </label>
                            <label>
                                Points
                                <input
                                    type="number"
                                    min="0"
                                    value={draftSettings.points ?? 1}
                                    onChange={(event) =>
                                        updateSettings(
                                            "points",
                                            Number(event.target.value)
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="block_form_group">
                            <label>Explanation</label>
                            <textarea
                                value={draftContent.explanation || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "explanation",
                                        event.target.value
                                    )
                                }
                                placeholder="Optional explanation"
                                rows={3}
                            />
                        </div>
                    </div>
                );
            }

            case "CLASSIFICATION": {
                const categories=Array.isArray(draftContent.categories)?draftContent.categories:[];
                const items=Array.isArray(draftContent.items)?draftContent.items:[];
                const patchCategories=(next)=>setDraftContent(current=>({...current,categories:next}));
                const patchItems=(next)=>setDraftContent(current=>({...current,items:next}));
                return <div className="block_exercise_editor">
                    <div className="block_form_group"><label>Instructions</label><input value={draftContent.prompt||""} onChange={event=>updateContent("prompt",event.target.value)} placeholder="Classify each word"/></div>
                    <div className="block_form_group"><label>Categories</label><div className="block_collection_editor"><div>{categories.map((category,index)=><div className="block_collection_row" key={category.id}><i className="fa-solid fa-tag"/><input value={category.label||""} onChange={event=>patchCategories(categories.map(entry=>entry.id===category.id?{...entry,label:event.target.value}:entry))} placeholder={`Category ${index+1}`}/><button type="button" disabled={categories.length<=2} onClick={()=>{const next=categories.filter(entry=>entry.id!==category.id);patchCategories(next);patchItems(items.map(item=>item.correctCategoryId===category.id?{...item,correctCategoryId:next[0]?.id||""}:item))}}><i className="fa-solid fa-xmark"/></button></div>)}</div><button type="button" className="block_collection_add" onClick={()=>patchCategories([...categories,{id:crypto.randomUUID(),label:""}])}><i className="fa-solid fa-plus"/> Add category</button></div></div>
                    <div className="block_form_group"><label>Items and correct categories</label><div className="block_matching_list">{items.map((item,index)=><div className="block_matching_row" key={item.id}><input value={item.text||""} onChange={event=>patchItems(items.map(entry=>entry.id===item.id?{...entry,text:event.target.value}:entry))} placeholder={`Item ${index+1}`}/><i className="fa-solid fa-arrow-right"/><select value={item.correctCategoryId||""} onChange={event=>patchItems(items.map(entry=>entry.id===item.id?{...entry,correctCategoryId:event.target.value}:entry))}><option value="">Correct category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.label||"Untitled category"}</option>)}</select><button type="button" disabled={items.length<=1} onClick={()=>patchItems(items.filter(entry=>entry.id!==item.id))}><i className="fa-regular fa-trash-can"/></button></div>)}</div><button type="button" className="block_add_item_button" onClick={()=>patchItems([...items,{id:crypto.randomUUID(),text:"",correctCategoryId:categories[0]?.id||""}])}><i className="fa-solid fa-plus"/> Add item</button></div>
                    <div className="block_form_group"><label>Explanation</label><textarea value={draftContent.explanation||""} onChange={event=>updateContent("explanation",event.target.value)} placeholder="Explain the classifications after checking" rows={3}/></div>
                </div>;
            }

            case "MATCHING": {
                const pairs = Array.isArray(draftContent.pairs)
                    ? draftContent.pairs
                    : [];

                function updatePair(pairId, changes) {
                    setDraftContent((current) => ({
                        ...current,
                        pairs: (current.pairs || []).map((pair) =>
                            pair.id === pairId
                                ? { ...pair, ...changes }
                                : pair
                        ),
                    }));
                }

                function addPair() {
                    setDraftContent((current) => ({
                        ...current,
                        pairs: [
                            ...(current.pairs || []),
                            {
                                id: crypto.randomUUID(),
                                left: "",
                                right: "",
                            },
                        ],
                    }));
                }

                function removePair(pairId) {
                    setDraftContent((current) => ({
                        ...current,
                        pairs: (current.pairs || []).filter(
                            (pair) => pair.id !== pairId
                        ),
                    }));
                }

                return (
                    <div className="block_exercise_editor">
                        <div className="block_matching_header">
                            <span>Left item</span>
                            <span>Matching item</span>
                        </div>

                        <div className="block_matching_list">
                            {pairs.map((pair, index) => (
                                <div
                                    key={pair.id}
                                    className="block_matching_row"
                                >
                                    <input
                                        value={pair.left || ""}
                                        onChange={(event) =>
                                            updatePair(pair.id, {
                                                left: event.target.value,
                                            })
                                        }
                                        placeholder={`Item ${index + 1}`}
                                    />
                                    <button type="button" title="Add left image" onClick={()=>{const url=window.prompt("Left item image URL",pair.leftImageUrl||"");if(url!==null)updatePair(pair.id,{leftImageUrl:url,leftAlt:pair.leftAlt||pair.left||""})}}><i className="fa-regular fa-image"/></button>
                                    <i className="fa-solid fa-arrow-right"></i>
                                    <input
                                        value={pair.right || ""}
                                        onChange={(event) =>
                                            updatePair(pair.id, {
                                                right: event.target.value,
                                            })
                                        }
                                        placeholder="Match"
                                    />
                                    <button type="button" title="Add matching image" onClick={()=>{const url=window.prompt("Matching item image URL",pair.rightImageUrl||"");if(url!==null)updatePair(pair.id,{rightImageUrl:url,rightAlt:pair.rightAlt||pair.right||""})}}><i className="fa-regular fa-image"/></button>
                                    <button
                                        type="button"
                                        onClick={() => removePair(pair.id)}
                                        disabled={pairs.length <= 2}
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="block_add_item_button"
                            onClick={addPair}
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add pair
                        </button>

                        <div className="block_exercise_settings">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={Boolean(
                                        draftSettings.shuffleRightColumn
                                    )}
                                    onChange={(event) =>
                                        updateSettings(
                                            "shuffleRightColumn",
                                            event.target.checked
                                        )
                                    }
                                />
                                Shuffle right column
                            </label>
                            <label>
                                Points
                                <input
                                    type="number"
                                    min="0"
                                    value={draftSettings.points ?? 2}
                                    onChange={(event) =>
                                        updateSettings(
                                            "points",
                                            Number(event.target.value)
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </div>
                );
            }

            case "ORDERING": {
                const items = Array.isArray(draftContent.items)
                    ? draftContent.items
                    : [];

                function updateItem(itemId, value) {
                    setDraftContent((current) => ({
                        ...current,
                        items: (current.items || []).map((item) =>
                            item.id === itemId
                                ? { ...item, text: value }
                                : item
                        ),
                    }));
                }

                function addItem() {
                    setDraftContent((current) => ({
                        ...current,
                        items: [
                            ...(current.items || []),
                            {
                                id: crypto.randomUUID(),
                                text: "",
                            },
                        ],
                    }));
                }

                function removeItem(itemId) {
                    setDraftContent((current) => ({
                        ...current,
                        items: (current.items || []).filter(
                            (item) => item.id !== itemId
                        ),
                    }));
                }

                function moveItem(index, direction) {
                    setDraftContent((current) => {
                        const nextItems = [...(current.items || [])];
                        const nextIndex = index + direction;

                        if (
                            nextIndex < 0 ||
                            nextIndex >= nextItems.length
                        ) {
                            return current;
                        }

                        [nextItems[index], nextItems[nextIndex]] = [
                            nextItems[nextIndex],
                            nextItems[index],
                        ];

                        return {
                            ...current,
                            items: nextItems,
                        };
                    });
                }

                return (
                    <div className="block_exercise_editor">
                        <div className="block_form_group">
                            <label>Prompt</label>
                            <textarea
                                value={draftContent.prompt || ""}
                                onChange={(event) =>
                                    updateContent(
                                        "prompt",
                                        event.target.value
                                    )
                                }
                                placeholder="Explain what the learner should order..."
                                rows={3}
                            />
                        </div>

                        <div className="block_ordering_list">
                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="block_ordering_row"
                                >
                                    <span>{index + 1}</span>
                                    <input
                                        value={item.text || ""}
                                        onChange={(event) =>
                                            updateItem(
                                                item.id,
                                                event.target.value
                                            )
                                        }
                                        placeholder={`Item ${index + 1}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => moveItem(index, -1)}
                                        disabled={index === 0}
                                        title="Move up"
                                    >
                                        <i className="fa-solid fa-arrow-up"></i>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveItem(index, 1)}
                                        disabled={index === items.length - 1}
                                        title="Move down"
                                    >
                                        <i className="fa-solid fa-arrow-down"></i>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(item.id)}
                                        disabled={items.length <= 2}
                                        title="Remove item"
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="block_add_item_button"
                            onClick={addItem}
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add item
                        </button>

                        <div className="block_exercise_settings">
                            <label>
                                Points
                                <input
                                    type="number"
                                    min="0"
                                    value={draftSettings.points ?? 2}
                                    onChange={(event) =>
                                        updateSettings(
                                            "points",
                                            Number(event.target.value)
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </div>
                );
            }

            case "CHALLENGE":
                return (
                    <div className="block_challenge_editor">
                        <div className="block_challenge_icon">
                            <i className="fa-solid fa-flag-checkered" />
                        </div>
                        <div className="block_challenge_fields">
                            <label>
                                Challenge
                                <select
                                    value={draftContent.challengeId || ""}
                                    onChange={(event) =>
                                        updateContent("challengeId", event.target.value)
                                    }
                                    required
                                >
                                    <option value="">Choose a Challenge…</option>
                                    {availableChallenges.map((challenge) => (
                                        <option key={challenge.id} value={challenge.id}>
                                            {challenge.title} · {challenge.status}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block_challenge_required">
                                <input
                                    type="checkbox"
                                    checked={draftSettings.required !== false}
                                    onChange={(event) =>
                                        updateSettings("required", event.target.checked)
                                    }
                                />
                                Require this Challenge before advancing
                            </label>
                            {draftSettings.required !== false && (
                                <label>
                                    Completion rule
                                    <select
                                        value={draftSettings.completionRule || "SUBMITTED"}
                                        onChange={(event) =>
                                            updateSettings("completionRule", event.target.value)
                                        }
                                    >
                                        <option value="SUBMITTED">Submit at least one attempt</option>
                                        <option value="PASSED">Pass the Challenge</option>
                                    </select>
                                </label>
                            )}
                            {!availableChallenges.length && (
                                <p>Create a Challenge in this Learning Journey first.</p>
                            )}
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="block_coming_soon">
                        Unsupported block type
                    </div>
                );
        }
    }

    return (
        <article
            ref={setNodeRef}
            style={style}
            className={`step_block_card ${isDragging ? "is_dragging" : ""
                }`}
        >
            <header className="step_block_header">
                <div className="step_block_identity">
                    <button
                        type="button"
                        className="step_block_drag_handle"
                        {...attributes}
                        {...listeners}
                        aria-label="Reorder block"
                    >
                        <i className="fa-solid fa-grip-vertical"></i>
                    </button>

                    <span className="step_block_type">
                        {block.block_type}
                    </span>
                </div>

                <div className="step_block_actions">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        title="Save block"
                    >
                        <i
                            className={`fa-solid ${saving
                                    ? "fa-spinner fa-spin"
                                    : "fa-check"
                                }`}
                        ></i>
                        <span>{saving?"Saving…":"Save changes"}</span>
                    </button>

                    <button
                        type="button"
                        className="danger"
                        onClick={() => onDelete(block)}
                        title="Delete block"
                    >
                        <i className="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </header>

            <div className="step_block_body">
                {!["IMAGE","VIDEO","AUDIO","FILE","PDF","LAYOUT","COLUMN","CANVAS"].includes(block.block_type)&&<InlineImageEditor blockId={block.id} label="Block image (optional)" value={draftContent.media} onChange={media=>updateContent("media",media)}/>} 
                {renderEditor()}
            </div>
        </article>
    );
}

function formatFileSize(bytes) {
    const size = Number(bytes);

    if (!Number.isFinite(size) || size <= 0) {
        return "Unknown size";
    }

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(
        size /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}

function InlineImageEditor({blockId,label="Image (optional)",value,onChange}){
    const media=value&&typeof value==="object"?value:{};
    const[uploading,setUploading]=useState(false),[error,setError]=useState("");
    const[open,setOpen]=useState(Boolean(media.url||media.placeholderPrompt));
    async function upload(event){const file=event.target.files?.[0];if(!file)return;setUploading(true);setError("");try{const data=await uploadInlineBlockImage(blockId,file);onChange({...media,...data.asset})}catch(uploadError){setError(uploadError.message||"Could not upload image")}finally{setUploading(false);event.target.value=""}}
    if(!open)return <button type="button" className="block_inline_media_trigger" onClick={()=>setOpen(true)}><i className="fa-regular fa-image"/> Add image</button>;
    return <div className="block_inline_media_editor">
        <div><strong><i className="fa-regular fa-image"/> {label}</strong><small>{media.placeholderPrompt||"Add a visual without replacing the text."}</small><button type="button" onClick={()=>{if(!media.url)setOpen(false)}}><i className="fa-solid fa-chevron-up"/> Collapse</button></div>
        {media.url&&<img src={media.url} alt={media.alt||""}/>} 
        <label>Image URL<input type="url" value={media.url||""} onChange={event=>onChange({...media,url:event.target.value,objectKey:""})} placeholder="https://example.com/image.jpg"/></label>
        <label className="block_inline_media_upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} hidden/><i className={`fa-solid ${uploading?"fa-spinner fa-spin":"fa-cloud-arrow-up"}`}/>{uploading?"Uploading…":"Upload"}</label>
        <label>Alt text<input value={media.alt||""} onChange={event=>onChange({...media,alt:event.target.value})} placeholder="Describe the image"/></label>
        <label>Position<select value={media.position||"above"} onChange={event=>onChange({...media,position:event.target.value})}><option value="above">Above content</option><option value="below">Below content</option></select></label>
        {media.url&&<button type="button" onClick={()=>onChange({})}><i className="fa-regular fa-trash-can"/> Remove</button>}{error&&<small className="block_asset_error">{error}</small>}
    </div>;
}

const EQUATION_TOOLS = [
    ["x²", "^{2}"], ["xⁿ", "^{}"], ["x₂", "_{}"], ["Fraction", "\\frac{}{}"],
    ["√", "\\sqrt{}"], ["π", "\\pi"], ["×", "\\times"], ["÷", "\\div"], ["±", "\\pm"],
];

function EquationEditor({ content, settings, updateContent, updateSettings }) {
    const inputRef = useRef(null);
    const expression = content.expression || "";
    function insert(template) {
        const input = inputRef.current;
        const start = input?.selectionStart ?? expression.length;
        const end = input?.selectionEnd ?? start;
        const next = expression.slice(0, start) + template + expression.slice(end);
        updateContent("expression", next);
        requestAnimationFrame(() => { input?.focus(); const cursor = start + (template.includes("{}") ? template.indexOf("{}") + 1 : template.length); input?.setSelectionRange(cursor, cursor); });
    }
    return <div className="block_equation_editor">
        <div className="equation_editor_main">
            <label>Mathematical expression<textarea ref={inputRef} value={expression} onChange={event=>updateContent("expression",event.target.value)} placeholder="Example: x^{2} + y^{2} = r^{2}"/></label>
            <div className="equation_toolbar" aria-label="Equation formatting">{EQUATION_TOOLS.map(([label,template])=><button type="button" key={label} onClick={()=>insert(template)}>{label}</button>)}</div>
            <small>Use the buttons or type formats such as x^{'{2}'}, H_2O, \\frac{'{a}{b}'} or \\sqrt{'{x}'}.</small>
            <div className="equation_live_preview"><span>Live preview</span><EquationBlock block={{content,settings}}/></div>
        </div>
        <label>Caption<input value={content.caption||""} onChange={event=>updateContent("caption",event.target.value)}/></label>
        <label>Alignment<select value={settings.align||"center"} onChange={event=>updateSettings("align",event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
    </div>;
}
