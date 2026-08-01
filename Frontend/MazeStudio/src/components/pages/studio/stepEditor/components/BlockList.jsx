import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import SortableBlock from "./SortableBlock";

export default function BlockList({
    blocks,
    onUpdate,
    onDelete,
    onReorder,
    onReplace,
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter:
                sortableKeyboardCoordinates,
        })
    );

    async function handleDragEnd(event) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = blocks.findIndex(
            (block) => block.id === active.id
        );

        const newIndex = blocks.findIndex(
            (block) => block.id === over.id
        );

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const reordered = arrayMove(
            blocks,
            oldIndex,
            newIndex
        );

        await onReorder(reordered);
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={blocks.map((block) => block.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="step_blocks_list">
                    {blocks.map((block) => (
                        <SortableBlock
        key={block.id}
        block={block}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onReplace={onReplace}
    />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}