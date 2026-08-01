import { useEffect, useMemo, useState } from "react";
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
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiRequest } from "../../../../../api/api";
import {
    getLearningPathEditor,
    removeLearningPath,
    saveLearningPath,
} from "../../../../../api/learningPathApi";

function learnerName(enrollment) {
    return [enrollment.first_name, enrollment.last_name]
        .filter(Boolean)
        .join(" ") || enrollment.email || "Unnamed Student";
}

export default function JourneyLearningPaths({ journeyId }) {
    const [enrollments, setEnrollments] = useState([]);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
    const [editor, setEditor] = useState(null);
    const [title, setTitle] = useState("Personalized Learning Path");
    const [selected, setSelected] = useState([]);
    const [status, setStatus] = useState("ACTIVE");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [stageFilter, setStageFilter] = useState("ALL");
    const [stepSearch, setStepSearch] = useState("");
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function hydrateEditor(data) {
        setEditor(data);
        setTitle(data.path?.title || "Personalized Learning Path");
        setStatus(data.path?.status || "ACTIVE");
        setSelected(
            data.path?.items?.map((item) => ({
                stepId: item.step_id,
                isRequired: item.is_required,
                unlockRule: item.unlock_rule,
                reason: item.reason || "",
            })) || data.steps.map((step) => ({
                stepId: step.id,
                isRequired: true,
                unlockRule: "PREVIOUS_REQUIRED",
                reason: "",
            }))
        );
    }

    useEffect(() => {
        let active = true;
        apiRequest(`/learning-journeys/${journeyId}/enrollments`)
            .then((data) => {
                if (!active) return;
                const available = (data.enrollments || []).filter(
                    (item) => item.status === "ACTIVE"
                );
                setEnrollments(available);
                setSelectedEnrollmentId(available[0]?.id || "");
            })
            .catch((requestError) => setError(requestError.message))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [journeyId]);

    useEffect(() => {
        if (!selectedEnrollmentId) {
            setEditor(null);
            return;
        }
        let active = true;
        setLoading(true);
        setError("");
        getLearningPathEditor(selectedEnrollmentId)
            .then((data) => {
                if (!active) return;
                hydrateEditor(data);
            })
            .catch((requestError) => setError(requestError.message))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [selectedEnrollmentId]);

    const selectedById = useMemo(
        () => new Map(selected.map((item) => [item.stepId, item])),
        [selected]
    );
    const stepById = useMemo(
        () => new Map((editor?.steps || []).map((step) => [step.id, step])),
        [editor]
    );
    const selectedSteps = useMemo(
        () => selected.map((item) => stepById.get(item.stepId)).filter(Boolean),
        [selected, stepById]
    );
    const availableSteps = useMemo(
        () => (editor?.steps || []).filter((step) => !selectedById.has(step.id)),
        [editor, selectedById]
    );
    const stageOptions = useMemo(() => {
        const stages = new Map();
        for (const step of editor?.steps || []) {
            if (!stages.has(step.stage_id)) {
                stages.set(step.stage_id, step.stage_title);
            }
        }
        return [...stages.entries()].map(([id, title]) => ({ id, title }));
    }, [editor]);
    const filteredAvailableSteps = useMemo(() => {
        const query = stepSearch.trim().toLowerCase();
        return availableSteps.filter((step) => {
            const matchesStage =
                stageFilter === "ALL" || step.stage_id === stageFilter;
            const matchesSearch =
                !query ||
                step.title.toLowerCase().includes(query) ||
                String(step.description || "").toLowerCase().includes(query);
            return matchesStage && matchesSearch;
        });
    }, [availableSteps, stageFilter, stepSearch]);

    function toggleStep(stepId) {
        setSelected((current) =>
            current.some((item) => item.stepId === stepId)
                ? current.filter((item) => item.stepId !== stepId)
                : [...current, {
                    stepId,
                    isRequired: true,
                    unlockRule: "PREVIOUS_REQUIRED",
                    reason: "",
                }]
        );
    }

    function updateItem(stepId, changes) {
        setSelected((current) =>
            current.map((item) =>
                item.stepId === stepId ? { ...item, ...changes } : item
            )
        );
    }

    function handleDragEnd({ active, over }) {
        if (!over || active.id === over.id) return;
        setSelected((current) => {
            const oldIndex = current.findIndex((item) => item.stepId === active.id);
            const newIndex = current.findIndex((item) => item.stepId === over.id);
            if (oldIndex < 0 || newIndex < 0) return current;
            return arrayMove(current, oldIndex, newIndex);
        });
    }

    function addFilteredSteps() {
        setSelected((current) => {
            const existing = new Set(current.map((item) => item.stepId));
            const additions = filteredAvailableSteps
                .filter((step) => !existing.has(step.id))
                .map((step) => ({
                    stepId: step.id,
                    isRequired: true,
                    unlockRule: "PREVIOUS_REQUIRED",
                    reason: "",
                }));
            return [...current, ...additions];
        });
    }

    async function save(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const data = await saveLearningPath(selectedEnrollmentId, {
                title,
                status,
                items: selected,
            });
            hydrateEditor(data);
            setMessage(
                status === "ACTIVE"
                    ? "Learning Path activated for this Student."
                    : "Learning Path saved as a draft."
            );
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    }

    async function resetPath() {
        if (!window.confirm(
            "Remove this personalized path and return the Student to the full Journey?"
        )) return;
        setSaving(true);
        try {
            await removeLearningPath(selectedEnrollmentId);
            const data = await getLearningPathEditor(selectedEnrollmentId);
            setEditor(data);
            setSelected(data.steps.map((step) => ({
                stepId: step.id,
                isRequired: true,
                unlockRule: "PREVIOUS_REQUIRED",
                reason: "",
            })));
            setTitle("Personalized Learning Path");
            setStatus("ACTIVE");
            setMessage("The Student now follows the full Learning Journey.");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="learning_paths_workspace">
            <header className="learning_paths_intro">
                <div>
                    <span>Individual curriculum</span>
                    <h2>Learning Paths</h2>
                    <p>Select which published Steps each Student should follow. Progress remains attached to the original Journey.</p>
                </div>
                <div className="learning_paths_ai_badge">
                    <i className="fa-solid fa-wand-magic-sparkles" />
                    AI diagnostic ready
                    <small>Generation will use this same structure.</small>
                </div>
            </header>

            {error && <div className="journey_students_alert error">{error}</div>}
            {message && <div className="journey_students_alert success">{message}</div>}

            {enrollments.length === 0 && !loading ? (
                <div className="builder_empty_state">
                    <i className="fa-solid fa-user-plus" />
                    <h3>Enroll a Student first</h3>
                    <p>A Learning Path belongs to one Student enrollment.</p>
                </div>
            ) : (
                <form className="learning_path_editor" onSubmit={save}>
                    <aside>
                        <label>Student
                            <select
                                value={selectedEnrollmentId}
                                onChange={(event) =>
                                    setSelectedEnrollmentId(event.target.value)
                                }
                            >
                                {enrollments.map((enrollment) => (
                                    <option key={enrollment.id} value={enrollment.id}>
                                        {learnerName(enrollment)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Path name
                            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
                        </label>
                        <label>Publishing
                            <select value={status} onChange={(event) => setStatus(event.target.value)}>
                                <option value="ACTIVE">Active for Student</option>
                                <option value="DRAFT">Draft</option>
                            </select>
                        </label>
                        <div className="learning_path_summary">
                            <strong>{selected.length}</strong>
                            <span>of {editor?.steps?.length || 0} Steps selected</span>
                        </div>
                        <button className="builder_primary_button" disabled={saving || !selected.length}>
                            {saving ? "Saving…" : "Save Learning Path"}
                        </button>
                        {editor?.path && (
                            <button type="button" className="learning_path_reset" onClick={resetPath} disabled={saving}>
                                Use full Journey
                            </button>
                        )}
                    </aside>

                    <div className="learning_path_steps">
                        <header>
                            <div><strong>Build the recommended route</strong><span>Drag selected Steps to define the Student's order.</span></div>
                            <button type="button" onClick={() =>
                                setSelected((editor?.steps || []).map((step) => ({
                                    stepId: step.id,
                                    isRequired: true,
                                    unlockRule: "PREVIOUS_REQUIRED",
                                    reason: "",
                                })))
                            }>Select all</button>
                        </header>
                        <div className="learning_path_catalog_filters">
                            <label>
                                <span>Filter by Stage</span>
                                <select
                                    value={stageFilter}
                                    onChange={(event) => setStageFilter(event.target.value)}
                                >
                                    <option value="ALL">All Stages</option>
                                    {stageOptions.map((stage) => (
                                        <option key={stage.id} value={stage.id}>
                                            {stage.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="learning_path_step_search">
                                <span>Search Steps</span>
                                <div>
                                    <i className="fa-solid fa-magnifying-glass" />
                                    <input
                                        value={stepSearch}
                                        onChange={(event) => setStepSearch(event.target.value)}
                                        placeholder="Search title or description"
                                    />
                                </div>
                            </label>
                            <div className="learning_path_filter_result">
                                <strong>{filteredAvailableSteps.length}</strong>
                                <span>available</span>
                            </div>
                            <button
                                type="button"
                                onClick={addFilteredSteps}
                                disabled={!filteredAvailableSteps.length}
                            >
                                <i className="fa-solid fa-plus" />
                                Add filtered
                            </button>
                        </div>
                        {loading ? <div className="journey_students_state">Loading path…</div> : <>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={selected.map((item) => item.stepId)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {selectedSteps.map((step, index) => (
                                        <SortablePathStep
                                            key={step.id}
                                            step={step}
                                            item={selectedById.get(step.id)}
                                            index={index}
                                            onRemove={() => toggleStep(step.id)}
                                            onUpdate={(changes) => updateItem(step.id, changes)}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>

                            {availableSteps.length > 0 && (
                                <div className="learning_path_available">
                                    <span>
                                        Available course Steps
                                        {stageFilter !== "ALL" &&
                                            ` · ${stageOptions.find((stage) => stage.id === stageFilter)?.title || ""}`}
                                    </span>
                                    {filteredAvailableSteps.map((step) => (
                                        <article key={step.id}>
                                            <button type="button" className="learning_path_step_toggle" onClick={() => toggleStep(step.id)}>
                                                <i className="fa-solid fa-circle-plus" />
                                                <span><small>{step.stage_title}</small><strong>{step.title}</strong></span>
                                            </button>
                                        </article>
                                    ))}
                                    {filteredAvailableSteps.length === 0 && (
                                        <div className="learning_path_no_results">
                                            <i className="fa-solid fa-filter-circle-xmark" />
                                            <strong>No Steps match these filters</strong>
                                            <span>Try another Stage or search term.</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>}
                    </div>
                </form>
            )}
        </section>
    );
}

function SortablePathStep({ step, item, index, onRemove, onUpdate }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.id });

    return (
        <article
            ref={setNodeRef}
            className={`selected ${isDragging ? "is_dragging" : ""}`}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                zIndex: isDragging ? 20 : "auto",
            }}
        >
            <button
                type="button"
                className="learning_path_drag_handle"
                aria-label={`Drag to reorder ${step.title}`}
                {...attributes}
                {...listeners}
            >
                <i className="fa-solid fa-grip-vertical" />
            </button>
            <button type="button" className="learning_path_step_toggle" onClick={onRemove}>
                <i className="fa-solid fa-circle-check" />
                <span>
                    <small>{index + 1}. {step.stage_title}</small>
                    <strong>{step.title}</strong>
                </span>
            </button>
            <div className="learning_path_step_rules">
                <label><input type="checkbox" checked={item.isRequired !== false} onChange={(event) => onUpdate({ isRequired: event.target.checked })} />Required</label>
                <select value={item.unlockRule} onChange={(event) => onUpdate({ unlockRule: event.target.value })}>
                    <option value="PREVIOUS_REQUIRED">Sequential</option>
                    <option value="ALWAYS_AVAILABLE">Always available</option>
                </select>
                <input
                    className="learning_path_reason"
                    value={item.reason || ""}
                    onChange={(event) => onUpdate({ reason: event.target.value })}
                    placeholder="Why this Step? (optional)"
                />
            </div>
        </article>
    );
}
