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
import SortableLayoutBlock from "./SortableLayoutBlock";

export default function BlockTree({
    blocks,
    onUpdate,
    onDelete,
    onReplace,
    onReorder,
    onAddBlock,
    availableChallenges,
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function getSiblingBlocks(parentBlockId) {
        return blocks
            .filter(
                (block) =>
                    (block.parent_block_id ?? null) ===
                        parentBlockId &&
                    block.block_type !== "COLUMN"
            )
            .sort((a, b) => a.position - b.position);
    }

    async function handleDragEnd(event) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const activeParentId =
            active.data.current?.parentBlockId ?? null;

        const overParentId =
            over.data.current?.parentBlockId ?? null;

        /*
         * Por ahora solo permitimos reordenar hermanos.
         * No movemos bloques entre columnas.
         */
        if (activeParentId !== overParentId) {
            return;
        }

        const siblingBlocks =
            getSiblingBlocks(activeParentId);

        const oldIndex = siblingBlocks.findIndex(
            (block) => block.id === active.id
        );

        const newIndex = siblingBlocks.findIndex(
            (block) => block.id === over.id
        );

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const reorderedBlocks = arrayMove(
            siblingBlocks,
            oldIndex,
            newIndex
        );

        await onReorder({
            parentBlockId: activeParentId,
            reorderedBlocks,
        });
    }

    const rootBlocks = getSiblingBlocks(null);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <BlockGroup
                groupBlocks={rootBlocks}
                allBlocks={blocks}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onReplace={onReplace}
                onAddBlock={onAddBlock}
                availableChallenges={availableChallenges}
            />
        </DndContext>
    );
}

function BlockGroup({
    groupBlocks,
    allBlocks,
    onUpdate,
    onDelete,
    onReplace,
    onAddBlock,
    availableChallenges,
}) {
    return (
        <SortableContext
            items={groupBlocks.map((block) => block.id)}
            strategy={verticalListSortingStrategy}
        >
            <div className="step_blocks_list">
                {groupBlocks.map((block) =>
                    block.block_type === "LAYOUT" ? (
                        <SortableLayoutBlock
                            key={block.id}
                            layout={block}
                            blocks={allBlocks}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onReplace={onReplace}
                            onAddBlock={onAddBlock}
                            availableChallenges={availableChallenges}
                        />
                    ) : (
                        <SortableBlock
                            key={block.id}
                            block={block}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            onReplace={onReplace}
                            availableChallenges={availableChallenges}
                        />
                    )
                )}
            </div>
        </SortableContext>
    );
}

export { BlockGroup };
