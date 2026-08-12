import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../../api/api";
import "./StepPreview.css";
import WhiteboardBlock from "../../../contentRenderer/WhiteboardBlock";
import EquationBlock from "../../../contentRenderer/EquationBlock";
import ContentRenderer from "../../../contentRenderer/ContentRenderer";
import RichTextContent from "../../../contentRenderer/RichTextContent";

export default function StepPreview() {
    const { stepId } = useParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [journeySteps, setJourneySteps] = useState([]);
    const [answers, setAnswers] = useState({});
    const [revealed, setRevealed] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadPreview() {
            setLoading(true);
            setError("");

            try {
                const [stepData, blocksData] = await Promise.all([
                    apiRequest(`/steps/${stepId}`),
                    apiRequest(`/steps/${stepId}/blocks`),
                ]);

                setStep(stepData.step);
                setBlocks(blocksData.blocks || []);
                const challengeData = await apiRequest(
                    `/learning-journeys/${stepData.step.learning_journey_id}/challenges`
                );
                setChallenges(challengeData.challenges || []);
                const builderData = await apiRequest(
                    `/learning-journeys/${stepData.step.learning_journey_id}/builder`
                );
                setJourneySteps(orderJourneySteps(builderData.stages || [], builderData.steps || []));
            } catch (err) {
                setError(
                    err.message || "Could not load the Step preview."
                );
            } finally {
                setLoading(false);
            }
        }

        loadPreview();
    }, [stepId]);

    const currentStepIndex = journeySteps.findIndex((item) => item.id === stepId);
    const previousStep = currentStepIndex > 0 ? journeySteps[currentStepIndex - 1] : null;
    const nextStep = currentStepIndex >= 0 && currentStepIndex < journeySteps.length - 1
        ? journeySteps[currentStepIndex + 1]
        : null;

    const rootBlocks = useMemo(
        () =>
            blocks
                .filter(
                    (block) =>
                        block.parent_block_id === null &&
                        block.block_type !== "COLUMN"
                )
                .sort((a, b) => a.position - b.position),
        [blocks]
    );
    const visibleRootBlocks=rootBlocks.filter(block=>block.block_type!=="IMAGE"||Boolean(block.content?.url||block.content?.imageUrl||block.content?.image_url));

    function getChildren(parentBlockId) {
        return blocks
            .filter(
                (block) => block.parent_block_id === parentBlockId
            )
            .sort((a, b) => a.position - b.position);
    }

    function setBlockAnswer(blockId, value) {
        setAnswers((current) => ({
            ...current,
            [blockId]: value,
        }));
    }

    function toggleReveal(blockId) {
        setRevealed((current) => ({
            ...current,
            [blockId]: !current[blockId],
        }));
    }

    function renderHeading(block) {
        const level = Number(block.content?.level) || 2;
        const text = block.content?.text || "Untitled heading";

        if (level === 1) {
            return <h1 className="preview_block_h1">{text}</h1>;
        }

        if (level === 3) {
            return <h3 className="preview_block_h3">{text}</h3>;
        }

        return <h2 className="preview_block_h2">{text}</h2>;
    }

    function renderText(block) {
        const content =
            block.content?.text ?? block.content?.html ?? "";

        const settings=block.settings||{};
        return <RichTextContent content={{...block.content,text:content}} style={{fontSize:`${Math.min(72,Math.max(10,Number(settings.fontSize)||16))}px`,color:settings.color||undefined,backgroundColor:settings.backgroundColor||undefined,fontFamily:settings.fontFamily||undefined,fontWeight:settings.fontWeight||undefined,textAlign:settings.textAlign||undefined,lineHeight:settings.lineHeight||undefined,letterSpacing:`${Number(settings.letterSpacing)||0}px`,maxWidth:settings.maxWidth||undefined,marginInline:settings.maxWidth&&settings.maxWidth!=="100%"?"auto":undefined}}/>;
    }

    function renderVideo(block) {
        const url = block.content?.url || "";
        const caption = block.content?.caption || "";

        if (!url) {
            return missingContent("fa-video", "No video URL has been added.");
        }

        const youtubeId = getYouTubeVideoId(url);

        return (
            <figure className="preview_media_block">
                {youtubeId ? (
                    <div className="preview_video_frame">
                        <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title={caption || "Step video"}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <video controls src={url}>
                        Your browser does not support video playback.
                    </video>
                )}

                {caption && <figcaption>{caption}</figcaption>}
            </figure>
        );
    }

    function renderImage(block) {
        const url =
            block.content?.url ||
            block.content?.imageUrl ||
            block.content?.image_url ||
            "";

        if (!url) {
            return null;
        }

        return (
            <figure className="preview_media_block">
                <img
                    src={url}
                    alt={
                        block.content?.alt ||
                        block.content?.caption ||
                        "Step image"
                    }
                />
                {block.content?.caption && (
                    <figcaption>{block.content.caption}</figcaption>
                )}
                {block.content?.sourceUrl&&<a className="learner_image_source" href={block.content.sourceUrl} target="_blank" rel="noreferrer">Image source <i className="fa-solid fa-arrow-up-right-from-square"/></a>}
            </figure>
        );
    }

    function renderFile(block, isPdf = false) {
        const url =
            block.content?.url ||
            block.content?.fileUrl ||
            block.content?.file_url ||
            "";
        const name =
            block.content?.name ||
            block.content?.fileName ||
            (isPdf ? "PDF document" : "Download file");

        if (!url) {
            return missingContent(
                isPdf ? "fa-file-pdf" : "fa-paperclip",
                `No ${isPdf ? "PDF" : "file"} has been attached.`
            );
        }

        return (
            <a
                className="preview_file_block"
                href={url}
                target="_blank"
                rel="noreferrer"
            >
                <span>
                    <i
                        className={`fa-solid ${
                            isPdf ? "fa-file-pdf" : "fa-paperclip"
                        }`}
                    />
                </span>
                <div>
                    <strong>{name}</strong>
                    <small>
                        {formatFileSize(block.content?.size)} · Open in a new tab
                    </small>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square" />
            </a>
        );
    }

    function renderTable(block) {
        const rows = Array.isArray(block.content?.rows)
            ? block.content.rows
            : [];

        if (rows.length === 0) {
            return missingContent("fa-table", "This table has no rows.");
        }

        return (
            <div className="preview_table_wrap">
                <table
                    className={`${
                        block.settings?.striped ? "striped" : ""
                    } ${
                        block.settings?.showBorders === false
                            ? "borderless"
                            : ""
                    }`}
                >
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={`${block.id}-row-${rowIndex}`}>
                                {row.map((cell, columnIndex) => {
                                    const CellTag =
                                        cell.isHeader ||
                                        (block.settings?.headerRow && rowIndex === 0)
                                            ? "th"
                                            : "td";

                                    return (
                                        <CellTag
                                            key={`${block.id}-${rowIndex}-${columnIndex}`}
                                        >
                                            {cell.imageUrl&&<img className="learner_table_cell_image" src={cell.imageUrl} alt={cell.alt||""}/>} 
                                            {cell.value || "—"}
                                        </CellTag>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    function renderMultipleChoice(block) {
        const options = block.content?.options || [];
        const allowMultiple = Boolean(block.settings?.allowMultiple);
        const selected = answers[block.id] || (allowMultiple ? [] : "");

        function selectOption(optionId) {
            if (!allowMultiple) {
                setBlockAnswer(block.id, optionId);
                return;
            }

            const current = Array.isArray(selected) ? selected : [];
            setBlockAnswer(
                block.id,
                current.includes(optionId)
                    ? current.filter((id) => id !== optionId)
                    : [...current, optionId]
            );
        }

        return (
            <div className="preview_exercise_block">
                <ExerciseHeader block={block} label="Multiple choice" />
                <h3>{block.content?.question || "Untitled question"}</h3>

                <div className="preview_choice_list">
                    {options.map((option, index) => {
                        const isSelected = allowMultiple
                            ? selected.includes?.(option.id)
                            : selected === option.id;

                        return (
                            <button
                                key={option.id || index}
                                type="button"
                                className={isSelected ? "selected" : ""}
                                onClick={() => selectOption(option.id)}
                            >
                                <span>{String.fromCharCode(65 + index)}</span>
                                {option.text || `Option ${index + 1}`}
                            </button>
                        );
                    })}
                </div>

                <ExerciseReveal
                    block={block}
                    revealed={revealed[block.id]}
                    onToggle={() => toggleReveal(block.id)}
                />
            </div>
        );
    }

    function renderTrueFalse(block) {
        const value = answers[block.id];

        return (
            <div className="preview_exercise_block">
                <ExerciseHeader block={block} label="True or false" />
                <h3>{block.content?.statement || "Untitled statement"}</h3>

                <div className="preview_true_false">
                    {[true, false].map((answer) => (
                        <button
                            key={String(answer)}
                            type="button"
                            className={value === answer ? "selected" : ""}
                            onClick={() => setBlockAnswer(block.id, answer)}
                        >
                            <i
                                className={`fa-solid ${
                                    answer ? "fa-check" : "fa-xmark"
                                }`}
                            />
                            {answer ? "True" : "False"}
                        </button>
                    ))}
                </div>

                <ExerciseReveal
                    block={block}
                    revealed={revealed[block.id]}
                    onToggle={() => toggleReveal(block.id)}
                />
            </div>
        );
    }

    function renderShortAnswer(block) {
        return (
            <div className="preview_exercise_block">
                <ExerciseHeader block={block} label="Short answer" />
                <h3>{block.content?.question || "Untitled question"}</h3>
                <input
                    className="preview_answer_input"
                    value={answers[block.id] || ""}
                    onChange={(event) =>
                        setBlockAnswer(block.id, event.target.value)
                    }
                    placeholder="Write your answer..."
                />
                <ExerciseReveal
                    block={block}
                    revealed={revealed[block.id]}
                    onToggle={() => toggleReveal(block.id)}
                />
            </div>
        );
    }

    function renderFillBlanks(block) {
        const template = block.content?.text || "{{blank}}";
        const segments = template.split(/(\{\{blank\}\})/g);
        const values = Array.isArray(answers[block.id])
            ? answers[block.id]
            : [];
        const wordBank = Array.isArray(block.content?.wordBank) ? block.content.wordBank.filter(Boolean) : [];
        let blankIndex = -1;

        return (
            <div className="preview_exercise_block">
                <ExerciseHeader block={block} label="Fill in the blanks" />
                {wordBank.length > 0 && <div className="learner_word_bank" aria-label="Word bank">{wordBank.map((option,index)=><button type="button" key={`${option}-${index}`} onClick={()=>{const next=[...values];const count=(template.match(/\{\{blank\}\}/g)||[]).length;const emptyIndex=Array.from({length:count}).findIndex((_,answerIndex)=>!next[answerIndex]);if(emptyIndex>=0){next[emptyIndex]=option;setBlockAnswer(block.id,next)}}}>{option}</button>)}</div>}
                <div className="preview_fill_sentence">
                    {segments.map((segment, index) => {
                        if (segment !== "{{blank}}") {
                            return <span key={index}>{segment}</span>;
                        }

                        blankIndex += 1;
                        const currentBlank = blankIndex;

                        return (
                            <input
                                key={index}
                                value={values[currentBlank] || ""}
                                onChange={(event) => {
                                    const next = [...values];
                                    next[currentBlank] = event.target.value;
                                    setBlockAnswer(block.id, next);
                                }}
                                aria-label={`Blank ${currentBlank + 1}`}
                            />
                        );
                    })}
                </div>
                <ExerciseReveal
                    block={block}
                    revealed={revealed[block.id]}
                    onToggle={() => toggleReveal(block.id)}
                />
            </div>
        );
    }

    function renderMatching(block) {
        const pairs = block.content?.pairs || [];

        return (
            <div className="preview_exercise_block">
                <ExerciseHeader block={block} label="Matching" />
                {pairs.some(pair=>pair.rightImageUrl)&&<div className="learner_matching_visual_bank">{pairs.map((pair,index)=>pair.rightImageUrl&&<figure key={pair.id||index}><span>{String.fromCharCode(65+index)}</span><img src={pair.rightImageUrl} alt={pair.rightAlt||pair.right||""}/>{pair.right&&<figcaption>{pair.right}</figcaption>}</figure>)}</div>}
                <div className="preview_matching_grid">
                    {pairs.map((pair, index) => (
                        <div key={pair.id || index}>
                            <span>{pair.leftImageUrl&&<img className="learner_exercise_item_image" src={pair.leftImageUrl} alt={pair.leftAlt||pair.left||""}/>} {pair.left || (!pair.leftImageUrl?`Item ${index + 1}`:"")}</span>
                            <i className="fa-solid fa-arrow-right" />
                            <select
                                value={answers[block.id]?.[pair.id] || ""}
                                onChange={(event) =>
                                    setBlockAnswer(block.id, {
                                        ...(answers[block.id] || {}),
                                        [pair.id]: event.target.value,
                                    })
                                }
                            >
                                <option value="">Choose a match</option>
                                {pairs.map((choice) => (
                                    <option
                                        key={choice.id}
                                        value={choice.id}
                                    >
                                        {choice.right || "Untitled"}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
                <ExerciseReveal
                    block={block}
                    revealed={revealed[block.id]}
                    onToggle={() => toggleReveal(block.id)}
                />
            </div>
        );
    }

    function renderClassification(block) {
        const items=block.content?.items||[],categories=block.content?.categories||[],values=answers[block.id]||{};
        return <div className="preview_exercise_block"><ExerciseHeader block={block} label="Classification"/><h3>{block.content?.prompt||"Classify each item"}</h3><div className="preview_matching_grid">{items.map((item,index)=><div key={item.id||index}><span>{item.imageUrl&&<img className="learner_exercise_item_image" src={item.imageUrl} alt={item.alt||item.text||""}/>} {item.text||(!item.imageUrl?`Item ${index+1}`:"")}</span><i className="fa-solid fa-arrow-right"/><select value={values[item.id]||""} onChange={event=>setBlockAnswer(block.id,{...values,[item.id]:event.target.value})}><option value="">Choose a category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.label}</option>)}</select></div>)}</div><ExerciseReveal block={block} revealed={revealed[block.id]} onToggle={()=>toggleReveal(block.id)}/></div>;
    }

    function renderOrdering(block) {
        const sourceItems = block.content?.items || [];
        const ordered = answers[block.id] || sourceItems;

        function move(index, direction) {
            const target = index + direction;
            if (target < 0 || target >= ordered.length) return;

            const next = [...ordered];
            [next[index], next[target]] = [next[target], next[index]];
            setBlockAnswer(block.id, next);
        }

        return (
            <div className="preview_exercise_block">
                <ExerciseHeader block={block} label="Ordering" />
                <h3>{block.content?.prompt || "Put the items in order"}</h3>
                <div className="preview_ordering_list">
                    {ordered.map((item, index) => (
                        <div key={item.id || index}>
                            <span>{index + 1}</span>
                            <strong>{item.text || `Item ${index + 1}`}</strong>
                            <button
                                type="button"
                                onClick={() => move(index, -1)}
                                disabled={index === 0}
                                aria-label="Move up"
                            >
                                <i className="fa-solid fa-arrow-up" />
                            </button>
                            <button
                                type="button"
                                onClick={() => move(index, 1)}
                                disabled={index === ordered.length - 1}
                                aria-label="Move down"
                            >
                                <i className="fa-solid fa-arrow-down" />
                            </button>
                        </div>
                    ))}
                </div>
                <ExerciseReveal
                    block={block}
                    revealed={revealed[block.id]}
                    onToggle={() => toggleReveal(block.id)}
                />
            </div>
        );
    }

    function renderLayout(block) {
        const columns = getChildren(block.id).filter(
            (child) => child.block_type === "COLUMN"
        );

        return (
            <div
                className="preview_layout_block"
                style={{
                    gridTemplateColumns: columns
                        .map(
                            (column) =>
                                `${Number(column.settings?.width) || 50}fr`
                        )
                        .join(" "),
                    gap: getLayoutGap(block.settings?.gap),
                }}
            >
                {columns.map((column) => (
                    <div key={column.id} className="preview_layout_column">
                        {getChildren(column.id).length === 0 ? (
                            <div className="preview_missing_content">
                                <span>This column is empty.</span>
                            </div>
                        ) : (
                            getChildren(column.id).map((child) => (
                                <section
                                    key={child.id}
                                    className={`step_preview_block block_${child.block_type.toLowerCase()}`}
                                >
                                    {renderBlock(child)}
                                </section>
                            ))
                        )}
                    </div>
                ))}
            </div>
        );
    }

    function renderBlock(block) {
        switch (block.block_type) {
            case "HEADING":
                return renderHeading(block);
            case "TEXT":
                return renderText(block);
            case "QUOTE":
                return (
                    <blockquote className="preview_quote_block">
                        <i className="fa-solid fa-quote-left" />
                        <p>{block.content?.text || "No quote has been added."}</p>
                        {block.content?.author && (
                            <footer>— {block.content.author}</footer>
                        )}
                    </blockquote>
                );
            case "CALLOUT": {
                const variant =
                    block.settings?.variant?.toLowerCase() || "info";
                return (
                    <aside className={`preview_callout_block ${variant}`}>
                        <span className="preview_callout_icon">
                            {block.settings?.icon || "💡"}
                        </span>
                        <p>
                            {block.content?.text ||
                                "No callout content has been added."}
                        </p>
                    </aside>
                );
            }
            case "CODE":
                return (
                    <div className="preview_code_block">
                        <header>
                            <span>{block.settings?.language || "code"}</span>
                            <button
                                type="button"
                                onClick={() =>
                                    navigator.clipboard.writeText(
                                        block.content?.code || ""
                                    )
                                }
                            >
                                <i className="fa-regular fa-copy" /> Copy
                            </button>
                        </header>
                        <pre>
                            <code>
                                {block.content?.code || "// No code has been added"}
                            </code>
                        </pre>
                    </div>
                );
            case "DIVIDER":
                return <hr className="preview_divider_block" />;
            case "IMAGE":
                return renderImage(block);
            case "VIDEO":
                return renderVideo(block);
            case "AUDIO":
                return block.content?.url ? (
                    <audio className="preview_audio_block" controls src={block.content.url} />
                ) : (
                    missingContent("fa-volume-high", "No audio has been added.")
                );
            case "PDF":
                return renderFile(block, true);
            case "FILE":
                return renderFile(block, false);
            case "TABLE":
                return renderTable(block);
            case "WHITEBOARD":
                return <WhiteboardBlock block={block}/>;
            case "EQUATION":
                return <EquationBlock block={block}/>;
            case "BUTTON":
                return <div style={{textAlign:block.settings?.alignment||"left"}}><a className={`preview_button_block ${block.settings?.variant||"primary"}`} href={block.content?.url||"#"} target={block.settings?.openInNewTab!==false?"_blank":undefined} rel="noreferrer">{block.content?.label||"Open link"}</a></div>;
            case "EMBED":
                return block.content?.url?<iframe className="preview_embed_block" style={{height:block.settings?.height||500}} src={block.content.url} title={block.content.title||"Embedded resource"}/>:missingContent("fa-window-maximize","No resource URL has been added.");
            case "CHECKLIST":
            case "FLASHCARDS":
            case "CANVAS":
                return <ContentRenderer blocks={[block]}/>;
            case "LAYOUT":
                return renderLayout(block);
            case "MULTIPLE_CHOICE":
                return renderMultipleChoice(block);
            case "TRUE_FALSE":
                return renderTrueFalse(block);
            case "SHORT_ANSWER":
                return renderShortAnswer(block);
            case "FILL_BLANKS":
                return renderFillBlanks(block);
            case "MATCHING":
                return renderMatching(block);
            case "CLASSIFICATION":
                return renderClassification(block);
            case "ORDERING":
                return renderOrdering(block);
            case "CHALLENGE": {
                const challenge = challenges.find(
                    (item) => item.id === block.content?.challengeId
                );
                return (
                    <div className="preview_challenge_block">
                        <span className="preview_challenge_icon">
                            <i className="fa-solid fa-flag-checkered" />
                        </span>
                        <div>
                            <small>
                                {block.settings?.required === false
                                    ? "Optional Challenge"
                                    : "Required Challenge"}
                            </small>
                            <h3>{challenge?.title || "Linked Challenge"}</h3>
                            <p>
                                {challenge?.description ||
                                    "The learner opens this independent assessment from the Step."}
                            </p>
                            <em>
                                {block.settings?.completionRule === "PASSED"
                                    ? "Must be passed before advancing"
                                    : "At least one attempt is required"}
                            </em>
                        </div>
                        <span className="preview_challenge_action">
                            Open Challenge
                            <i className="fa-solid fa-arrow-right" />
                        </span>
                    </div>
                );
            }
            case "COLUMN":
                return null;
            default:
                return missingContent(
                    "fa-cube",
                    `Unsupported block type: ${block.block_type}`
                );
        }
    }

    function renderStepVisual() {
        if (step?.visual_type === "IMAGE" && step?.image_url) {
            return <img src={step.image_url} alt={step.title} />;
        }

        if (step?.visual_type === "EMOJI" && step?.emoji) {
            return <span>{step.emoji}</span>;
        }

        return (
            <i
                className={`fa-solid ${step?.icon || "fa-file-lines"}`}
            />
        );
    }

    if (loading) {
        return (
            <StudioLayout>
                <div className="step_preview_state">
                    <i className="fa-solid fa-spinner fa-spin" />
                    <h2>Loading preview</h2>
                    <p>Preparing the learner experience...</p>
                </div>
            </StudioLayout>
        );
    }

    if (error) {
        return (
            <StudioLayout>
                <div className="step_preview_state error">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <h2>Could not load the preview</h2>
                    <p>{error}</p>
                    <button type="button" onClick={() => navigate(-1)}>
                        Go back
                    </button>
                </div>
            </StudioLayout>
        );
    }

    return (
        <StudioLayout>
            <main className="step_preview_page">
                <header className="step_preview_topbar">
                    <button
                        type="button"
                        className="step_preview_back"
                        onClick={() => navigate(-1)}
                    >
                        <i className="fa-solid fa-arrow-left" /> Back to editor
                    </button>
                    <div className="step_preview_mode">
                        <i className="fa-regular fa-eye" /> Learner preview
                    </div>
                    <div className="step_preview_actions">
                        <button type="button" className="step_preview_present" onClick={()=>navigate(`/studio/step/${stepId}/present`)} title="Open a distraction-free view for screen sharing">
                            <span className="step_present_icon"><i className="fa-solid fa-play"/></span>
                            <span><strong>Start presentation</strong><small>Teach this Step live</small></span>
                            <i className="fa-solid fa-arrow-up-right-from-square step_present_launch"/>
                        </button>
                        <button type="button" className="step_preview_edit" onClick={() => navigate(`/studio/step/${stepId}`)}><i className="fa-solid fa-pen" /> Edit Step</button>
                    </div>
                </header>

                <article className="step_preview_document">
                    <header className="step_preview_hero">
                        <div
                            className={`step_preview_visual ${
                                step?.visual_type === "IMAGE" ? "has-image" : ""
                            }`}
                            data-color={step?.color || "purple"}
                        >
                            {renderStepVisual()}
                        </div>

                        <div className="step_preview_intro">
                            <div className="step_preview_meta">
                                <span>{step?.status}</span>
                                {step?.estimated_minutes !== null &&
                                    step?.estimated_minutes !== undefined && (
                                        <span>
                                            <i className="fa-regular fa-clock" />{" "}
                                            {step.estimated_minutes} min
                                        </span>
                                    )}
                                {step?.is_preview && (
                                    <span>
                                        <i className="fa-solid fa-unlock" /> Free preview
                                    </span>
                                )}
                            </div>
                            <h1>{step?.title}</h1>
                            {step?.description && <p>{step.description}</p>}
                        </div>
                    </header>

                    <div className="step_preview_content">
                        {visibleRootBlocks.length === 0 ? (
                            <div className="step_preview_empty">
                                <div>
                                    <i className="fa-solid fa-cubes-stacked" />
                                </div>
                                <h2>This Step has no content yet</h2>
                                <p>
                                    Return to the editor and add your first content block.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/studio/step/${stepId}`)}
                                >
                                    <i className="fa-solid fa-plus" /> Add content
                                </button>
                            </div>
                        ) : (
                            visibleRootBlocks.map((block) => (
                                <section
                                    key={block.id}
                                    className={`step_preview_block block_${block.block_type.toLowerCase()}`}
                                >
                                    {renderBlock(block)}
                                </section>
                            ))
                        )}
                    </div>

                    <footer className="step_preview_footer step_preview_navigation">
                        <button type="button" className="step_preview_nav_button previous" disabled={!previousStep} onClick={() => previousStep && navigate(`/studio/step/${previousStep.id}/preview`)}>
                            <i className="fa-solid fa-arrow-left" />
                            <span><small>Previous Step</small><strong>{previousStep?.title || "This is the first Step"}</strong></span>
                        </button>
                        <div className="step_preview_nav_position"><span>{currentStepIndex >= 0 ? currentStepIndex + 1 : "—"} of {journeySteps.length || "—"}</span></div>
                        <button type="button" className="step_preview_nav_button next" disabled={!nextStep} onClick={() => nextStep && navigate(`/studio/step/${nextStep.id}/preview`)}>
                            <span><small>Next Step</small><strong>{nextStep?.title || "This is the last Step"}</strong></span>
                            <i className="fa-solid fa-arrow-right" />
                        </button>
                    </footer>
                </article>
            </main>
        </StudioLayout>
    );
}

function ExerciseHeader({ block, label }) {
    return (
        <div className="preview_exercise_header">
            <span>{label}</span>
            <small>{Number(block.settings?.points) || 1} pts</small>
        </div>
    );
}

function ExerciseReveal({ block, revealed, onToggle }) {
    const explanation = block.content?.explanation;
    const answer = getCorrectAnswer(block);

    if (!answer && !explanation) return null;

    return (
        <div className="preview_exercise_feedback">
            <button type="button" onClick={onToggle}>
                <i className={`fa-solid ${revealed ? "fa-eye-slash" : "fa-eye"}`} />
                {revealed ? "Hide answer" : "Show answer"}
            </button>
            {revealed && (
                <div>
                    {answer && (
                        <p>
                            <strong>Correct answer:</strong> {answer}
                        </p>
                    )}
                    {explanation && <p>{explanation}</p>}
                </div>
            )}
        </div>
    );
}

function getCorrectAnswer(block) {
    switch (block.block_type) {
        case "MULTIPLE_CHOICE":
            return (block.content?.options || [])
                .filter((option) => option.isCorrect)
                .map((option) => option.text)
                .filter(Boolean)
                .join(", ");
        case "TRUE_FALSE":
            return block.content?.correctAnswer === true ? "True" : "False";
        case "SHORT_ANSWER":
        case "FILL_BLANKS":
            return (block.content?.acceptedAnswers || [])
                .filter(Boolean)
                .join(", ");
        case "MATCHING":
            return (block.content?.pairs || [])
                .map((pair) => `${pair.left} → ${pair.right}`)
                .join("; ");
        case "CLASSIFICATION":
            return (block.content?.items || []).map((item)=>`${item.text} → ${(block.content?.categories||[]).find(category=>category.id===(item.correctCategoryId||item.categoryId))?.label||""}`).join("; ");
        case "ORDERING":
            return (block.content?.items || [])
                .map((item) => item.text)
                .filter(Boolean)
                .join(" → ");
        default:
            return "";
    }
}

function missingContent(icon, text, regular = false) {
    return (
        <div className="preview_missing_content">
            <i className={`${regular ? "fa-regular" : "fa-solid"} ${icon}`} />
            <span>{text}</span>
        </div>
    );
}

function getLayoutGap(gap) {
    const gaps = {
        SMALL: "12px",
        MEDIUM: "20px",
        LARGE: "32px",
    };

    return gaps[gap] || gaps.MEDIUM;
}

function formatFileSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) return "File";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getYouTubeVideoId(url) {
    try {
        const parsedUrl = new URL(url);

        if (parsedUrl.hostname.includes("youtu.be")) {
            return parsedUrl.pathname.slice(1);
        }

        if (parsedUrl.hostname.includes("youtube.com")) {
            return (
                parsedUrl.searchParams.get("v") ||
                parsedUrl.pathname.split("/").filter(Boolean).pop()
            );
        }

        return null;
    } catch {
        return null;
    }
}

function orderJourneySteps(stages, steps) {
    const childrenByParent = new Map();
    stages.forEach((stage) => {
        const parent = stage.parent_stage_id || null;
        if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
        childrenByParent.get(parent).push(stage);
    });
    childrenByParent.forEach((children) => children.sort((a, b) => Number(a.position) - Number(b.position)));
    const stepsByStage = new Map();
    steps.forEach((item) => {
        if (!stepsByStage.has(item.stage_id)) stepsByStage.set(item.stage_id, []);
        stepsByStage.get(item.stage_id).push(item);
    });
    stepsByStage.forEach((items) => items.sort((a, b) => Number(a.position) - Number(b.position)));
    const ordered = [];
    function visit(parentId) {
        (childrenByParent.get(parentId) || []).forEach((stage) => {
            ordered.push(...(stepsByStage.get(stage.id) || []));
            visit(stage.id);
        });
    }
    visit(null);
    return ordered;
}
