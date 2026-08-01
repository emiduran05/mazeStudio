import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    uploadBlockAsset,
    deleteBlockAsset,
} from "../../../../../api/blockAssetApi";


export default function SortableBlock({
    block,
    onUpdate,
    onDelete,
    onReplace,
    availableChallenges = [],

}) {


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
                return (
                    <textarea
                        className="block_text_editor"
                        value={
                            draftContent.text ??
                            draftContent.html ??
                            ""
                        }
                        onChange={(event) =>
                            setDraftContent({
                                text: event.target.value,
                            })
                        }
                        placeholder="Write your content..."
                        rows={6}
                    />
                );

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

                                <input
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
