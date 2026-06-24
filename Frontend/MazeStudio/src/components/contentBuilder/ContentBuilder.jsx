import { useState } from "react";
import "./ContentBuilder.css";

const blockOptions = [
    { type: "rich_text", label: "Text block", icon: "fa-align-left" },
    { type: "image", label: "Image", icon: "fa-image" },
    { type: "file", label: "File", icon: "fa-paperclip" },
    { type: "table", label: "Table", icon: "fa-table" },
    { type: "multiple_choice", label: "Multiple choice", icon: "fa-list-check" },
    { type: "fill_blank", label: "Fill in the blank", icon: "fa-pen" },
    { type: "open_question", label: "Open question", icon: "fa-message" }
];

export default function ContentBuilder() {
    const [title, setTitle] = useState("Lesson: Spanish Greetings");
    const [blocks, setBlocks] = useState([]);
    const [showMenu, setShowMenu] = useState(false);

    const addBlock = (type) => {
        const newBlock = {
            id: Date.now(),
            type,
            content: getDefaultContent(type)
        };

        setBlocks([...blocks, newBlock]);
        setShowMenu(false);
    };

    const getDefaultContent = (type) => {
        if (type === "rich_text") {
            return "<h2>New section</h2><p>Start writing your lesson here...</p>";
        }

        if (type === "image") return { url: "", caption: "" };

        if (type === "file") return { name: "", url: "" };

        if (type === "table") {
            return {
                rows: 2,
                cols: 2,
                cells: [
                    ["Concept", "Example"],
                    ["Greeting", "Hola"]
                ]
            };
        }

        if (type === "multiple_choice") {
            return {
                question: "Choose the correct answer",
                options: ["Option A", "Option B", "Option C"],
                correctIndex: 0
            };
        }

        if (type === "fill_blank") {
            return {
                sentence: "Hola, mi nombre es ____.",
                answer: "Juan"
            };
        }

        if (type === "open_question") {
            return {
                question: "Write a short introduction about yourself."
            };
        }

        return "";
    };

    const updateBlockContent = (id, content) => {
        setBlocks(
            blocks.map((block) =>
                block.id === id ? { ...block, content } : block
            )
        );
    };

    const deleteBlock = (id) => {
        setBlocks(blocks.filter((block) => block.id !== id));
    };

    return (
        <div className="content_builder_page">
            <header className="builder_header">
                <div>
                    <span className="builder_badge">Stage Content Builder</span>

                    <input
                        className="builder_title_input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="builder_actions">
                    <button className="btn_secondary">Save draft</button>
                    <button className="btn_primary">Publish</button>
                </div>
            </header>

            <section className="builder_layout">
                <main className="editor_canvas">
                    {blocks.length === 0 && (
                        <div className="empty_editor">
                            <i className="fa-solid fa-layer-group"></i>
                            <h2>Build this stage content</h2>
                            <p>
                                Add text, tables, files, images or interactive practice blocks.
                            </p>
                        </div>
                    )}

                    {blocks.map((block) => (
                        <div className="editor_block" key={block.id}>
                            <div className="block_topbar">
                                <span>{formatBlockName(block.type)}</span>

                                <button onClick={() => deleteBlock(block.id)}>
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                            </div>

                            <BlockEditor
                                block={block}
                                updateContent={(content) =>
                                    updateBlockContent(block.id, content)
                                }
                            />
                        </div>
                    ))}

                    <div className="add_block_area">
                        <button
                            className="add_block_btn"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add block
                        </button>

                        {showMenu && (
                            <div className="block_menu">
                                {blockOptions.map((option) => (
                                    <button
                                        key={option.type}
                                        onClick={() => addBlock(option.type)}
                                    >
                                        <i className={`fa-solid ${option.icon}`}></i>
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                <aside className="preview_panel">
                    <div className="preview_header">
                        <span>Student Preview</span>
                        <strong>{title}</strong>
                    </div>

                    <div className="preview_card">
                        {blocks.length === 0 ? (
                            <p className="preview_empty">No content yet.</p>
                        ) : (
                            blocks.map((block) => (
                                <BlockPreview block={block} key={block.id} />
                            ))
                        )}
                    </div>
                </aside>
            </section>
        </div>
    );
}

function BlockEditor({ block, updateContent }) {
    if (block.type === "rich_text") {
        return (
            <div className="rich_text_editor">
                <RichTextToolbar />

                <div
                    className="rich_text_area"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: block.content }}
                    onInput={(e) => updateContent(e.currentTarget.innerHTML)}
                />
            </div>
        );
    }

    if (block.type === "image") {
        return (
            <div className="block_form">
                <input
                    placeholder="Image URL"
                    value={block.content.url}
                    onChange={(e) =>
                        updateContent({ ...block.content, url: e.target.value })
                    }
                />

                <input
                    placeholder="Image caption"
                    value={block.content.caption}
                    onChange={(e) =>
                        updateContent({ ...block.content, caption: e.target.value })
                    }
                />
            </div>
        );
    }

    if (block.type === "file") {
        return (
            <div className="block_form">
                <input
                    placeholder="File name"
                    value={block.content.name}
                    onChange={(e) =>
                        updateContent({ ...block.content, name: e.target.value })
                    }
                />

                <input
                    placeholder="File URL"
                    value={block.content.url}
                    onChange={(e) =>
                        updateContent({ ...block.content, url: e.target.value })
                    }
                />
            </div>
        );
    }

    if (block.type === "table") {
        return <TableEditor block={block} updateContent={updateContent} />;
    }

    if (block.type === "multiple_choice") {
        return (
            <div className="block_form">
                <input
                    placeholder="Question"
                    value={block.content.question}
                    onChange={(e) =>
                        updateContent({
                            ...block.content,
                            question: e.target.value
                        })
                    }
                />

                {block.content.options.map((option, index) => (
                    <div className="option_row" key={index}>
                        <input
                            type="radio"
                            name={`correct-${block.id}`}
                            checked={block.content.correctIndex === index}
                            onChange={() =>
                                updateContent({
                                    ...block.content,
                                    correctIndex: index
                                })
                            }
                        />

                        <input
                            value={option}
                            placeholder={`Option ${index + 1}`}
                            onChange={(e) => {
                                const options = [...block.content.options];
                                options[index] = e.target.value;

                                updateContent({
                                    ...block.content,
                                    options
                                });
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => {
                                const options = block.content.options.filter(
                                    (_, i) => i !== index
                                );

                                updateContent({
                                    ...block.content,
                                    options,
                                    correctIndex: Math.max(0, block.content.correctIndex - 1)
                                });
                            }}
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                ))}

                <button
                    className="small_action_btn"
                    type="button"
                    onClick={() =>
                        updateContent({
                            ...block.content,
                            options: [...block.content.options, "New option"]
                        })
                    }
                >
                    + Add option
                </button>
            </div>
        );
    }

    if (block.type === "fill_blank") {
        return (
            <div className="block_form">
                <input
                    value={block.content.sentence}
                    placeholder="Sentence with blank. Example: I am from ____."
                    onChange={(e) =>
                        updateContent({
                            ...block.content,
                            sentence: e.target.value
                        })
                    }
                />

                <input
                    value={block.content.answer}
                    placeholder="Correct answer"
                    onChange={(e) =>
                        updateContent({
                            ...block.content,
                            answer: e.target.value
                        })
                    }
                />
            </div>
        );
    }

    if (block.type === "open_question") {
        return (
            <div className="block_form">
                <textarea
                    value={block.content.question}
                    placeholder="Write the question"
                    onChange={(e) =>
                        updateContent({
                            ...block.content,
                            question: e.target.value
                        })
                    }
                />
            </div>
        );
    }

    return null;
}

function RichTextToolbar() {
    const applyCommand = (command, value = null) => {
        document.execCommand(command, false, value);
    };

    return (
        <div className="rich_toolbar">
            <button onClick={() => applyCommand("bold")}>
                <i className="fa-solid fa-bold"></i>
            </button>

            <button onClick={() => applyCommand("italic")}>
                <i className="fa-solid fa-italic"></i>
            </button>

            <button onClick={() => applyCommand("underline")}>
                <i className="fa-solid fa-underline"></i>
            </button>

            <button onClick={() => applyCommand("insertUnorderedList")}>
                <i className="fa-solid fa-list-ul"></i>
            </button>

            <button onClick={() => applyCommand("insertOrderedList")}>
                <i className="fa-solid fa-list-ol"></i>
            </button>

            <select onChange={(e) => applyCommand("formatBlock", e.target.value)}>
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
            </select>

            <input
                type="color"
                onChange={(e) => applyCommand("foreColor", e.target.value)}
            />

            <select onChange={(e) => applyCommand("fontSize", e.target.value)}>
                <option value="3">Normal</option>
                <option value="4">Large</option>
                <option value="5">Huge</option>
            </select>
        </div>
    );
}

function TableEditor({ block, updateContent }) {
    const resizeTable = (rows, cols) => {
        const newCells = [];

        for (let r = 0; r < rows; r++) {
            const row = [];

            for (let c = 0; c < cols; c++) {
                row.push(block.content.cells[r]?.[c] || "");
            }

            newCells.push(row);
        }

        updateContent({
            ...block.content,
            rows,
            cols,
            cells: newCells
        });
    };

    const updateCell = (rowIndex, colIndex, value) => {
        const cells = block.content.cells.map((row) => [...row]);
        cells[rowIndex][colIndex] = value;

        updateContent({
            ...block.content,
            cells
        });
    };

    return (
        <div className="table_builder">
            <div className="table_controls">
                <label>
                    Rows
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={block.content.rows}
                        onChange={(e) =>
                            resizeTable(Number(e.target.value), block.content.cols)
                        }
                    />
                </label>

                <label>
                    Columns
                    <input
                        type="number"
                        min="1"
                        max="8"
                        value={block.content.cols}
                        onChange={(e) =>
                            resizeTable(block.content.rows, Number(e.target.value))
                        }
                    />
                </label>
            </div>

            <div
                className="table_grid"
                style={{
                    gridTemplateColumns: `repeat(${block.content.cols}, 1fr)`
                }}
            >
                {block.content.cells.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                        <input
                            key={`${rowIndex}-${colIndex}`}
                            value={cell}
                            onChange={(e) =>
                                updateCell(rowIndex, colIndex, e.target.value)
                            }
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function BlockPreview({ block }) {
    if (block.type === "rich_text") {
        return (
            <div
                className="preview_rich_text"
                dangerouslySetInnerHTML={{ __html: block.content }}
            />
        );
    }

    if (block.type === "image") {
        return (
            <div className="preview_media">
                {block.content.url ? (
                    <img src={block.content.url} alt={block.content.caption || "Content"} />
                ) : (
                    <div className="preview_placeholder">Image preview</div>
                )}

                {block.content.caption && <p>{block.content.caption}</p>}
            </div>
        );
    }

    if (block.type === "file") {
        return (
            <div className="preview_file">
                <i className="fa-solid fa-paperclip"></i>
                <span>{block.content.name || "Attached file"}</span>
            </div>
        );
    }

    if (block.type === "table") {
        return (
            <table className="preview_table">
                <tbody>
                    {block.content.cells.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, colIndex) => (
                                <td key={colIndex}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    if (block.type === "multiple_choice") {
        return (
            <div className="preview_exercise">
                <strong>{block.content.question}</strong>

                {block.content.options.map((option, index) => (
                    <label key={index}>
                        <input type="radio" name={`preview-${block.id}`} />
                        {option}
                    </label>
                ))}
            </div>
        );
    }

    if (block.type === "fill_blank") {
        return (
            <div className="preview_exercise">
                <strong>{block.content.sentence}</strong>
                <input placeholder="Your answer" />
            </div>
        );
    }

    if (block.type === "open_question") {
        return (
            <div className="preview_exercise">
                <strong>{block.content.question}</strong>
                <textarea placeholder="Write your answer..." />
            </div>
        );
    }

    return null;
}

function formatBlockName(type) {
    return type.replace("_", " ");
}