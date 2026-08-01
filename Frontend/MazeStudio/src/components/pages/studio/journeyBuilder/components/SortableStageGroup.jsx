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

import BuilderStage from "./BuilderStage";

export default function SortableStageGroup({
    stages,
    level,
    parentStageId,
    getChildStages,
    getStageSteps,
    onCreateStage,
    onCreateStep,
    onDeleteStep,
    onUpdateStage,
    onDeleteStage,
    onReorderStages,
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

    async function handleDragEnd(event) {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = stages.findIndex(
            (stage) => stage.id === active.id
        );

        const newIndex = stages.findIndex(
            (stage) => stage.id === over.id
        );

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const reorderedStages = arrayMove(
            stages,
            oldIndex,
            newIndex
        );

        await onReorderStages({
            parentStageId,
            reorderedStages,
        });
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={stages.map((stage) => stage.id)}
                strategy={verticalListSortingStrategy}
            >
                {stages.map((stage) => (
                    <BuilderStage
                        key={stage.id}
                        stage={stage}
                        level={level}
                        getChildStages={getChildStages}
                        getStageSteps={getStageSteps}
                        onCreateStage={onCreateStage}
                        onCreateStep={onCreateStep}
                        onDeleteStep={onDeleteStep}
                        onUpdateStage={onUpdateStage}
                        onDeleteStage={onDeleteStage}
                        onReorderStages={onReorderStages}
                    />
                ))}
            </SortableContext>
        </DndContext>
    );
}
