import { useNavigate } from "react-router-dom";

export default function BuilderStep({ step }) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className="builder_step"
            onClick={() =>
                navigate(`/studio/step/${step.id}`)
            }
        >
            <span
    className={`builder_step_icon ${
        step.visual_type === "IMAGE" && step.image_url
            ? "has-image"
            : ""
    }`}
    data-color={step.color || "purple"}
>
    {step.visual_type === "IMAGE" && step.image_url ? (
        <img
            src={step.image_url}
            alt={step.title}
        />
    ) : step.visual_type === "EMOJI" && step.emoji ? (
        <span>{step.emoji}</span>
    ) : (
        <i
            className={`fa-solid ${
                step.icon || "fa-file-lines"
            }`}
        ></i>
    )}
</span>

            <span className="builder_step_content">
                <strong>{step.title}</strong>

                <small>
                    {step.estimated_minutes
                        ? `${step.estimated_minutes} min`
                        : "No estimated duration"}
                </small>
            </span>

            <span className="builder_step_status">
                {step.status}
            </span>

            <i className="fa-solid fa-chevron-right"></i>
        </button>
    );
}