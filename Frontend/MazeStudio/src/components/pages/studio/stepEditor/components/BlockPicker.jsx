import { useState } from "react";
import {
    blockCategories,
    layoutPresets,
} from "../../../../../data/blockTypes";

export default function BlockPicker({
    isOpen,
    onClose,
    onSelect,
    onSelectLayout,
}) {
    const [showLayouts, setShowLayouts] = useState(false);

    if (!isOpen) return null;

    function closePicker() {
        setShowLayouts(false);
        onClose();
    }

    function handleBlockSelection(blockType) {
        if (blockType === "LAYOUT") {
            setShowLayouts(true);
            return;
        }

        onSelect(blockType);
    }

    return (
        <div
            className="block_picker_backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    closePicker();
                }
            }}
        >
            <div className="block_picker">
                <header className="block_picker_header">
                    <div>
                        <span>Add content</span>

                        <h2>
                            {showLayouts
                                ? "Choose a column layout"
                                : "Choose a block"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={closePicker}
                        aria-label="Close block picker"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </header>

                {showLayouts ? (
                    <div className="layout_preset_grid">
                        {layoutPresets.map((preset) => (
                            <button
                                key={preset.value}
                                type="button"
                                className="layout_preset_item"
                                onClick={() =>
                                    onSelectLayout(preset.value)
                                }
                            >
                                <div
                                    className="layout_preset_preview"
                                    style={{
                                        gridTemplateColumns: preset.columns
                                            .map(
                                                (width) =>
                                                    `${width}fr`
                                            )
                                            .join(" "),
                                    }}
                                >
                                    {preset.columns.map(
                                        (width, index) => (
                                            <span
                                                key={`${preset.value}-${index}`}
                                            />
                                        )
                                    )}
                                </div>

                                <strong>{preset.label}</strong>
                            </button>
                        ))}

                        <button
                            type="button"
                            className="layout_picker_back"
                            onClick={() => setShowLayouts(false)}
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Back to blocks
                        </button>
                    </div>
                ) : (
                    <div className="block_picker_categories">
                        {blockCategories.map((category) => (
                            <section
                                key={category.id}
                                className="block_picker_category"
                            >
                                <h3>{category.label}</h3>

                                <div className="block_picker_grid">
                                    {category.blocks.map((block) => (
                                        <button
                                            key={block.type}
                                            type="button"
                                            className="block_picker_item"
                                            onClick={() =>
                                                handleBlockSelection(
                                                    block.type
                                                )
                                            }
                                        >
                                            <span className="block_picker_icon">
                                                <i
                                                    className={`fa-solid ${block.icon}`}
                                                />
                                            </span>

                                            <span>
                                                <strong>
                                                    {block.label}
                                                </strong>

                                                <small>
                                                    {block.description}
                                                </small>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}