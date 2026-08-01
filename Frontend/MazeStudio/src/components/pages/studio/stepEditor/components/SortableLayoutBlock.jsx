import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import LayoutBlock from "./LayoutBlock";

export default function SortableLayoutBlock({
    layout,
    blocks,
    onUpdate,
    onDelete,
    onReplace,
    onAddBlock,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: layout.id,
        data: {
            parentBlockId: layout.parent_block_id ?? null,
            blockType: "LAYOUT",
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 30 : "auto",
        position: "relative",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={
                isDragging
                    ? "sortable_layout_wrapper is_dragging"
                    : "sortable_layout_wrapper"
            }
        >
            <button
                type="button"
                className="step_layout_drag_handle"
                {...attributes}
                {...listeners}
                aria-label="Reorder layout"
            >
                <i className="fa-solid fa-grip-vertical"></i>
            </button>

            <LayoutBlock
                layout={layout}
                blocks={blocks}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onReplace={onReplace}
                onAddBlock={onAddBlock}
            />
        </div>
    );
}