import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StudioLayout from "../../layouts/studioLayout/StudioLayout";
import { apiRequest, } from "../../../api/api";
import IconPicker from "../../../components/iconPicker/IconPicker";
import {
    uploadJourneyCover,
    deleteJourneyCover,
} from "../../../api/imageApi";
import "./Studio.css";

export default function Studio() {
    const [journeys, setJourneys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [creating, setCreating] = useState(false);
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState("");
    const [uploadingCover, setUploadingCover] = useState(false);


    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingJourney, setEditingJourney] = useState(null);

    const [editForm, setEditForm] = useState({
        title: "",
        description: "",
        visibility: "PRIVATE",
        status: "DRAFT",
        enrollmentMode: "INVITE_ONLY",
        estimatedMinutes: "",
        difficulty: "",
        language: "",
        visualType: "ICON",
        icon: "fa-route",
        emoji: "",
    });

    const [updating, setUpdating] = useState(false);

    function handleCoverSelection(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError("Only JPG, PNG and WEBP images are allowed.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("The cover image must be smaller than 5 MB.");
            event.target.value = "";
            return;
        }

        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    }

    async function handleRemoveJourneyCover() {
        if (!editingJourney) return;

        if (coverFile) {
            setCoverFile(null);
            setCoverPreview(editingJourney.cover_url || "");
            return;
        }

        if (!editingJourney.cover_url) return;

        const confirmed = window.confirm(
            "Remove this Learning Journey cover?"
        );

        if (!confirmed) return;

        setUploadingCover(true);
        setError("");

        try {
            const data = await deleteJourneyCover(
                editingJourney.id
            );

            setEditingJourney(data.journey);
            setCoverPreview("");

            setJourneys((current) =>
                current.map((journey) =>
                    journey.id === editingJourney.id
                        ? { ...journey, ...data.journey }
                        : journey
                )
            );
        } catch (err) {
            setError(
                err.message || "Could not remove the cover."
            );
        } finally {
            setUploadingCover(false);
        }
    }

    function openEditModal(journey) {
        setOpenMenuId(null);
        setEditingJourney(journey);
        setCoverFile(null);
        setCoverPreview(journey.cover_url || "");

        setEditForm({
            title: journey.title || "",
            description: journey.description || "",
            visibility: journey.visibility || "PRIVATE",
            status: journey.status || "DRAFT",
            enrollmentMode:
                journey.enrollment_mode || "INVITE_ONLY",
            estimatedMinutes:
                journey.estimated_minutes ?? "",
            difficulty: journey.difficulty || "",
            language: journey.language || "",
            visualType: journey.visual_type || "ICON",
            icon: journey.icon || "fa-route",
            emoji: journey.emoji || "",
        });
    }
    function closeEditModal() {
        if (updating) return;

        setEditingJourney(null);
    }

    function handleEditChange(event) {
        const { name, value } = event.target;

        setEditForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleUpdateJourney(event) {
        event.preventDefault();

        if (!editingJourney) return;

        if (!editForm.title.trim()) {
            setError("The Learning Journey title is required.");
            return;
        }

        setUpdating(true);
        setError("");

        try {
            // 1. Actualizar los datos normales del Journey
            const data = await apiRequest(
                `/learning-journeys/${editingJourney.id}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        title: editForm.title.trim(),
                        description:
                            editForm.description.trim() || null,
                        visibility: editForm.visibility,
                        status: editForm.status,
                        enrollmentMode: editForm.enrollmentMode,
                        estimatedMinutes:
                            editForm.estimatedMinutes === ""
                                ? null
                                : Number(editForm.estimatedMinutes),
                        difficulty:
                            editForm.difficulty || null,
                        language:
                            editForm.language.trim() || null,
                        visualType: editForm.visualType,
                        icon: editForm.icon,
                        emoji:
                            editForm.emoji.trim() || null,
                    }),
                }
            );

            // 2. Por ahora, esta es la versión actualizada
            let updatedJourney = data.journey;

            // 3. Si seleccionó una portada nueva, subirla
            if (coverFile) {
                setUploadingCover(true);

                const coverData = await uploadJourneyCover(
                    editingJourney.id,
                    coverFile
                );

                // La respuesta de la portada contiene la versión final
                updatedJourney = coverData.journey;
            }

            // 4. Actualizar la lista de Journeys en React
            setJourneys((current) =>
                current.map((journey) =>
                    journey.id === editingJourney.id
                        ? {
                            ...journey,
                            ...updatedJourney,
                        }
                        : journey
                )
            );

            // 5. Limpiar y cerrar modal
            setEditingJourney(null);
            setCoverFile(null);
            setCoverPreview("");
        } catch (err) {
            setError(
                err.message ||
                "Could not update the Learning Journey."
            );
        } finally {
            setUpdating(false);
            setUploadingCover(false);
        }
    }

    async function handleArchiveJourney(journey) {
        setOpenMenuId(null);

        const confirmed = window.confirm(
            `Archive "${journey.title}"?\n\nIt will stop appearing in your active Learning Journeys.`
        );

        if (!confirmed) return;

        try {
            await apiRequest(
                `/learning-journeys/${journey.id}`,
                {
                    method: "DELETE",
                }
            );

            setJourneys((current) =>
                current.filter(
                    (item) => item.id !== journey.id
                )
            );
        } catch (err) {
            setError(
                err.message ||
                "Could not archive the Learning Journey."
            );
        }
    }

    async function handleCreateJourney() {
        const title = window.prompt(
            "What should your Learning Journey be called?"
        );

        if (!title?.trim()) return;

        setCreating(true);
        setError("");

        try {
            const data = await apiRequest("/learning-journeys", {
                method: "POST",
                body: JSON.stringify({
                    title: title.trim(),
                    description: "",
                    visibility: "PRIVATE",
                    status: "DRAFT",
                    enrollmentMode: "INVITE_ONLY",
                }),
            });

            setJourneys((current) => [
                data.journey,
                ...current,
            ]);

            navigate(`/studio/journey/${data.journey.id}`);
        } catch (err) {
            setError(
                err.message ||
                "Could not create the Learning Journey."
            );
        } finally {
            setCreating(false);
        }
    }

    useEffect(() => {
        async function loadJourneys() {
            setLoading(true);
            setError("");

            try {
                const data = await apiRequest("/learning-journeys");
                setJourneys(data.journeys || []);
            } catch (err) {
                setError(
                    err.message ||
                    "Could not load your Learning Journeys."
                );
            } finally {
                setLoading(false);
            }
        }

        loadJourneys();
    }, []);

    useEffect(() => {
        function closeMenu(event) {
            if (!event.target.closest(".studio_journey_menu_wrapper")) {
                setOpenMenuId(null);
            }
        }

        document.addEventListener("mousedown", closeMenu);

        return () => {
            document.removeEventListener("mousedown", closeMenu);
        };
    }, []);

    return (
        <StudioLayout>
            <main className="studio_home">
                <header className="studio_home_header">
                    <div>
                        <span className="studio_home_badge">
                            Teaching workspace
                        </span>

                        <h1>Your Learning Journeys</h1>

                        <p>
                            Create, organize and manage the learning experiences
                            you share with your learners.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="studio_create_button"
                        onClick={handleCreateJourney}
                        disabled={creating}
                    >
                        {creating ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin"></i>
                                Creating...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-plus"></i>
                                New Learning Journey
                            </>
                        )}
                    </button>
                </header>

                {loading && (
                    <div className="studio_home_loading">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <h2>Loading your studio</h2>
                        <p>Preparing your Learning Journeys...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="studio_home_error">
                        <i className="fa-solid fa-triangle-exclamation"></i>

                        <div>
                            <strong>Could not load your studio</strong>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {!loading && !error && journeys.length === 0 && (
                    <section className="studio_empty">
                        <div className="studio_empty_icon">
                            <i className="fa-solid fa-route"></i>
                        </div>

                        <h2>Create your first Learning Journey</h2>

                        <p>
                            Start organizing Stages, Steps, Challenges and
                            personalized paths for your learners.
                        </p>

                        <button
                            type="button"
                            className="studio_create_button"
                            onClick={handleCreateJourney}
                            disabled={creating}
                        >
                            <i className="fa-solid fa-plus"></i>
                            Create Learning Journey
                        </button>
                    </section>
                )}

                {!loading && !error && journeys.length > 0 && (
                    <section className="studio_journeys_grid">
                        {journeys.map((journey) => (
                            <article
                                className="studio_journey_card"
                                key={journey.id}
                            >
                                <div className="studio_journey_cover">
                                    {journey.cover_url ? (
                                        <img
                                            src={journey.cover_url}
                                            alt={journey.title}
                                        />
                                    ) : journey.visual_type === "EMOJI" &&
                                        journey.emoji ? (
                                        <div className="studio_journey_placeholder emoji">
                                            <span>{journey.emoji}</span>
                                        </div>
                                    ) : (
                                        <div className="studio_journey_placeholder">
                                            <i
                                                className={`fa-solid ${journey.icon || "fa-route"
                                                    }`}
                                            ></i>
                                        </div>
                                    )}

                                    <span
                                        className={`studio_journey_status ${journey.status?.toLowerCase() || ""
                                            }`}
                                    >
                                        {journey.status}
                                    </span>
                                </div>

                                <div className="studio_journey_content">
                                    <div className="studio_journey_meta">
                                        <span>
                                            {journey.difficulty ||
                                                "No difficulty"}
                                        </span>

                                        <span>
                                            {journey.visibility}
                                        </span>
                                    </div>

                                    <h2>{journey.title}</h2>

                                    <p>
                                        {journey.description ||
                                            "No description has been added yet."}
                                    </p>

                                    <div className="studio_journey_details">
                                        <span>
                                            <i className="fa-regular fa-clock"></i>

                                            {journey.estimated_minutes
                                                ? `${journey.estimated_minutes} min`
                                                : "Duration not set"}
                                        </span>

                                        <span>
                                            <i className="fa-solid fa-language"></i>

                                            {journey.language ||
                                                "Language not set"}
                                        </span>
                                    </div>

                                    <div className="studio_journey_actions">
                                        <Link
                                            to={`/studio/journey/${journey.id}`}
                                            className="studio_open_builder"
                                        >
                                            Open Builder
                                            <i className="fa-solid fa-arrow-right"></i>
                                        </Link>

                                        <div className="studio_journey_menu_wrapper">
                                            <button
                                                type="button"
                                                className="studio_journey_options"
                                                onClick={() =>
                                                    setOpenMenuId((current) =>
                                                        current === journey.id
                                                            ? null
                                                            : journey.id
                                                    )
                                                }
                                                aria-label={`Options for ${journey.title}`}
                                                aria-expanded={openMenuId === journey.id}
                                            >
                                                <i className="fa-solid fa-ellipsis"></i>
                                            </button>

                                            {openMenuId === journey.id && (
                                                <div className="studio_journey_menu">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/studio/journey/${journey.id}`
                                                            )
                                                        }
                                                    >
                                                        <i className="fa-solid fa-screwdriver-wrench"></i>
                                                        Open Builder
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(journey)
                                                        }
                                                    >
                                                        <i className="fa-solid fa-pen"></i>
                                                        Edit Journey
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/studio/journey/${journey.id}/preview`
                                                            )
                                                        }
                                                    >
                                                        <i className="fa-regular fa-eye"></i>
                                                        Preview
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() =>
                                                            handleArchiveJourney(journey)
                                                        }
                                                    >
                                                        <i className="fa-solid fa-box-archive"></i>
                                                        Archive Journey
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {editingJourney && (
                    <div
                        className="studio_journey_modal_backdrop"
                        onMouseDown={(event) => {
                            if (
                                event.target === event.currentTarget
                            ) {
                                closeEditModal();
                            }
                        }}
                    >
                        <div className="studio_journey_modal">
                            <header className="studio_journey_modal_header">
                                <div>
                                    <span>Edit Journey</span>
                                    <h2>Journey settings</h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={updating}
                                    aria-label="Close"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </header>

                            <form
                                className="studio_journey_modal_form"
                                onSubmit={handleUpdateJourney}
                            >
                                <div className="studio_journey_form_group">
                                    <label>Title</label>

                                    <input
                                        name="title"
                                        value={editForm.title}
                                        onChange={handleEditChange}
                                        required
                                    />
                                </div>

                                <div className="studio_journey_form_group">
                                    <label>Description</label>

                                    <textarea
                                        name="description"
                                        rows={4}
                                        value={editForm.description}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div className="studio_journey_visual_section">
                                    <div className="studio_journey_visual_header">
                                        <div>
                                            <h3>Journey appearance</h3>
                                            <p>
                                                Choose a cover and an icon for this Learning
                                                Journey.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="studio_journey_cover_editor">
                                        <div className="studio_journey_cover_preview">
                                            {coverPreview ? (
                                                <img
                                                    src={coverPreview}
                                                    alt="Journey cover preview"
                                                />
                                            ) : (
                                                <div>
                                                    <i className="fa-regular fa-image"></i>
                                                    <span>No cover selected</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="studio_journey_cover_actions">
                                            <label className="studio_cover_upload_button">
                                                <i className="fa-solid fa-upload"></i>
                                                Choose image

                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={handleCoverSelection}
                                                    hidden
                                                />
                                            </label>

                                            {(coverPreview || editingJourney?.cover_url) && (
                                                <button
                                                    type="button"
                                                    className="studio_cover_remove_button"
                                                    onClick={handleRemoveJourneyCover}
                                                    disabled={uploadingCover}
                                                >
                                                    <i className="fa-regular fa-trash-can"></i>
                                                    Remove
                                                </button>
                                            )}

                                            <small>JPG, PNG or WEBP · Maximum 5 MB</small>
                                        </div>
                                    </div>

                                    <div className="studio_journey_visual_types">
                                        <button
                                            type="button"
                                            className={
                                                editForm.visualType === "ICON"
                                                    ? "selected"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setEditForm((current) => ({
                                                    ...current,
                                                    visualType: "ICON",
                                                }))
                                            }
                                        >
                                            <i className="fa-solid fa-icons"></i>
                                            Icon
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                editForm.visualType === "EMOJI"
                                                    ? "selected"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setEditForm((current) => ({
                                                    ...current,
                                                    visualType: "EMOJI",
                                                }))
                                            }
                                        >
                                            <span>✨</span>
                                            Emoji
                                        </button>

                                        <button
                                            type="button"
                                            className={
                                                editForm.visualType === "IMAGE"
                                                    ? "selected"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setEditForm((current) => ({
                                                    ...current,
                                                    visualType: "IMAGE",
                                                }))
                                            }
                                        >
                                            <i className="fa-regular fa-image"></i>
                                            Cover
                                        </button>
                                    </div>

                                    {editForm.visualType === "ICON" && (
                                        <IconPicker
                                            value={editForm.icon}
                                            onChange={(icon) =>
                                                setEditForm((current) => ({
                                                    ...current,
                                                    icon,
                                                    visualType: "ICON",
                                                }))
                                            }
                                        />
                                    )}

                                    {editForm.visualType === "EMOJI" && (
                                        <div className="studio_journey_form_group">
                                            <label>Emoji</label>

                                            <input
                                                name="emoji"
                                                value={editForm.emoji}
                                                onChange={handleEditChange}
                                                placeholder="📘"
                                                maxLength={20}
                                            />
                                        </div>
                                    )}

                                    {editForm.visualType === "IMAGE" &&
                                        !coverPreview && (
                                            <div className="studio_visual_warning">
                                                Upload a cover image to use the image visual.
                                            </div>
                                        )}
                                </div>

                                <div className="studio_journey_form_grid">
                                    <div className="studio_journey_form_group">
                                        <label>Visibility</label>

                                        <select
                                            name="visibility"
                                            value={editForm.visibility}
                                            onChange={handleEditChange}
                                        >
                                            <option value="PRIVATE">
                                                Private
                                            </option>
                                            <option value="UNLISTED">
                                                Unlisted
                                            </option>
                                            <option value="PUBLIC">
                                                Public
                                            </option>
                                        </select>
                                    </div>

                                    <div className="studio_journey_form_group">
                                        <label>Status</label>

                                        <select
                                            name="status"
                                            value={editForm.status}
                                            onChange={handleEditChange}
                                        >
                                            <option value="DRAFT">
                                                Draft
                                            </option>
                                            <option value="PUBLISHED">
                                                Published
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="studio_journey_form_group">
                                    <label>Enrollment mode</label>

                                    <select
                                        name="enrollmentMode"
                                        value={editForm.enrollmentMode}
                                        onChange={handleEditChange}
                                    >
                                        <option value="INVITE_ONLY">
                                            Invite only
                                        </option>
                                        <option value="PRIVATE_LINK">
                                            Private link
                                        </option>
                                        <option value="OPEN">
                                            Open enrollment
                                        </option>
                                        <option value="PURCHASE">
                                            Purchase
                                        </option>
                                    </select>
                                </div>

                                <div className="studio_journey_form_grid">
                                    <div className="studio_journey_form_group">
                                        <label>Difficulty</label>

                                        <select
                                            name="difficulty"
                                            value={editForm.difficulty}
                                            onChange={handleEditChange}
                                        >
                                            <option value="">
                                                Not specified
                                            </option>
                                            <option value="BEGINNER">
                                                Beginner
                                            </option>
                                            <option value="INTERMEDIATE">
                                                Intermediate
                                            </option>
                                            <option value="ADVANCED">
                                                Advanced
                                            </option>
                                        </select>
                                    </div>

                                    <div className="studio_journey_form_group">
                                        <label>Language</label>

                                        <input
                                            name="language"
                                            value={editForm.language}
                                            onChange={handleEditChange}
                                            placeholder="es"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>

                                <div className="studio_journey_form_group">
                                    <label>Estimated minutes</label>

                                    <input
                                        name="estimatedMinutes"
                                        type="number"
                                        min="0"
                                        value={editForm.estimatedMinutes}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <footer className="studio_journey_modal_actions">
                                    <button
                                        type="button"
                                        className="studio_journey_modal_cancel"
                                        onClick={closeEditModal}
                                        disabled={updating}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="studio_journey_modal_save"
                                        disabled={updating}
                                    >
                                        {updating ? (
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
                                </footer>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </StudioLayout>
    );
}