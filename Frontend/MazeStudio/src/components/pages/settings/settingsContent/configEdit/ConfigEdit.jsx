import { useEffect, useState } from "react";
import { useAuth } from "../../../../../context/AuthContext";
import { apiRequest } from "../../../../../api/api";
import "./ConfigEdit.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function ConfigEdit({ isEditOpen, setIsEditOpen }) {
    const { user, setUser } = useAuth();

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        avatarUrl: "",
        timezone: "",
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user && isEditOpen) {
            setForm({
                firstName: user.first_name || "",
                lastName: user.last_name || "",
                email: user.email || "",
                avatarUrl: user.avatar_url || "",
                timezone: user.timezone || "America/Mexico_City",
            });

            setAvatarPreview(user.avatar_url || "");
            setAvatarFile(null);
            setError("");
        }
    }, [user, isEditOpen]);

    function handleChange(e) {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    }

    function handleAvatarChange(e) {
        const file = e.target.files?.[0];

        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            setError("Only JPG, PNG and WEBP images are allowed");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError("Avatar must be smaller than 2MB");
            return;
        }

        setError("");
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    }

    async function uploadAvatarIfNeeded() {
        if (!avatarFile) return null;

        const token = localStorage.getItem("token");
        const formData = new FormData();

        formData.append("avatar", avatarFile);

        setUploadingAvatar(true);

        const response = await fetch(`${API_URL}/users/avatar`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const data = await response.json().catch(() => ({}));

        setUploadingAvatar(false);

        if (!response.ok) {
            throw new Error(data.message || "Could not upload avatar");
        }

        return data.user;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const avatarUser = await uploadAvatarIfNeeded();

            const avatarUrlToSave =
                avatarUser?.avatar_url || form.avatarUrl || user?.avatar_url || "";

            const data = await apiRequest("/users/profile", {
                method: "PUT",
                body: JSON.stringify({
                    ...form,
                    avatarUrl: avatarUrlToSave,
                }),
            });

            setUser(data.user);
            setIsEditOpen(false);
        } catch (err) {
            setError(err.message || "Could not update profile");
        } finally {
            setLoading(false);
            setUploadingAvatar(false);
        }
    }

    if (!isEditOpen) return null;

    const imageSrc =
        avatarPreview ||
        form.avatarUrl ||
        `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
            form.firstName || form.email || "Maze"
        )}`;

    return (
        <div className="editModal">

            <div className="editModalCard">
                <div className="editModalHeader">
                    <div>
                        <span>Edit account</span>
                        <h2>Profile Information</h2>
                    </div>

                    <button
                        type="button"
                        className="editModalClose"
                        onClick={() => setIsEditOpen(false)}
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <form className="editModalForm" onSubmit={handleSubmit}>
                    {error && (
                        <div className="editModalError">
                            <i className="fa-solid fa-circle-exclamation"></i>
                            {error}
                        </div>
                    )}

                    <div className="editAvatarPreview">
                        <div className="editAvatarImage">
                            <img src={imageSrc} alt="Profile preview" />
                        </div>

                        <div className="editAvatarText">
                            <h4>Profile avatar</h4>
                            <p>Upload a JPG, PNG or WEBP image. Maximum size: 2MB.</p>

                            <label className="editAvatarUpload">
                                <i className="fa-solid fa-cloud-arrow-up"></i>
                                {avatarFile ? "Change selected image" : "Upload image"}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleAvatarChange}
                                />
                            </label>

                            {avatarFile && (
                                <small className="selectedAvatarName">
                                    Selected: {avatarFile.name}
                                </small>
                            )}
                        </div>
                    </div>

                    <div className="editModalGrid">
                        <div className="editFormGroup">
                            <label>First name</label>
                            <input
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                placeholder="First name"
                                required
                            />
                        </div>

                        <div className="editFormGroup">
                            <label>Last name</label>
                            <input
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                placeholder="Last name"
                                required
                            />
                        </div>
                    </div>

                    <div className="editFormGroup">
                        <label>Email address</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="email@example.com"
                            required
                        />
                    </div>

                    <div className="editFormGroup">
                        <label>Timezone</label>
                        <select
                            name="timezone"
                            value={form.timezone}
                            onChange={handleChange}
                        >
                            <option value="America/Mexico_City">America/Mexico_City</option>
                            <option value="America/Monterrey">America/Monterrey</option>
                            <option value="America/New_York">America/New_York</option>
                            <option value="America/Los_Angeles">America/Los_Angeles</option>
                            <option value="Europe/Madrid">Europe/Madrid</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>

                    <div className="editModalActions">
                        <button
                            type="button"
                            className="editCancelBtn"
                            onClick={() => setIsEditOpen(false)}
                            disabled={loading}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="editSaveBtn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    {uploadingAvatar ? "Uploading avatar..." : "Saving..."}
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-check"></i>
                                    Save changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}