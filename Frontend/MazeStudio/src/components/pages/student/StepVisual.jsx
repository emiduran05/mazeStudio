export default function StepVisual({ step, compact = false }) {
    const className = [
        "learner_step_visual",
        compact ? "compact" : "",
        step.visualType === "IMAGE" && step.imageUrl ? "has_image" : "",
    ]
        .filter(Boolean)
        .join(" ");

    if (step.visualType === "IMAGE" && step.imageUrl) {
        return (
            <div className={className}>
                <img src={step.imageUrl} alt="" />
            </div>
        );
    }

    if (step.visualType === "EMOJI" && step.emoji) {
        return <div className={className}><span>{step.emoji}</span></div>;
    }

    return (
        <div className={className} data-color={step.color || "purple"}>
            <i className={`fa-solid ${step.icon || "fa-file-lines"}`} />
        </div>
    );
}
