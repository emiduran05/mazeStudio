import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StudioLayout from "../../../layouts/studioLayout/StudioLayout";
import { apiRequest } from "../../../../api/api";
import IconPicker from "../../../../components/iconPicker/IconPicker";
import {
    uploadStepImage,
    deleteStepImage,
} from "../../../../api/imageApi";
import BlockPicker from "./components/BlockPicker";
import BlockTree from "./components/BlockTree";
import {createPrivateStepLink,listPrivateStepLinks,revokePrivateStepLink} from "../../../../api/privateStepApi";
import "./StepEditor.css";

function createClientId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getInitialBlockData(blockType) {
    switch (blockType) {
        case "HEADING":
            return {
                content: { text: "", level: 2 },
                settings: { alignment: "left" },
            };

        case "TEXT":
            return {
                content: { text: "" },
                settings: {},
            };

        case "IMAGE":
            return {
                content: {
                    url: "",
                    objectKey: "",
                    name: "",
                    mimeType: "",
                    size: 0,
                    caption: "",
                    alt: "",
                },
                settings: {},
            };

        case "VIDEO":
            return {
                content: { url: "", caption: "" },
                settings: {},
            };

        case "AUDIO":
            return {
                content: {
                    url: "",
                    objectKey: "",
                    name: "",
                    mimeType: "",
                    size: 0,
                },
                settings: { autoplay: false, controls: true },
            };

        case "FILE":
        case "PDF":
            return {
                content: {
                    url: "",
                    objectKey: "",
                    name: "",
                    mimeType: "",
                    size: 0,
                },
                settings: {},
            };

        case "CODE":
            return {
                content: { code: "" },
                settings: { language: "javascript" },
            };

        case "QUOTE":
            return {
                content: { text: "", author: "" },
                settings: {},
            };

        case "CALLOUT":
            return {
                content: { text: "" },
                settings: { icon: "💡", variant: "INFO" },
            };

        case "DIVIDER":
            return {
                content: {},
                settings: { style: "solid" },
            };

        case "EMBED":
            return {
                content: { url: "", title: "" },
                settings: { height: 500 },
            };

        case "BUTTON":
            return {
                content: { label: "Open link", url: "" },
                settings: {
                    variant: "primary",
                    alignment: "left",
                    openInNewTab: true,
                },
            };

        case "TABLE":
            return {
                content: {
                    rows: [
                        [
                            { value: "Column 1", isHeader: true },
                            { value: "Column 2", isHeader: true },
                        ],
                        [
                            { value: "", isHeader: false },
                            { value: "", isHeader: false },
                        ],
                    ],
                },
                settings: {
                    striped: false,
                    showBorders: true,
                    headerRow: true,
                },
            };

        case "MULTIPLE_CHOICE":
            return {
                content: {
                    question: "",
                    options: [
                        {
                            id: createClientId(),
                            text: "",
                            isCorrect: true,
                        },
                        {
                            id: createClientId(),
                            text: "",
                            isCorrect: false,
                        },
                    ],
                    explanation: "",
                },
                settings: {
                    shuffleOptions: false,
                    allowMultiple: false,
                    points: 1,
                },
            };

        case "TRUE_FALSE":
            return {
                content: {
                    statement: "",
                    correctAnswer: true,
                    explanation: "",
                },
                settings: { points: 1 },
            };

        case "SHORT_ANSWER":
            return {
                content: {
                    question: "",
                    acceptedAnswers: [""],
                    explanation: "",
                },
                settings: {
                    caseSensitive: false,
                    trimWhitespace: true,
                    points: 1,
                },
            };

        case "FILL_BLANKS":
            return {
                content: {
                    text: "The answer is {{blank}}.",
                    acceptedAnswers: [""],
                    explanation: "",
                },
                settings: {
                    caseSensitive: false,
                    points: 1,
                },
            };

        case "MATCHING":
            return {
                content: {
                    pairs: [
                        { id: createClientId(), left: "", right: "" },
                        { id: createClientId(), left: "", right: "" },
                    ],
                },
                settings: {
                    shuffleRightColumn: true,
                    points: 2,
                },
            };

        case "ORDERING":
            return {
                content: {
                    prompt: "",
                    items: [
                        { id: createClientId(), text: "" },
                        { id: createClientId(), text: "" },
                    ],
                },
                settings: { points: 2 },
            };

        case "CHALLENGE":
            return {
                content: { challengeId: "" },
                settings: { required: true, completionRule: "SUBMITTED" },
            };

        default:
            return { content: {}, settings: {} };
    }
}

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

    const [blocks, setBlocks] = useState([]);
    const [loadingBlocks, setLoadingBlocks] = useState(true);
    const [blockPickerOpen, setBlockPickerOpen] = useState(false);
    const [blockPickerParentId, setBlockPickerParentId] = useState(null);
    const [creatingBlock, setCreatingBlock] = useState(false);
    const [availableChallenges, setAvailableChallenges] = useState([]);
    const [privateLinksOpen,setPrivateLinksOpen]=useState(false);
    const [privateLearners,setPrivateLearners]=useState([]);
    const [privateLinks,setPrivateLinks]=useState([]);
    const [privateLinkForm,setPrivateLinkForm]=useState({targetEnrollmentId:"",expiresAt:"",maxUses:""});
    const [createdPrivateUrl,setCreatedPrivateUrl]=useState("");

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
                    estimatedMinutes: loadedStep.estimated_minutes ?? "",
                    isPreview: Boolean(loadedStep.is_preview),
                    visualType: loadedStep.visual_type || "ICON",
                    icon: loadedStep.icon || "fa-file-lines",
                    emoji: loadedStep.emoji || "",
                    color: loadedStep.color || "purple",
                });
                const challengeData = await apiRequest(
                    `/learning-journeys/${loadedStep.learning_journey_id}/challenges`
                );
                setAvailableChallenges(
                    (challengeData.challenges || []).filter(
                        (challenge) => challenge.status !== "ARCHIVED"
                    )
                );
            } catch (err) {
                setError(err.message || "Could not load this Step.");
            } finally {
                setLoading(false);
            }
        }

        loadStep();
    }, [stepId]);

    useEffect(() => {
        async function loadBlocks() {
            setLoadingBlocks(true);

            try {
                const data = await apiRequest(`/steps/${stepId}/blocks`);
                setBlocks(data.blocks || []);
            } catch (err) {
                setError(err.message || "Could not load the Step blocks.");
            } finally {
                setLoadingBlocks(false);
            }
        }

        loadBlocks();
    }, [stepId]);

    useEffect(() => {
        return () => {
            if (imagePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    function openBlockPicker(parentBlockId = null) {
        setBlockPickerParentId(parentBlockId);
        setBlockPickerOpen(true);
        setError("");
        setMessage("");
    }

    function closeBlockPicker() {
        if (creatingBlock) return;

        setBlockPickerOpen(false);
        setBlockPickerParentId(null);
    }

    async function openPrivateLinks(){
        setError("");setCreatedPrivateUrl("");
        try{
            const [enrollmentData,linkData]=await Promise.all([
                apiRequest(`/learning-journeys/${step.learning_journey_id}/enrollments`),
                listPrivateStepLinks(stepId),
            ]);
            setPrivateLearners((enrollmentData.enrollments||[]).filter((item)=>!item.linked_user_id&&["ACTIVE","COMPLETED"].includes(item.status)));
            setPrivateLinks(linkData.links||[]);
            setPrivateLinksOpen(true);
        }catch(err){setError(err.message||"Could not load private Step links.")}
    }
    async function createStepLink(event){
        event.preventDefault();
        try{
            const link=await createPrivateStepLink(stepId,{
                targetEnrollmentId:privateLinkForm.targetEnrollmentId,
                expiresAt:privateLinkForm.expiresAt||null,
                maxUses:privateLinkForm.maxUses?Number(privateLinkForm.maxUses):null,
            });
            setPrivateLinks((current)=>[link,...current]);
            setCreatedPrivateUrl(`${window.location.origin}/step/private/${link.token}`);
        }catch(err){setError(err.message)}
    }
    async function revokeStepLink(id){
        try{await revokePrivateStepLink(id);setPrivateLinks((current)=>current.map((link)=>link.id===id?{...link,status:"REVOKED"}:link))}
        catch(err){setError(err.message)}
    }

    function handleReplaceBlock(updatedBlock) {
        setBlocks((current) =>
            current.map((block) =>
                block.id === updatedBlock.id
                    ? { ...block, ...updatedBlock }
                    : block
            )
        );
    }

    async function handleCreateBlock(blockType) {
        setCreatingBlock(true);
        setError("");
        setMessage("");

        try {
            const initialData = getInitialBlockData(blockType);
            if (blockType === "CHALLENGE") {
                if (!availableChallenges.length) {
                    throw new Error(
                        "Create a Challenge in this Learning Journey before adding this Block."
                    );
                }
                initialData.content.challengeId = availableChallenges[0].id;
            }
            const data = await apiRequest(`/steps/${stepId}/blocks`, {
                method: "POST",
                body: JSON.stringify({
                    blockType,
                    parentBlockId: blockPickerParentId,
                    content: initialData.content,
                    settings: initialData.settings,
                }),
            });

            setBlocks((current) => [...current, data.block]);
            closeBlockPicker();
        } catch (err) {
            setError(err.message || "Could not create the Block.");
        } finally {
            setCreatingBlock(false);
        }
    }

    async function handleCreateLayout(preset) {
        if (blockPickerParentId !== null) {
            setError("Layouts can only be added at the root of the Step.");
            return;
        }

        setCreatingBlock(true);
        setError("");
        setMessage("");

        try {
            const data = await apiRequest(`/steps/${stepId}/layouts`, {
                method: "POST",
                body: JSON.stringify({ preset }),
            });

            setBlocks((current) => [
                ...current,
                data.layout,
                ...(data.columns || []),
            ]);

            closeBlockPicker();
        } catch (err) {
            setError(err.message || "Could not create the Layout.");
        } finally {
            setCreatingBlock(false);
        }
    }

    async function handleUpdateBlock(blockId, changes) {
        setError("");
        setMessage("");

        try {
            const data = await apiRequest(`/blocks/${blockId}`, {
                method: "PUT",
                body: JSON.stringify(changes),
            });

            handleReplaceBlock(data.block);
            setMessage("Block saved successfully.");
            return data.block;
        } catch (err) {
            setError(err.message || "Could not update the Block.");
            throw err;
        }
    }

    function collectDescendantIds(rootId, sourceBlocks) {
        const ids = new Set([rootId]);
        let changed = true;

        while (changed) {
            changed = false;

            sourceBlocks.forEach((candidate) => {
                if (
                    candidate.parent_block_id &&
                    ids.has(candidate.parent_block_id) &&
                    !ids.has(candidate.id)
                ) {
                    ids.add(candidate.id);
                    changed = true;
                }
            });
        }

        return ids;
    }

    async function handleDeleteBlock(block) {
        const label = block.block_type === "LAYOUT" ? "layout" : "block";
        const confirmed = window.confirm(
            `Delete this ${label}?${
                block.block_type === "LAYOUT"
                    ? " All columns and child blocks will also be deleted."
                    : ""
            }`
        );

        if (!confirmed) return;

        setError("");
        setMessage("");

        try {
            await apiRequest(`/blocks/${block.id}`, {
                method: "DELETE",
            });

            setBlocks((current) => {
                const deletedIds = collectDescendantIds(block.id, current);
                const remaining = current.filter(
                    (item) => !deletedIds.has(item.id)
                );

                const siblings = remaining
                    .filter(
                        (item) =>
                            item.parent_block_id === block.parent_block_id
                    )
                    .sort((a, b) => a.position - b.position);

                const positionById = new Map(
                    siblings.map((item, index) => [item.id, index + 1])
                );

                return remaining.map((item) =>
                    positionById.has(item.id)
                        ? { ...item, position: positionById.get(item.id) }
                        : item
                );
            });

            setMessage("Block deleted successfully.");
        } catch (err) {
            setError(err.message || "Could not delete the Block.");
        }
    }

    async function handleReorderBlocks({
    parentBlockId,
    reorderedBlocks,
}) {
    const previousBlocks = blocks;

    const reorderedIds = reorderedBlocks.map(
        (block) => block.id
    );

    setBlocks((current) => {
        const positionById = new Map(
            reorderedIds.map((id, index) => [
                id,
                index + 1,
            ])
        );

        return current.map((block) => {
            const currentParentId =
                block.parent_block_id ?? null;

            if (currentParentId !== parentBlockId) {
                return block;
            }

            return {
                ...block,
                position:
                    positionById.get(block.id) ??
                    block.position,
            };
        });
    });

    try {
        const data = await apiRequest(
            `/steps/${stepId}/blocks/reorder`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    parentBlockId,
                    blockIds: reorderedIds,
                }),
            }
        );

        const persistedBlocks = data.blocks || [];

        setBlocks((current) => {
            const persistedById = new Map(
                persistedBlocks.map((block) => [
                    block.id,
                    block,
                ])
            );

            return current.map((block) =>
                persistedById.has(block.id)
                    ? {
                          ...block,
                          ...persistedById.get(block.id),
                      }
                    : block
            );
        });
    } catch (err) {
        setBlocks(previousBlocks);

        setError(
            err.message ||
                "Could not reorder the Blocks."
        );
    }
}

    function handleChange(event) {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function selectVisualType(visualType) {
        setForm((current) => ({ ...current, visualType }));
        setError("");
        setMessage("");
    }

    function handleImageSelection(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            setError("Only JPG, PNG and WEBP images are allowed.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("The image must be smaller than 5 MB.");
            event.target.value = "";
            return;
        }

        if (imagePreview?.startsWith("blob:")) {
            URL.revokeObjectURL(imagePreview);
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setForm((current) => ({ ...current, visualType: "IMAGE" }));
        setError("");
        setMessage("");
    }

    async function handleRemoveStepImage() {
        setError("");
        setMessage("");

        if (imageFile) {
            if (imagePreview?.startsWith("blob:")) {
                URL.revokeObjectURL(imagePreview);
            }

            setImageFile(null);
            setImagePreview(step?.image_url || "");
            setForm((current) => ({
                ...current,
                visualType: step?.image_url ? "IMAGE" : "ICON",
            }));
            return;
        }

        if (!step?.image_url) {
            setImagePreview("");
            setForm((current) => ({ ...current, visualType: "ICON" }));
            return;
        }

        if (!window.confirm("Remove the custom Step image?")) return;

        setUploadingImage(true);

        try {
            const data = await deleteStepImage(stepId);
            const updatedStep = data.step;

            setStep(updatedStep);
            setImageFile(null);
            setImagePreview("");
            setForm((current) => ({
                ...current,
                visualType: updatedStep.visual_type || "ICON",
            }));
            setMessage("Step image removed successfully.");
        } catch (err) {
            setError(err.message || "Could not remove the image.");
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

        if (form.visualType === "EMOJI" && !form.emoji.trim()) {
            setError("Select or enter an emoji before saving.");
            return;
        }

        if (
            form.visualType === "IMAGE" &&
            !imageFile &&
            !step?.image_url
        ) {
            setError("Select an image before using the image appearance.");
            return;
        }

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const data = await apiRequest(`/steps/${stepId}`, {
                method: "PUT",
                body: JSON.stringify({
                    title: form.title.trim(),
                    description: form.description.trim() || null,
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

            if (imageFile) {
                setUploadingImage(true);
                const imageData = await uploadStepImage(stepId, imageFile);
                updatedStep = imageData.step;
            }

            setStep(updatedStep);
            setImageFile(null);
            setImagePreview(updatedStep.image_url || "");
            setForm({
                title: updatedStep.title || "",
                description: updatedStep.description || "",
                status: updatedStep.status || "DRAFT",
                estimatedMinutes: updatedStep.estimated_minutes ?? "",
                isPreview: Boolean(updatedStep.is_preview),
                visualType: updatedStep.visual_type || "ICON",
                icon: updatedStep.icon || "fa-file-lines",
                emoji: updatedStep.emoji || "",
                color: updatedStep.color || "purple",
            });
            setMessage("Step updated successfully.");
        } catch (err) {
            setError(err.message || "Could not update the Step.");
        } finally {
            setSaving(false);
            setUploadingImage(false);
        }
    }

    function renderCurrentVisual() {
        if (form.visualType === "IMAGE" && imagePreview) {
            return <img src={imagePreview} alt="Step appearance preview" />;
        }

        if (form.visualType === "EMOJI" && form.emoji) {
            return <span>{form.emoji}</span>;
        }

        return (
            <i
                className={`fa-solid ${form.icon || "fa-file-lines"}`}
            />
        );
    }

    if (loading) {
        return (
            <StudioLayout>
                <div className="step_editor_loading">
                    <i className="fa-solid fa-spinner fa-spin" />
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
                    <i className="fa-solid fa-triangle-exclamation" />
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
                            <i className="fa-solid fa-arrow-left" />
                            Back to Journey
                        </button>

                        <span className="step_editor_badge">
                            {step?.status}
                        </span>

                        <h1>{step?.title}</h1>
                        <p>
                            Configure this Step and start adding learning
                            content.
                        </p>
                    </div>

                    <div className="step_editor_header_actions">
                        <button type="button" className="step_preview_button" onClick={openPrivateLinks}><i className="fa-solid fa-link"/> Private links</button>
                        <Link
                            to={`/studio/step/${stepId}/preview`}
                            className="step_preview_button"
                        >
                            <i className="fa-regular fa-eye" />
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
                                    <i className="fa-solid fa-spinner fa-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-check" />
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
                                    Blocks will be used to build the learning
                                    experience.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="add_block_button"
                                onClick={() => openBlockPicker(null)}
                            >
                                <i className="fa-solid fa-plus" />
                                Add block
                            </button>
                        </div>

                        {loadingBlocks ? (
                            <div className="step_content_empty">
                                <div>
                                    <i className="fa-solid fa-spinner fa-spin" />
                                </div>
                                <h3>Loading content</h3>
                                <p>Preparing your Step blocks...</p>
                            </div>
                        ) : blocks.length === 0 ? (
                            <div className="step_content_empty">
                                <div>
                                    <i className="fa-solid fa-cubes-stacked" />
                                </div>
                                <h3>This Step has no content yet</h3>
                                <p>
                                    Add headings, text, images, videos, code and
                                    other learning blocks.
                                </p>
                                <button
                                    type="button"
                                    className="add_block_button"
                                    onClick={() => openBlockPicker(null)}
                                >
                                    <i className="fa-solid fa-plus" />
                                    Add first block
                                </button>
                            </div>
                        ) : (
                            <>
                                <BlockTree
                                    blocks={blocks}
                                    onUpdate={handleUpdateBlock}
                                    onDelete={handleDeleteBlock}
                                    onReplace={handleReplaceBlock}
                                    onReorder={handleReorderBlocks}
                                    onAddBlock={openBlockPicker}
                                    availableChallenges={availableChallenges}
                                />

                                <button
                                    type="button"
                                    className="step_add_block_bottom"
                                    onClick={() => openBlockPicker(null)}
                                >
                                    <i className="fa-solid fa-plus" />
                                    Add another block
                                </button>
                            </>
                        )}
                    </section>

                    <aside className="step_settings_card">
                        <div className="step_settings_header">
                            <h2>Step settings</h2>
                            <p>Configure information and visibility.</p>
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
                                    <option value="DRAFT">Draft</option>
                                    <option value="PUBLISHED">Published</option>
                                    <option value="ARCHIVED">Archived</option>
                                </select>
                            </div>

                            <div className="step_form_group">
                                <label>Estimated minutes</label>
                                <input
                                    name="estimatedMinutes"
                                    type="number"
                                    min="0"
                                    value={form.estimatedMinutes}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="step_visual_settings">
                                <div className="step_visual_header">
                                    <div>
                                        <h3>Step appearance</h3>
                                        <p>
                                            Choose how this Step appears in the
                                            Journey structure.
                                        </p>
                                    </div>

                                    <div
                                        className={`step_visual_current ${
                                            form.visualType === "IMAGE"
                                                ? "has-image"
                                                : ""
                                        }`}
                                        data-color={form.color}
                                    >
                                        {renderCurrentVisual()}
                                    </div>
                                </div>

                                <div className="step_visual_type_tabs">
                                    <button
                                        type="button"
                                        className={
                                            form.visualType === "ICON"
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() => selectVisualType("ICON")}
                                    >
                                        <i className="fa-solid fa-icons" />
                                        Icon
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            form.visualType === "EMOJI"
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            selectVisualType("EMOJI")
                                        }
                                    >
                                        <span>✨</span>
                                        Emoji
                                    </button>

                                    <button
                                        type="button"
                                        className={
                                            form.visualType === "IMAGE"
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() =>
                                            selectVisualType("IMAGE")
                                        }
                                    >
                                        <i className="fa-regular fa-image" />
                                        Image
                                    </button>
                                </div>

                                {form.visualType === "ICON" && (
                                    <>
                                        <IconPicker
                                            value={form.icon}
                                            color={form.color}
                                            onChange={(icon) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    icon,
                                                    visualType: "ICON",
                                                }))
                                            }
                                        />

                                        <div className="step_form_group">
                                            <label>Icon color</label>
                                            <select
                                                name="color"
                                                value={form.color}
                                                onChange={handleChange}
                                            >
                                                <option value="purple">
                                                    Purple
                                                </option>
                                                <option value="blue">Blue</option>
                                                <option value="green">
                                                    Green
                                                </option>
                                                <option value="orange">
                                                    Orange
                                                </option>
                                                <option value="red">Red</option>
                                                <option value="yellow">
                                                    Yellow
                                                </option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {form.visualType === "EMOJI" && (
                                    <div className="step_form_group">
                                        <label>Emoji</label>
                                        <input
                                            name="emoji"
                                            value={form.emoji}
                                            onChange={handleChange}
                                            placeholder="📘"
                                            maxLength={20}
                                        />
                                    </div>
                                )}

                                {form.visualType === "IMAGE" && (
                                    <div className="step_image_editor">
                                        <div className="step_image_preview">
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview}
                                                    alt="Step visual preview"
                                                />
                                            ) : (
                                                <div>
                                                    <i className="fa-regular fa-image" />
                                                    <span>No image selected</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="step_image_actions">
                                            <label className="step_image_upload">
                                                <i className="fa-solid fa-upload" />
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
                                                    disabled={uploadingImage}
                                                >
                                                    <i className="fa-regular fa-trash-can" />
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <small>
                                            JPG, PNG or WEBP · Maximum 5 MB
                                        </small>
                                    </div>
                                )}
                            </div>

                            <label className="step_preview_toggle">
                                <div>
                                    <strong>Free preview</strong>
                                    <span>
                                        Allow visitors to view this Step without
                                        enrolling.
                                    </span>
                                </div>

                                <input
                                    name="isPreview"
                                    type="checkbox"
                                    checked={form.isPreview}
                                    onChange={handleChange}
                                />
                            </label>
                        </form>
                    </aside>
                </div>

                <BlockPicker
                    isOpen={blockPickerOpen}
                    onClose={closeBlockPicker}
                    onSelect={handleCreateBlock}
                    onSelectLayout={handleCreateLayout}
                />
                {privateLinksOpen&&<div className="step_private_modal_backdrop" onMouseDown={(event)=>event.target===event.currentTarget&&setPrivateLinksOpen(false)}>
                    <section className="step_private_modal">
                        <header><div><span>Account-free access</span><h2>Private Step links</h2><p>Send this Step to a managed Student and save completion to their profile.</p></div><button type="button" onClick={()=>setPrivateLinksOpen(false)}><i className="fa-solid fa-xmark"/></button></header>
                        <form onSubmit={createStepLink}>
                            <label>Student<select required value={privateLinkForm.targetEnrollmentId} onChange={(event)=>setPrivateLinkForm({...privateLinkForm,targetEnrollmentId:event.target.value})}><option value="">Choose a managed Student…</option>{privateLearners.map((learner)=><option key={learner.id} value={learner.id}>{[learner.first_name,learner.last_name].filter(Boolean).join(" ")||learner.email}</option>)}</select></label>
                            <label>Expires<input type="datetime-local" value={privateLinkForm.expiresAt} onChange={(event)=>setPrivateLinkForm({...privateLinkForm,expiresAt:event.target.value})}/></label>
                            <label>Maximum opens<input type="number" min="1" value={privateLinkForm.maxUses} onChange={(event)=>setPrivateLinkForm({...privateLinkForm,maxUses:event.target.value})}/></label>
                            <button type="submit" disabled={!privateLinkForm.targetEnrollmentId}><i className="fa-solid fa-wand-magic-sparkles"/> Generate link</button>
                        </form>
                        {createdPrivateUrl&&<div className="step_private_created"><strong>Copy this link</strong><input readOnly value={createdPrivateUrl}/><button type="button" onClick={()=>navigator.clipboard.writeText(createdPrivateUrl)}>Copy</button></div>}
                        <h3>Existing links</h3>
                        <div className="step_private_links">{privateLinks.map((link)=><div key={link.id}><span><strong>{link.label||"Private Step"}</strong><small>{link.status} · {link.use_count} opens</small></span>{link.status==="ACTIVE"&&<button type="button" onClick={()=>revokeStepLink(link.id)}>Revoke</button>}</div>)}{!privateLinks.length&&<p>No private links for this Step yet.</p>}</div>
                    </section>
                </div>}
            </main>
        </StudioLayout>
    );
}
