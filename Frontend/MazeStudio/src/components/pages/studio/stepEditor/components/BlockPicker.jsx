import { useMemo, useState } from "react";
import { blockLibraries, layoutPresets } from "../../../../../data/blockTypes";

export default function BlockPicker({ isOpen, onClose, onSelect, onSelectLayout }) {
    const [showLayouts,setShowLayouts]=useState(false);
    const [mode,setMode]=useState("content");
    const [topic,setTopic]=useState("writing");
    const [query,setQuery]=useState("");
    const categories=blockLibraries[mode];
    const activeCategory=categories.find((item)=>item.id===topic)||categories[0];
    const results=useMemo(()=>{
        const term=query.trim().toLowerCase();
        if(!term)return activeCategory?.blocks||[];
        const seen=new Set();
        return Object.values(blockLibraries).flat().flatMap((category)=>category.blocks).filter((item)=>{
            if(seen.has(item.type))return false;
            const matches=[item.label,item.description,...(item.keywords||[])].join(" ").toLowerCase().includes(term);
            if(matches)seen.add(item.type);return matches;
        });
    },[query,activeCategory]);
    if(!isOpen)return null;
    function closePicker(){setShowLayouts(false);setQuery("");onClose()}
    function selectMode(next){setMode(next);setTopic(blockLibraries[next][0].id);setQuery("")}
    function select(type){if(type==="LAYOUT"){setShowLayouts(true);return}onSelect(type)}
    return <div className="block_picker_backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&closePicker()}>
        <div className="block_picker redesigned">
            <header className="block_picker_header"><div><span>Lesson building blocks</span><h2>{showLayouts?"Choose a column layout":"What would you like to add?"}</h2></div><button type="button" onClick={closePicker} aria-label="Close block picker"><i className="fa-solid fa-xmark"/></button></header>
            {showLayouts?<div className="layout_preset_grid">{layoutPresets.map((preset)=><button key={preset.value} type="button" className="layout_preset_item" onClick={()=>onSelectLayout(preset.value)}><div className="layout_preset_preview" style={{gridTemplateColumns:preset.columns.map((width)=>`${width}fr`).join(" ")}}>{preset.columns.map((width,index)=><span key={`${preset.value}-${index}`}/>)}</div><strong>{preset.label}</strong></button>)}<button type="button" className="layout_picker_back" onClick={()=>setShowLayouts(false)}><i className="fa-solid fa-arrow-left"/> Back to blocks</button></div>:
            <div className="block_library_body">
                <div className="block_library_top"><nav className="block_mode_tabs"><button type="button" className={mode==="content"?"active":""} onClick={()=>selectMode("content")}><i className="fa-solid fa-file-lines"/><span><strong>Content</strong><small>Explain and organize</small></span></button><button type="button" className={mode==="activities"?"active":""} onClick={()=>selectMode("activities")}><i className="fa-solid fa-shapes"/><span><strong>Activities</strong><small>Practice by subject</small></span></button></nav><label className="block_library_search"><i className="fa-solid fa-magnifying-glass"/><input autoFocus value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search blocks, e.g. video, vocabulary, fraction…"/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label="Clear search"><i className="fa-solid fa-xmark"/></button>}</label></div>
                {!query&&<nav className="block_topic_tabs">{categories.map((category)=><button type="button" key={category.id} className={activeCategory.id===category.id?"active":""} onClick={()=>setTopic(category.id)}><i className={`fa-solid ${category.icon}`}/>{category.label}</button>)}</nav>}
                <section className="block_library_results"><header><div><h3>{query?`Results for “${query}”`:activeCategory.label}</h3><p>{query?"Blocks from across the library":activeCategory.description}</p></div><span>{results.length} options</span></header>
                    {results.length?<div className="block_picker_grid">{results.map((item)=><button key={`${item.type}-${item.label}`} type="button" className="block_picker_item" onClick={()=>select(item.type)}><span className="block_picker_icon"><i className={`fa-solid ${item.icon}`}/></span><span><strong>{item.label}</strong><small>{item.description}</small></span><i className="fa-solid fa-plus block_add_icon"/></button>)}</div>:<div className="block_library_empty"><i className="fa-solid fa-magnifying-glass"/><strong>No blocks found</strong><span>Try a subject, activity or media type.</span></div>}
                </section>
            </div>}
        </div>
    </div>;
}
