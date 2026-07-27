import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../../api/api";
import IconPicker from "../../../../components/iconPicker/IconPicker";
import {
    uploadStepImage,
    deleteStepImage,
} from "../../../../api/imageApi";
import "./StepEditor.css";

export default function StepEditor() {
    const { stepId } = useParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(null);

    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "DRAFT",
        estimatedMinutes: "",
        isPreview: false,
        visualType: "ICON",
        icon: "fa-file-lines",
        emoji: "",
        color: "purple",
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function loadStep() {
            setLoading(true);
            setError("");

            try {
                const data = await apiRequest(`/steps/${stepId}`);
                const loadedStep = data.step;

                setStep(loadedStep);
                setImagePreview(loadedStep.image_url || "");

                setForm({
                    title: loadedStep.title || "",
                    description: loadedStep.description || "",
                    status: loadedStep.status || "DRAFT",
                    estimatedMinutes:
                        loadedStep.estimated_minutes ?? "",
                    isPreview: Boolean(loadedStep.is_preview),
                    visualType: loadedStep.visual_type || "ICON",
                    icon: loadedStep.icon || "fa-file-lines",
                    emoji: loadedStep.emoji || "",
                    color: loadedStep.color || "purple",
                });
            } catch (err) {
                setError(
                    err.message || "Could not load this Step."
                );
            } finally {
                setLoading(false);
            }
        }

        loadStep();
    }, [stepId]);

    useEffect(() => {
        return () => {
            if (imagePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    function handleChange(event) {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function selectVisualType(visualType) {
        setForm((current) => ({
            ...current,
            visualType,
        }));

        setError("");
        setMessage("");
    }

    function handleImageSelection(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                "Only JPG, PNG and WEBP images are allowed."
            );
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError(
                "The image must be smaller than 5 MB."
            );
            event.target.value = "";
            return;
        }

        if (imagePreview?.startsWith("blob:")) {
            URL.revokeObjectURL(imagePreview);
        }

        const localPreview = URL.createObjectURL(file);

        setImageFile(file);
        setImagePreview(localPreview);
        setForm((current) => ({
            ...current,
            visualType: "IMAGE",
        }));

        setError("");
        setMessage("");
    }

    async function handleRemoveStepImage() {
        setError("");
        setMessage("");

        // Solo era una imagen local todavía no subida
        if (imageFile) {
            if (imagePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }

            setImageFile(null);
            setImagePreview(step?.image_url || "");

            setForm((current) => ({
                ...current,
                visualType: step?.image_url
                    ? "IMAGE"
                    : "ICON",
            }));

            return;
        }

        // No existe imagen guardada
        if (!step?.image_url) {
            setImagePreview("");

            setForm((current) => ({
                ...current,
                visualType: "ICON",
            }));

            return;
        }

        const confirmed = window.confirm(
            "Remove the custom Step image?"
        );

        if (!confirmed) return;

        setUploadingImage(true);

        try {
            const data = await deleteStepImage(stepId);
            const updatedStep = data.step;

            setStep(updatedStep);
            setImageFile(null);
            setImagePreview("");

            setForm((current) => ({
                ...current,
                visualType:
                    updatedStep.visual_type || "ICON",
            }));

            setMessage("Step image removed successfully.");
        } catch (err) {
            setError(
                err.message || "Could not remove the image."
            );
        } finally {
            setUploadingImage(false);
        }
    }

    async function handleSave(event) {
        event.preventDefault();

        if (!form.title.trim()) {
            setError("Step title is required.");
            return;
        }

        if (
            form.visualType === "EMOJI" &&
            !form.emoji.trim()
        ) {
            setError(
                "Select or enter an emoji before saving."
            );
            return;
        }

        if (
            form.visualType === "IMAGE" &&
            !imageFile &&
            !step?.image_url
        ) {
            setError(
                "Select an image before using the image appearance."
            );
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        try {
            // Primero guarda la información normal y visual
            const data = await apiRequest(`/steps/${stepId}`, {
                method: "PUT",
                body: JSON.stringify({
                    title: form.title.trim(),
                    description:
                        form.description.trim() || null,
                    status: form.status,
                    estimatedMinutes:
                        form.estimatedMinutes === ""
                            ? null
                            : Number(form.estimatedMinutes),
                    isPreview: form.isPreview,

                    visualType: form.visualType,
                    icon: form.icon,
                    emoji: form.emoji.trim() || null,
                    color: form.color,
                }),
            });

            let updatedStep = data.step;

            // Después sube la imagen, si se eligió una nueva
            if (imageFile) {
                setUploadingImage(true);

                const imageData = await uploadStepImage(
                    stepId,
                    imageFile
                );

                updatedStep = imageData.step;
            }

            setStep(updatedStep);
            setImageFile(null);
            setImagePreview(updatedStep.image_url || "");

            setForm((current) => ({
                ...current,
                title: updatedStep.title || current.title,
                description:
                    updatedStep.description || "",
                status:
                    updatedStep.status || current.status,
                estimatedMinutes:
                    updatedStep.estimated_minutes ?? "",
                isPreview: Boolean(
                    updatedStep.is_preview
                ),
                visualType:
                    updatedStep.visual_type ||
                    current.visualType,
                icon:
                    updatedStep.icon ||
                    current.icon ||
                    "fa-file-lines",
                emoji: updatedStep.emoji || "",
                color:
                    updatedStep.color ||
                    current.color ||
                    "purple",
            }));

            setMessage("Step updated successfully.");
        } catch (err) {
            setError(
                err.message || "Could not update the Step."
            );
        } finally {
            setSaving(false);
            setUploadingImage(false);
        }
    }

    function renderCurrentVisual() {
        if (
            form.visualType === "IMAGE" &&
            imagePreview
        ) {
            return (
                <img
                    src={imagePreview}
                    alt="Step appearance preview"
                />
            );
        }

        if (
            form.visualType === "EMOJI" &&
            form.emoji
        ) {
            return <span>{form.emoji}</span>;
        }

        return (
            <i
                className={`fa-solid ${
                    form.icon || "fa-file-lines"
                }`}
            ></i>
        );
    }

    if (loading) {
        return (
            <StudioLayout>
                <div className="step_editor_loading">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <h2>Loading Step</h2>
                    <p>Preparing your content workspace...</p>
                </div>
            </StudioLayout>
        );
    }

    if (error && !step) {
        return (
            <StudioLayout>
                <div className="step_editor_loading">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <h2>Could not open this Step</h2>
                    <p>{error}</p>
                </div>
            </StudioLayout>
        );
    }

    const processing = saving || uploadingImage;

    return (
        <StudioLayout>
            <main className="step_editor">
                <header className="step_editor_header">
                    <div>
                        <button
                            type="button"
                            className="step_back_button"
                            onClick={() => navigate(-1)}
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                            Back to Journey
                        </button>

                        <span className="step_editor_badge">
                            {step?.status}
                        </span>

                        <h1>{step?.title}</h1>

                        <p>
                            Configure this Step and start adding
                            learning content.
                        </p>
                    </div>

                    <div className="step_editor_header_actions">
                        <Link
                            to={`/studio/step/${stepId}/preview`}
                            className="step_preview_button"
                        >
                            <i className="fa-regular fa-eye"></i>
                            Preview
                        </Link>

                        <button
                            type="submit"
                            form="step-settings-form"
                            className="step_save_button"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-check"></i>
                                    Save changes
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <div className="step_editor_layout">
                    <section className="step_content_builder">
                        <div className="step_content_header">
                            <div>
                                <h2>Step content</h2>
                                <p>
                                    Blocks will be used to build
                                    the learning experience.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="add_block_button"
                            >
                                <i className="fa-solid fa-plus"></i>
                                Add block
                            </button>
                        </div>

                        <div className="step_content_empty">
                            <div>
                                <i className="fa-solid fa-cubes-stacked"></i>
                            </div>

                            <h3>
                                This Step has no content yet
                            </h3>

                            <p>
                                Soon you will be able to add text,
                                images, videos, files, quizzes and
                                other content blocks.
                            </p>

                            <button
                                type="button"
                                className="add_block_button"
                            >
                                <i className="fa-solid fa-plus"></i>
                                Add first block
                            </button>
                        </div>
                    </section>

                    <aside className="step_settings_card">
                        <div className="step_settings_header">
                            <h2>Step settings</h2>
                            <p>
                                Configure information and
                                visibility.
                            </p>
                        </div>

                        <form
                            id="step-settings-form"
                            className="step_settings_form"
                            onSubmit={handleSave}
                        >
                            {error && (
                                <div className="step_editor_alert error">
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="step_editor_alert success">
                                    {message}
                                </div>
                            )}

                            <div className="step_form_group">
                                <label>Title</label>

                                <input
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="step_form_group">
                                <label>Description</label>

                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    rows={4}
                                />
                            </div>

                            <div className="step_form_group">
                                <label>Status</label>

                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                >
                                    <option value="DRAFT">
                                        Draft
                                    </option>

                                    <option value="PUBLISHED">
                                        Published
                                    </option>

                                    <option value="ARCHIVED">
                                        Archived
                                    </option>
                                </select>
                            </div>

                            <div className="step_form_group">
                                <label>
                                    Estimated minutes
                                </label>

                                <input
                                    name="estimatedMinutes"
                                    type="number"
                                    min="0"
                                    value={
                                        form.estimatedMinutes
                                    }
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="step_visual_settings">
                                <div className="step_visual_header">
                                    <div>
                                        <h3>Step appearance</h3>

                                        <p>
                                            Choose how this Step
                                            appears in the Journey
                                            structure.
                                        </p>
                                    </div>

                                    <div
                                        className={`step_visual_current ${
                                            form.visualType ===
                                            "IMAGE"
                                                ? "has-image"
                                                : ""
                                        }`}
                                        data-color={
                                            form.color
                                        }
                                    >
                                        {renderCurrentVisual()}
                                    </div>
                                </div>

                                <div className="step_visual_type_tabs">
                                    <button
                                        type="button"
                                        className={
                                            form.visualType ===
                                            "ICON"
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            selectVisualType(
                                                "ICON"
                                            )
                                        }
                                    >
                                        <i className="fa-solid fa-icons"></i>
                                        Icon
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            form.visualType ===
                                            "EMOJI"
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            selectVisualType(
                                                "EMOJI"
                                            )
                                        }
                                    >
                                        <span>✨</span>
                                        Emoji
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            form.visualType ===
                                            "IMAGE"
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            selectVisualType(
                                                "IMAGE"
                                            )
                                        }
                                    >
                                        <i className="fa-regular fa-image"></i>
                                        Image
                                    </button>
                                </div>

                                {form.visualType ===
                                    "ICON" && (
                                    <>
                                        <IconPicker
                                            value={
                                                form.icon
                                            }
                                            color={
                                                form.color
                                            }
                                            onChange={(
                                                icon
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,
                                                        icon,
                                                        visualType:
                                                            "ICON",
                                                    })
                                                )
                                            }
                                        />

                                        <div className="step_form_group">
                                            <label>
                                                Icon color
                                            </label>

                                            <select
                                                name="color"
                                                value={
                                                    form.color
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                            >
                                                <option value="purple">
                                                    Purple
                                                </option>
                                                <option value="blue">
                                                    Blue
                                                </option>
                                                <option value="green">
                                                    Green
                                                </option>
                                                <option value="orange">
                                                    Orange
                                                </option>
                                                <option value="red">
                                                    Red
                                                </option>
                                                <option value="yellow">
                                                    Yellow
                                                </option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {form.visualType ===
                                    "EMOJI" && (
                                    <div className="step_form_group">
                                        <label>Emoji</label>

                                        <input
                                            name="emoji"
                                            value={
                                                form.emoji
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="📘"
                                            maxLength={20}
                                        />
                                    </div>
                                )}

                                {form.visualType ===
                                    "IMAGE" && (
                                    <div className="step_image_editor">
                                        <div className="step_image_preview">
                                            {imagePreview ? (
                                                <img
                                                    src={
                                                        imagePreview
                                                    }
                                                    alt="Step visual preview"
                                                />
                                            ) : (
                                                <div>
                                                    <i className="fa-regular fa-image"></i>
                                                    <span>
                                                        No image
                                                        selected
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="step_image_actions">
                                            <label className="step_image_upload">
                                                <i className="fa-solid fa-upload"></i>
                                                Choose image

                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={
                                                        handleImageSelection
                                                    }
                                                    hidden
                                                />
                                            </label>

                                            {imagePreview && (
                                                <button
                                                    type="button"
                                                    className="step_image_remove"
                                                    onClick={
                                                        handleRemoveStepImage
                                                    }
                                                    disabled={
                                                        uploadingImage
                                                    }
                                                >
                                                    <i className="fa-regular fa-trash-can"></i>
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <small>
                                            JPG, PNG or WEBP ·
                                            Maximum 5 MB
                                        </small>
                                    </div>
                                )}
                            </div>

                            <label className="step_preview_toggle">
                                <div>
                                    <strong>
                                        Free preview
                                    </strong>

                                    <span>
                                        Allow visitors to view
                                        this Step without
                                        enrolling.
                                    </span>
                                </div>

                                <input
                                    name="isPreview"
                                    type="checkbox"
                                    checked={
                                        form.isPreview
                                    }
                                    onChange={handleChange}
                                />
                            </label>
                        </form>
                    </aside>
                </div>
            </main>
        </StudioLayout>
    );
}