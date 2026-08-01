import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../../api/api";
import "./StepPreview.css";

export default function StepPreview() {
    const { stepId } = useParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [challenges, setChallenges] = useState([]);
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

        return (
            <div className="preview_text_block">
                {content
                    .split("\n")
                    .filter((paragraph) => paragraph.trim())
                    .map((paragraph, index) => (
                        <p key={`${block.id}-${index}`}>{paragraph}</p>
                    ))}
            </div>
        );
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
            return missingContent("fa-image", "No image has been added.", true);
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
        let blankIndex = -1;

        return (
            <div className="preview_exercise_block">
                <ExerciseHeader block={block} label="Fill in the blanks" />
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
                <div className="preview_matching_grid">
                    {pairs.map((pair, index) => (
                        <div key={pair.id || index}>
                            <span>{pair.left || `Item ${index + 1}`}</span>
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
            case "BUTTON":
                return (
                    <a
                        className="preview_button_block"
                        href={block.content?.url || "#"}
                        target={
                            block.settings?.openInNewTab ? "_blank" : "_self"
                        }
                        rel="noreferrer"
                    >
                        {block.content?.text ||
                            block.content?.label ||
                            "Open link"}
                    </a>
                );
            case "EMBED":
                return block.content?.url ? (
                    <div className="preview_embed_block">
                        <iframe
                            src={block.content.url}
                            title={block.content?.title || "Embedded content"}
                        />
                    </div>
                ) : (
                    missingContent("fa-code", "No embed URL has been added.")
                );
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
                    <button
                        type="button"
                        className="step_preview_edit"
                        onClick={() => navigate(`/studio/step/${stepId}`)}
                    >
                        <i className="fa-solid fa-pen" /> Edit Step
                    </button>
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
                        {rootBlocks.length === 0 ? (
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
                            rootBlocks.map((block) => (
                                <section
                                    key={block.id}
                                    className={`step_preview_block block_${block.block_type.toLowerCase()}`}
                                >
                                    {renderBlock(block)}
                                </section>
                            ))
                        )}
                    </div>

                    {rootBlocks.length > 0 && (
                        <footer className="step_preview_footer">
                            <div>
                                <i className="fa-solid fa-circle-check" />
                                <span>You have reached the end of this Step.</span>
                            </div>
                            <button type="button">
                                Mark as completed <i className="fa-solid fa-check" />
                            </button>
                        </footer>
                    )}
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
