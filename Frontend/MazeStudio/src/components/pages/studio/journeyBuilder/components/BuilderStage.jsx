import { useEffect, useRef, useState } from "react";
import BuilderStep from "./BuilderStep";

export default function BuilderStage({
    stage,
    level,
    getChildStages,
    getStageSteps,
    onCreateStage,
    onCreateStep,
    onUpdateStage,
    onDeleteStage,
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const childStages = getChildStages(stage.id);
    const stageSteps = getStageSteps(stage.id);

    const hasContent =
        childStages.length > 0 || stageSteps.length > 0;

    useEffect(() => {
        function closeMenu(event) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setIsMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", closeMenu);

        return () => {
            document.removeEventListener("mousedown", closeMenu);
        };
    }, []);

    return (
        <article
            className="builder_stage"
            style={{ "--stage-level": level }}
        >
            <div className="builder_stage_header">
                <button
                    type="button"
                    className="builder_stage_toggle"
                    onClick={() => setIsOpen((current) => !current)}
                    disabled={!hasContent}
                >
                    <i
                        className={`fa-solid ${
                            isOpen && hasContent
                                ? "fa-chevron-down"
                                : "fa-chevron-right"
                        }`}
                    ></i>
                </button>

                <div className="builder_stage_icon">
                    <i className="fa-solid fa-layer-group"></i>
                </div>

                <div className="builder_stage_title">
                    <strong>{stage.title}</strong>

                    <span>
                        {childStages.length} substages ·{" "}
                        {stageSteps.length} steps
                    </span>
                </div>

                <div className="builder_stage_actions">
                    <button
                        type="button"
                        title="Add Step"
                        onClick={() => onCreateStep(stage.id)}
                    >
                        <i className="fa-solid fa-file-circle-plus"></i>
                    </button>

                    <button
                        type="button"
                        title="Add Substage"
                        onClick={() => onCreateStage(stage.id)}
                    >
                        <i className="fa-solid fa-folder-plus"></i>
                    </button>

                    <div
                        className="builder_stage_menu_wrapper"
                        ref={menuRef}
                    >
                        <button
                            type="button"
                            title="Stage options"
                            onClick={() =>
                                setIsMenuOpen((current) => !current)
                            }
                        >
                            <i className="fa-solid fa-ellipsis"></i>
                        </button>

                        {isMenuOpen && (
                            <div className="builder_stage_menu">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onUpdateStage(stage);
                                    }}
                                >
                                    <i className="fa-solid fa-pen"></i>
                                    Edit Stage
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onCreateStage(stage.id);
                                    }}
                                >
                                    <i className="fa-solid fa-folder-plus"></i>
                                    Add Substage
                                </button>

                                <button
                                    type="button"
                                    className="danger"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onDeleteStage(stage);
                                    }}
                                >
                                    <i className="fa-regular fa-trash-can"></i>
                                    Delete Stage
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isOpen && hasContent && (
                <div className="builder_stage_children">
                    {stageSteps.map((step) => (
                        <BuilderStep key={step.id} step={step} />
                    ))}

                    {childStages.map((childStage) => (
                        <BuilderStage
                            key={childStage.id}
                            stage={childStage}
                            level={level + 1}
                            getChildStages={getChildStages}
                            getStageSteps={getStageSteps}
                            onCreateStage={onCreateStage}
                            onCreateStep={onCreateStep}
                            onUpdateStage={onUpdateStage}
                            onDeleteStage={onDeleteStage}
                        />
                    ))}
                </div>
            )}
        </article>
    );
}