import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableBlock from "./SortableBlock";

export default function LayoutBlock({
    layout,
    blocks,
    onUpdate,
    onDelete,
    onReplace,
    onAddBlock,
}) {
    const columns = blocks
        .filter(
            (block) =>
                block.parent_block_id === layout.id &&
                block.block_type === "COLUMN"
        )
        .sort((a, b) => a.position - b.position);

    return (
        <article className="step_layout_card">
            <header className="step_layout_header">
                <div>
                    <i className="fa-solid fa-table-columns"></i>
                    <strong>Column layout</strong>
                </div>

                <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(layout)}
                    title="Delete layout"
                >
                    <i className="fa-regular fa-trash-can"></i>
                </button>
            </header>

            <div
                className="step_layout_columns"
                style={{
                    gridTemplateColumns: columns
                        .map(
                            (column) =>
                                `${column.settings?.width || 50}fr`
                        )
                        .join(" "),
                }}
            >
                {columns.map((column) => {
                    const columnBlocks = blocks
                        .filter(
                            (block) =>
                                block.parent_block_id ===
                                    column.id &&
                                block.block_type !== "COLUMN"
                        )
                        .sort(
                            (a, b) =>
                                a.position - b.position
                        );

                    return (
                        <section
                            key={column.id}
                            className="step_layout_column"
                        >
                            {columnBlocks.length === 0 ? (
                                <div className="step_layout_column_empty">
                                    <i className="fa-solid fa-plus"></i>

                                    <span>
                                        Add content to this column
                                    </span>
                                </div>
                            ) : (
                                <SortableContext
                                    items={columnBlocks.map(
                                        (block) => block.id
                                    )}
                                    strategy={
                                        verticalListSortingStrategy
                                    }
                                >
                                    <div className="step_layout_column_blocks">
                                        {columnBlocks.map(
                                            (block) => (
                                                <SortableBlock
                                                    key={block.id}
                                                    block={block}
                                                    onUpdate={
                                                        onUpdate
                                                    }
                                                    onDelete={
                                                        onDelete
                                                    }
                                                    onReplace={
                                                        onReplace
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                </SortableContext>
                            )}

                            <button
                                type="button"
                                className="step_layout_add_block"
                                onClick={() =>
                                    onAddBlock(column.id)
                                }
                            >
                                <i className="fa-solid fa-plus"></i>
                                Add block
                            </button>
                        </section>
                    );
                })}
            </div>
        </article>
    );
}