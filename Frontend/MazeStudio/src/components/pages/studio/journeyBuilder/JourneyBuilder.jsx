import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../../api/api";
import BuilderStage from "./components/BuilderStage";
import "./JourneyBuilder.css";

export default function JourneyBuilder() {
    const { journeyId } = useParams();
    const navigate = useNavigate();

    const [journey, setJourney] = useState(null);
    const [stages, setStages] = useState([]);
    const [steps, setSteps] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

                setJourney(data.journey);
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
                    <p>{error}</p>
                </div>
            </StudioLayout>
        );
    }

    return (
        <StudioLayout>
            <main className="journey_builder">
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

                    <div className="journey_builder_header_actions">
                        <button
                            type="button"
                            className="builder_secondary_button"
                            onClick={() =>
                                navigate(`/studio/journey/${journeyId}/preview`)
                            }
                        >
                            <i className="fa-regular fa-eye"></i>
                            Preview
                        </button>

                        <button
                            type="button"
                            className="builder_primary_button"
                            onClick={() => handleCreateStage(null)}
                        >
                            <i className="fa-solid fa-plus"></i>
                            Add Stage
                        </button>
                    </div>
                </header>

                <section className="journey_builder_workspace">
                    <div className="journey_builder_toolbar">
                        <div>
                            <strong>Journey structure</strong>
                            <span>
                                Organize Stages, Substages and Steps.
                            </span>
                        </div>

                        <div className="builder_toolbar_stats">
                            <span>
                                <strong>{stages.length}</strong>
                                Stages
                            </span>

                            <span>
                                <strong>{steps.length}</strong>
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

                                <h2>Create your first Stage</h2>

                                <p>
                                    Stages organize the Steps and content
                                    inside your Learning Journey.
                                </p>

                                <button
                                    type="button"
                                    className="builder_primary_button"
                                    onClick={() => handleCreateStage(null)}
                                >
                                    <i className="fa-solid fa-plus"></i>
                                    Add first Stage
                                </button>
                            </div>
                        ) : (
                            rootStages.map((stage) => (
                                <BuilderStage
                                    key={stage.id}
                                    stage={stage}
                                    level={0}
                                    getChildStages={getChildStages}
                                    getStageSteps={getStageSteps}
                                    onCreateStage={handleCreateStage}
                                    onCreateStep={handleCreateStep}
                                    onUpdateStage={handleUpdateStage}
                                    onDeleteStage={handleDeleteStage}
                                />
                            ))
                        )}
                    </div>
                </section>
            </main>
        </StudioLayout>
    );
}