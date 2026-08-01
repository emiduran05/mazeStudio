import { useState } from "react";
import { Link } from "react-router-dom";
import { checkExerciseAnswer } from "../../api/enrollmentApi";
import "./ContentRenderer.css";

export default function ContentRenderer({ blocks = [], privateStepAccess = null }) {
    const childrenByParent = new Map();

    for (const block of blocks) {
        const parentKey = block.parent_block_id || "root";
        const children = childrenByParent.get(parentKey) || [];
        children.push(block);
        childrenByParent.set(parentKey, children);
    }

    function renderChildren(parentId = null) {
        return (childrenByParent.get(parentId || "root") || []).map((block) => (
            <section
                className={`learner_content_block block_${block.block_type.toLowerCase()}`}
                key={block.id}
            >
                <ContentBlock
                    block={block}
                    renderChildren={renderChildren}
                    privateStepAccess={privateStepAccess}
                />
            </section>
        ));
    }

    return <div className="learner_content_renderer">{renderChildren()}</div>;
}

function ContentBlock({ block, renderChildren, privateStepAccess }) {
    const content = block.content || {};
    const settings = block.settings || {};

    switch (block.block_type) {
        case "HEADING": {
            const level = Math.min(Math.max(Number(settings.level) || 2, 2), 4);
            const Tag = `h${level}`;
            return <Tag>{content.text || "Untitled section"}</Tag>;
        }
        case "TEXT":
            return <p>{content.text || ""}</p>;
        case "QUOTE":
            return (
                <blockquote>
                    <p>{content.text}</p>
                    {content.author && <footer>— {content.author}</footer>}
                </blockquote>
            );
        case "CALLOUT":
            return <aside>{content.text}</aside>;
        case "CODE":
            return <pre><code>{content.code || ""}</code></pre>;
        case "DIVIDER":
            return <hr />;
        case "IMAGE":
            return content.url ? (
                <figure>
                    <img src={content.url} alt={content.alt || ""} />
                    {content.caption && <figcaption>{content.caption}</figcaption>}
                </figure>
            ) : null;
        case "VIDEO":
            return content.url ? <video controls src={content.url} /> : null;
        case "AUDIO":
            return content.url ? <audio controls src={content.url} /> : null;
        case "PDF":
        case "FILE":
            return content.url ? (
                <a href={content.url} target="_blank" rel="noreferrer">
                    {content.name || "Open resource"}
                </a>
            ) : null;
        case "TABLE":
            return (
                <table>
                    <tbody>
                        {(content.rows || []).map((row, rowIndex) => (
                            <tr key={row.id || rowIndex}>
                                {(row.cells || row || []).map((cell, cellIndex) => {
                                    const isCellObject =
                                        cell !== null &&
                                        typeof cell === "object";
                                    const CellTag =
                                        isCellObject && cell.isHeader
                                            ? "th"
                                            : "td";
                                    const value = isCellObject
                                        ? cell.value ?? cell.text ?? ""
                                        : cell;

                                    return (
                                        <CellTag
                                            key={
                                                isCellObject
                                                    ? cell.id || cellIndex
                                                    : cellIndex
                                            }
                                        >
                                            {value}
                                        </CellTag>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        case "LAYOUT":
            return <div className="learner_content_layout">{renderChildren(block.id)}</div>;
        case "COLUMN":
            return <div className="learner_content_column">{renderChildren(block.id)}</div>;
        case "BUTTON":
            return (
                <a className="student_primary_link" href={content.url || "#"}>
                    {content.text || content.label || "Open link"}
                </a>
            );
        case "EMBED":
            return content.url ? (
                <iframe src={content.url} title={content.title || "Embedded content"} />
            ) : null;
        case "CHALLENGE": {
            const passed = content.progressStatus === "PASSED";
            const submitted =
                Boolean(content.progressStatus) &&
                content.progressStatus !== "NOT_STARTED";
            const complete = settings.completionRule === "PASSED"
                ? passed
                : submitted;
            return (
                <div className={`learner_embedded_challenge ${complete ? "passed" : ""}`}>
                    <div className="learner_embedded_challenge_icon">
                        <i className={`fa-solid ${complete ? "fa-circle-check" : "fa-flag-checkered"}`} />
                    </div>
                    <div>
                        <span>{settings.required !== false ? "Required Challenge" : "Optional Challenge"}</span>
                        <h3>{content.title || "Challenge"}</h3>
                        {content.description && <p>{content.description}</p>}
                        <small>
                            {complete
                                ? `${passed ? "Passed" : "Attempt submitted"}${content.bestPercentage != null ? ` · ${content.bestPercentage}%` : ""}`
                                : settings.completionRule === "PASSED"
                                  ? "Pass this Challenge to continue"
                                  : "Submit this Challenge to continue"}
                        </small>
                    </div>
                    {privateStepAccess ? (
                        <span className="learner_embedded_challenge_private">
                            {complete
                                ? "Challenge requirement completed"
                                : "Use the private Challenge link provided by your educator"}
                        </span>
                    ) : (
                        <Link
                            to={`/learn/challenges/${content.challengeId}`}
                            state={{ from: window.location.pathname }}
                        >
                            {complete ? "Review Challenge" : "Open Challenge"}
                            <i className="fa-solid fa-arrow-right" />
                        </Link>
                    )}
                </div>
            );
        }
        case "MULTIPLE_CHOICE":
        case "TRUE_FALSE":
        case "SHORT_ANSWER":
        case "FILL_BLANKS":
        case "MATCHING":
        case "ORDERING":
            return <ExerciseBlock block={block} privateStepAccess={privateStepAccess} />;
        default:
            return null;
    }
}

function ExerciseBlock({ block, privateStepAccess }) {
    const [answer, setAnswer] = useState(
        block.block_type === "ORDERING"
            ? block.content?.items || []
            : block.block_type === "MULTIPLE_CHOICE" &&
                block.settings?.allowMultiple
              ? []
              : ""
    );
    const content = block.content || {};
    const settings = block.settings || {};
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);

    async function checkAnswer() {
        setChecking(true);
        setResult(null);
        setShowAnswer(false);

        try {
            setResult(privateStepAccess
                ? await privateStepAccess.checkAnswer(block.id, answer)
                : await checkExerciseAnswer(block.id, answer));
        } catch (error) {
            setResult({
                error: error.message || "Could not check this answer.",
            });
        } finally {
            setChecking(false);
        }
    }

    const exerciseProps = {
        points: settings.points,
        checking,
        result,
        showAnswer,
        onCheck: checkAnswer,
        onToggleAnswer: () => setShowAnswer((current) => !current),
    };

    if (block.block_type === "MULTIPLE_CHOICE") {
        const options = content.options || [];
        const allowMultiple = Boolean(settings.allowMultiple);

        function selectOption(optionId) {
            if (!allowMultiple) {
                setAnswer(optionId);
                return;
            }

            const selected = Array.isArray(answer) ? answer : [];
            setAnswer(
                selected.includes(optionId)
                    ? selected.filter((id) => id !== optionId)
                    : [...selected, optionId]
            );
        }

        return (
            <ExerciseShell label="Multiple choice" {...exerciseProps}>
                <h3>{content.question || "Choose an answer"}</h3>
                <div className="learner_choice_list">
                    {options.map((option, index) => {
                        const selected = allowMultiple
                            ? answer.includes?.(option.id)
                            : answer === option.id;

                        return (
                            <button
                                key={option.id || index}
                                type="button"
                                className={selected ? "selected" : ""}
                                onClick={() => selectOption(option.id)}
                            >
                                <span>{String.fromCharCode(65 + index)}</span>
                                {option.text || `Option ${index + 1}`}
                            </button>
                        );
                    })}
                </div>
            </ExerciseShell>
        );
    }

    if (block.block_type === "TRUE_FALSE") {
        return (
            <ExerciseShell label="True or false" {...exerciseProps}>
                <h3>{content.statement || "Choose true or false"}</h3>
                <div className="learner_true_false">
                    {[true, false].map((value) => (
                        <button
                            key={String(value)}
                            type="button"
                            className={answer === value ? "selected" : ""}
                            onClick={() => setAnswer(value)}
                        >
                            <i className={`fa-solid ${value ? "fa-check" : "fa-xmark"}`} />
                            {value ? "True" : "False"}
                        </button>
                    ))}
                </div>
            </ExerciseShell>
        );
    }

    if (block.block_type === "SHORT_ANSWER") {
        return (
            <ExerciseShell label="Short answer" {...exerciseProps}>
                <h3>{content.question || "Write your answer"}</h3>
                <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Write your answer..."
                />
            </ExerciseShell>
        );
    }

    if (block.block_type === "FILL_BLANKS") {
        const segments = (content.text || "{{blank}}").split(/(\{\{blank\}\})/g);
        const values = Array.isArray(answer) ? answer : [];
        return (
            <ExerciseShell label="Fill in the blanks" {...exerciseProps}>
                <div className="learner_fill_sentence">
                    {segments.map((segment, index) => {
                        if (segment !== "{{blank}}") {
                            return <span key={index}>{segment}</span>;
                        }

                        const currentBlank = segments
                            .slice(0, index)
                            .filter((item) => item === "{{blank}}")
                            .length;

                        return (
                            <input
                                key={index}
                                value={values[currentBlank] || ""}
                                aria-label={`Blank ${currentBlank + 1}`}
                                onChange={(event) => {
                                    const next = [...values];
                                    next[currentBlank] = event.target.value;
                                    setAnswer(next);
                                }}
                            />
                        );
                    })}
                </div>
            </ExerciseShell>
        );
    }

    if (block.block_type === "MATCHING") {
        const pairs = content.pairs || [];
        const values = answer && typeof answer === "object" ? answer : {};

        return (
            <ExerciseShell label="Matching" {...exerciseProps}>
                <div className="learner_matching_grid">
                    {pairs.map((pair, index) => (
                        <label key={pair.id || index}>
                            <span>{pair.left || `Item ${index + 1}`}</span>
                            <select
                                value={values[pair.id] || ""}
                                onChange={(event) =>
                                    setAnswer({
                                        ...values,
                                        [pair.id]: event.target.value,
                                    })
                                }
                            >
                                <option value="">Choose a match</option>
                                {pairs.map((choice, choiceIndex) => (
                                    <option
                                        key={choice.id || choiceIndex}
                                        value={choice.id}
                                    >
                                        {choice.right || `Option ${choiceIndex + 1}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ))}
                </div>
            </ExerciseShell>
        );
    }

    const items = Array.isArray(answer) ? answer : content.items || [];

    function moveItem(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= items.length) return;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        setAnswer(next);
    }

    return (
        <ExerciseShell label="Ordering" {...exerciseProps}>
            <h3>{content.prompt || "Put the items in order"}</h3>
            <div className="learner_ordering_list">
                {items.map((item, index) => (
                    <div key={item.id || index}>
                        <span>{index + 1}</span>
                        <strong>{item.text || `Item ${index + 1}`}</strong>
                        <button
                            type="button"
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0}
                            aria-label="Move up"
                        >
                            <i className="fa-solid fa-arrow-up" />
                        </button>
                        <button
                            type="button"
                            onClick={() => moveItem(index, 1)}
                            disabled={index === items.length - 1}
                            aria-label="Move down"
                        >
                            <i className="fa-solid fa-arrow-down" />
                        </button>
                    </div>
                ))}
            </div>
        </ExerciseShell>
    );
}

function ExerciseShell({
    label,
    points,
    checking,
    result,
    showAnswer,
    onCheck,
    onToggleAnswer,
    children,
}) {
    return (
        <div className="learner_exercise_block">
            <header>
                <span>{label}</span>
                <small>{Number(points) || 1} pts</small>
            </header>
            {children}
            <div className="learner_exercise_actions">
                <button type="button" onClick={onCheck} disabled={checking}>
                    <i className="fa-solid fa-check-double" />
                    {checking ? "Checking..." : "Check answer"}
                </button>

                {result && !result.error && (
                    <button
                        type="button"
                        className="secondary"
                        onClick={onToggleAnswer}
                    >
                        <i className={`fa-solid ${showAnswer ? "fa-eye-slash" : "fa-eye"}`} />
                        {showAnswer ? "Hide answer" : "View answer"}
                    </button>
                )}
            </div>

            {result && (
                <div
                    className={[
                        "learner_exercise_feedback",
                        result.error
                            ? "error"
                            : result.correct
                              ? "correct"
                              : "incorrect",
                    ].join(" ")}
                    role="status"
                >
                    <strong>
                        {result.error
                            ? "Could not check answer"
                            : result.correct
                              ? "Correct!"
                              : "Not quite yet"}
                    </strong>
                    {result.error && <p>{result.error}</p>}
                    {showAnswer && result.correctAnswer && (
                        <p>
                            <strong>Answer:</strong> {result.correctAnswer}
                        </p>
                    )}
                    {showAnswer && result.explanation && (
                        <p>{result.explanation}</p>
                    )}
                </div>
            )}
        </div>
    );
}
