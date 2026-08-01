import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../../api/api";
import "./JourneyBuilder.css";
import SortableStageGroup from "./components/SortableStageGroup";
import JourneyStudents from "./components/JourneyStudents";
import JourneyWorkspaceNav from "./components/JourneyWorkspaceNav";
import JourneyLearningPaths from "./components/JourneyLearningPaths";
import JourneyCollaborators from "./components/JourneyCollaborators";
import JourneyOfferings from "./components/JourneyOfferings";
import JourneyCohortsPage from "./components/JourneyCohortsPage";
import JourneySessionsPage from "./components/JourneySessionsPage";

export default function JourneyBuilder() {
    const { journeyId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [reorderingStages, setReorderingStages] =
    useState(false);
    
    const [journey, setJourney] = useState(null);
    const [stages, setStages] = useState([]);
    const [steps, setSteps] = useState([]);
    const requestedSection = searchParams.get("section")?.toUpperCase();
    const activeSection = ["STUDENTS", "PATHS", "OFFERS", "COHORTS", "SESSIONS", "COLLABORATORS"].includes(requestedSection)
        ? requestedSection
        : "CONTENT";
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function handleReorderStages({
    parentStageId,
    reorderedStages,
}) {
    if (reorderingStages) return;

    const previousStages = stages;

    const reorderedIds = reorderedStages.map(
        (stage) => stage.id
    );

    /*
      Actualización optimista:
      primero cambia la interfaz y después persiste en backend.
    */
    setStages((current) => {
        const positionById = new Map(
            reorderedIds.map((id, index) => [
                id,
                index + 1,
            ])
        );

        return current.map((stage) => {
            const belongsToGroup =
                stage.parent_stage_id === parentStageId;

            if (!belongsToGroup) {
                return stage;
            }

            return {
                ...stage,
                position:
                    positionById.get(stage.id) ??
                    stage.position,
            };
        });
    });

    setReorderingStages(true);

    try {
        const data = await apiRequest(
            `/learning-journeys/${journeyId}/stages/reorder`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    parentStageId,
                    stageIds: reorderedIds,
                }),
            }
        );

        const persistedStages = data.stages || [];

        setStages((current) => {
            const persistedById = new Map(
                persistedStages.map((stage) => [
                    stage.id,
                    stage,
                ])
            );

            return current.map((stage) =>
                persistedById.has(stage.id)
                    ? {
                          ...stage,
                          ...persistedById.get(stage.id),
                      }
                    : stage
            );
        });
    } catch (err) {
        // Si falla el backend, regresa al orden anterior.
        setStages(previousStages);

        window.alert(
            err.message ||
                "Could not reorder the Stages."
        );
    } finally {
        setReorderingStages(false);
    }
}

    async function handleCreateStage(parentStageId = null) {
        const title = window.prompt(
            parentStageId
                ? "Name of the new Substage:"
                : "Name of the new Stage:"
        );

        if (!title?.trim()) return;

        try {
            const data = await apiRequest(
                `/learning-journeys/${journeyId}/stages`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        title: title.trim(),
                        description: null,
                        parentStageId,
                    }),
                }
            );

            setStages((current) => [
                ...current,
                data.stage,
            ]);
        } catch (err) {
            window.alert(
                err.message || "Could not create the Stage."
            );
        }
    }

    async function handleCreateStep(stageId) {
        const title = window.prompt(
            "Name of the new Step:"
        );

        if (!title?.trim()) return;

        try {
            const data = await apiRequest(
                `/stages/${stageId}/steps`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        title: title.trim(),
                        description: null,
                        status: "DRAFT",
                        estimatedMinutes: null,
                        isPreview: false,
                        icon: "fa-file-lines",
                        color: "purple",
                    }),
                }
            );

            setSteps((current) => [
                ...current,
                data.step,
            ]);
        } catch (err) {
            window.alert(
                err.message || "Could not create the Step."
            );
        }
    }

    async function handleDeleteStep(step) {
        const confirmed = window.confirm(
            `Delete "${step.title}"?\n\nIts content and topic relationships will be removed permanently.`
        );

        if (!confirmed) return;

        try {
            await apiRequest(`/steps/${step.id}`, {
                method: "DELETE",
            });
            setSteps((current) =>
                current.filter((item) => item.id !== step.id)
            );
        } catch (err) {
            window.alert(
                err.message || "Could not delete the Step."
            );
        }
    }

    async function handleUpdateStage(stage) {
        const title = window.prompt(
            "New Stage title:",
            stage.title
        );

        if (!title?.trim() || title.trim() === stage.title) {
            return;
        }

        try {
            const data = await apiRequest(`/stages/${stage.id}`, {
                method: "PUT",
                body: JSON.stringify({
                    title: title.trim(),
                }),
            });

            setStages((current) =>
                current.map((item) =>
                    item.id === stage.id
                        ? { ...item, ...data.stage }
                        : item
                )
            );
        } catch (err) {
            window.alert(err.message || "Could not update Stage.");
        }
    }

    async function handleDeleteStage(stage) {
        const confirmed = window.confirm(
            `Delete "${stage.title}"?\n\nAll nested Stages, Steps and content will also be deleted permanently.`
        );

        if (!confirmed) return;

        try {
            await apiRequest(`/stages/${stage.id}`, {
                method: "DELETE",
            });

            const deletedStageIds = new Set([stage.id]);

            let changed = true;

            while (changed) {
                changed = false;

                stages.forEach((item) => {
                    if (
                        item.parent_stage_id &&
                        deletedStageIds.has(item.parent_stage_id) &&
                        !deletedStageIds.has(item.id)
                    ) {
                        deletedStageIds.add(item.id);
                        changed = true;
                    }
                });
            }

            setStages((current) =>
                current.filter(
                    (item) => !deletedStageIds.has(item.id)
                )
            );

            setSteps((current) =>
                current.filter(
                    (step) => !deletedStageIds.has(step.stage_id)
                )
            );
        } catch (err) {
            window.alert(err.message || "Could not delete Stage.");
        }
    }

    useEffect(() => {
        async function loadBuilder() {
            setLoading(true);
            setError("");

            try {
                const data = await apiRequest(
                    `/learning-journeys/${journeyId}/builder`
                );

                setJourney({...data.journey, access_role: data.accessRole});
                setStages(data.stages || []);
                setSteps(data.steps || []);
            } catch (err) {
                setError(
                    err.message ||
                    "Could not load the Learning Journey."
                );
            } finally {
                setLoading(false);
            }
        }

        loadBuilder();
    }, [journeyId]);

    const rootStages = useMemo(() => {
        return stages
            .filter((stage) => stage.parent_stage_id === null)
            .sort((a, b) => a.position - b.position);
    }, [stages]);

    function getChildStages(parentStageId) {
        return stages
            .filter(
                (stage) =>
                    stage.parent_stage_id === parentStageId
            )
            .sort((a, b) => a.position - b.position);
    }

    function getStageSteps(stageId) {
        return steps
            .filter((step) => step.stage_id === stageId)
            .sort((a, b) => a.position - b.position);
    }

    if (loading) {
        return (
            <StudioLayout>
                <div className="journey_builder_loading">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <h2>Loading Journey Builder</h2>
                    <p>Preparing your stages and steps...</p>
                </div>
            </StudioLayout>
        );
    }

    if (error) {
        return (
            <StudioLayout>
                <div className="journey_builder_error">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <h2>Could not open the Builder</h2>
                </div>
            </StudioLayout>
        );
    }
return (
    <StudioLayout>
        <main className="journey_builder">
            <JourneyWorkspaceNav
                journeyId={journeyId}
                active={activeSection}
                accessRole={journey.access_role}
            />

            <header className="journey_builder_header">
                <div className="journey_builder_title">
                    <span className="journey_builder_badge">
                        {journey?.status}
                    </span>

                    <h1>{journey?.title}</h1>

                    <p>
                        {journey?.description ||
                            "Build the structure of your Learning Journey."}
                    </p>
                </div>

                {activeSection === "CONTENT" && (
                    <div className="journey_builder_header_actions">
                        <button
                            type="button"
                            className="builder_secondary_button"
                            onClick={() =>
                                navigate(
                                    `/studio/journeys/${journeyId}/challenges`
                                )
                            }
                        >
                            <i className="fa-solid fa-list-check"></i>
                            Challenges
                        </button>

                        <button
                            type="button"
                            className="builder_secondary_button"
                            onClick={() =>
                                navigate(
                                    `/studio/journey/${journeyId}/preview`
                                )
                            }
                        >
                            <i className="fa-regular fa-eye"></i>
                            Preview
                        </button>

                        <button
                            type="button"
                            className="builder_primary_button"
                            onClick={() =>
                                handleCreateStage(null)
                            }
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add Stage
                        </button>
                    </div>
                )}
            </header>

            {activeSection === "CONTENT" ? (
                <section className="journey_builder_workspace">
                    <div className="journey_builder_toolbar">
                        <div>
                            <strong>
                                Journey structure
                            </strong>

                            <span>
                                Organize Stages, Substages and
                                Steps.
                            </span>
                        </div>

                        <div className="builder_toolbar_stats">
                            <span>
                                <strong>
                                    {stages.length}
                                </strong>
                                Stages
                            </span>

                            <span>
                                <strong>
                                    {steps.length}
                                </strong>
                                Steps
                            </span>
                        </div>
                    </div>

                    <div className="journey_builder_tree">
                        {rootStages.length === 0 ? (
                            <div className="builder_empty_state">
                                <div className="builder_empty_icon">
                                    <i className="fa-solid fa-layer-group"></i>
                                </div>

                                <h2>
                                    Create your first Stage
                                </h2>

                                <p>
                                    Stages organize the Steps and
                                    content inside your Learning
                                    Journey.
                                </p>

                                <button
                                    type="button"
                                    className="builder_primary_button"
                                    onClick={() =>
                                        handleCreateStage(
                                            null
                                        )
                                    }
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    Add first Stage
                                </button>
                            </div>
                        ) : (
                            <SortableStageGroup
                                stages={rootStages}
                                level={0}
                                parentStageId={null}
                                getChildStages={
                                    getChildStages
                                }
                                getStageSteps={
                                    getStageSteps
                                }
                                onCreateStage={
                                    handleCreateStage
                                }
                                onCreateStep={
                                    handleCreateStep
                                }
                                onDeleteStep={
                                    handleDeleteStep
                                }
                                onUpdateStage={
                                    handleUpdateStage
                                }
                                onDeleteStage={
                                    handleDeleteStage
                                }
                                onReorderStages={
                                    handleReorderStages
                                }
                            />
                        )}
                    </div>
                </section>
            ) : activeSection === "STUDENTS" ? (
                <JourneyStudents
                    journeyId={journeyId}
                />
            ) : activeSection === "PATHS" ? (
                <JourneyLearningPaths journeyId={journeyId} />
            ) : activeSection === "OFFERS" ? (
                <JourneyOfferings journeyId={journeyId} />
            ) : activeSection === "COHORTS" ? (
                <JourneyCohortsPage journeyId={journeyId} />
            ) : activeSection === "SESSIONS" ? (
                <JourneySessionsPage journeyId={journeyId} />
            ) : (
                <JourneyCollaborators journeyId={journeyId} />
            )}
        </main>
    </StudioLayout>
);
}
