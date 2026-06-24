import "./SettingsContent.css";
import { useAuth } from "../../../../context/AuthContext";
import { useState } from "react";
import ConfigEdit from "./configEdit/ConfigEdit";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../../api/api";

export default function SettingsContent() {
    const { user, authLoading, logout } = useAuth();
    const navigate = useNavigate();

    const [isEditOpen, setIsEditOpen] = useState(false);

    const [actionModal, setActionModal] = useState(null);
    const [password, setPassword] = useState("");
    const [reason, setReason] = useState("");
    const [actionError, setActionError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    if (authLoading) {
        return (
            <div className="settings_content">
                <div className="settings_card settings_loading">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Loading account settings...</span>
                </div>
            </div>
        );
    }

    const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    const username = user?.email ? `@${user.email.split("@")[0]}` : "@user";

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : "Not available";

    const roleLabel =
        user?.role === "EDUCATOR"
            ? "Educator"
            : user?.role === "STUDENT"
            ? "Learner"
            : user?.role || "User";

    const isDeleteAction = actionModal === "delete" || actionModal === "deactivate";

    function openActionModal(type) {
        setActionModal(type);
        setPassword("");
        setActionError("");

        if (type === "deactivate") {
            setReason("Temporary deactivation requested");
        } else if (type === "delete") {
            setReason("Account deletion requested");
        } else {
            setReason("");
        }
    }

    function closeActionModal() {
        if (actionLoading) return;

        setActionModal(null);
        setPassword("");
        setReason("");
        setActionError("");
    }

    function handleDownloadMyData() {
        const data = {
            exportedAt: new Date().toISOString(),
            account: {
                id: user?.id,
                firstName: user?.first_name,
                lastName: user?.last_name,
                email: user?.email,
                role: user?.role,
                avatarUrl: user?.avatar_url,
                status: user?.status,
                timezone: user?.timezone,
                language: user?.language,
                theme: user?.theme,
                notificationsEnabled: user?.notifications_enabled,
                createdAt: user?.created_at,
                updatedAt: user?.updated_at,
            },
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "maze-studio-account-data.json";
        link.click();

        URL.revokeObjectURL(url);
    }

    async function handleAccountAction(e) {
        e.preventDefault();

        if (!password.trim()) {
            setActionError("Password is required");
            return;
        }

        setActionError("");
        setActionLoading(true);

        try {
            await apiRequest("/users/account", {
                method: "DELETE",
                body: JSON.stringify({
                    password,
                    reason: reason || "User requested account deletion",
                }),
            });

            logout();
            navigate("/login", { replace: true });
        } catch (err) {
            setActionError(err.message || "Could not process account action");
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <>
            <div className="settings_content">
                <ConfigEdit isEditOpen={isEditOpen} setIsEditOpen={setIsEditOpen} />

                <div className="settings_card">
                    <div className="settings_card_header">
                        <h2>Profile Information</h2>

                        <button className="settings_button" onClick={() => setIsEditOpen(true)}>
                            <i className="fa-solid fa-pen"></i>
                            Edit Profile
                        </button>
                    </div>

                    <div className="profile_info">
                        <div className="profile_avatar">
                            <img
                                src={
                                    user?.avatar_url
                                        ? `${user.avatar_url}?v=${user?.updated_at || ""}`
                                        : "https://freesvg.org/img/abstract-user-flat-4.png"
                                }
                                alt={fullName || "Profile avatar"}
                            />

                            <button onClick={() => setIsEditOpen(true)}>
                                <i className="fa-solid fa-camera"></i>
                            </button>
                        </div>

                        <div className="profile_grid">
                            <div>
                                <span>Full Name</span>
                                <h4>{fullName || "Not set"}</h4>
                            </div>

                            <div>
                                <span>Username</span>
                                <h4>{username}</h4>
                            </div>

                            <div>
                                <span>Email Address</span>
                                <h4>{user?.email || "Not available"}</h4>
                            </div>

                            <div>
                                <span>Member Since</span>
                                <h4>{memberSince}</h4>
                            </div>

                            <div>
                                <span>Role</span>
                                <h4>{roleLabel}</h4>
                            </div>

                            <div>
                                <span>Time Zone</span>
                                <h4>{user?.timezone || "Not configured"}</h4>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings_card">
                    <h2>Account Preferences</h2>

                    <div className="preference_row">
                        <div className="preference_left">
                            <div className="preference_icon purple">
                                <i className="fa-solid fa-table-columns"></i>
                            </div>

                            <div>
                                <h4>Default Dashboard</h4>
                                <span>Choose what you see when you log in.</span>
                            </div>
                        </div>

                        <select defaultValue="overview">
                            <option value="overview">Overview</option>
                        </select>
                    </div>

                    <div className="preference_row">
                        <div className="preference_left">
                            <div className="preference_icon blue">
                                <i className="fa-solid fa-list"></i>
                            </div>

                            <div>
                                <h4>Items per page</h4>
                                <span>Select how many items to display in lists.</span>
                            </div>
                        </div>

                        <select defaultValue="10">
                            <option value="10">10</option>
                        </select>
                    </div>

                    <div className="preference_row">
                        <div className="preference_left">
                            <div className="preference_icon green">
                                <i className="fa-solid fa-check"></i>
                            </div>

                            <div>
                                <h4>Auto-save</h4>
                                <span>Automatically save changes as you work.</span>
                            </div>
                        </div>

                        <label className="switch">
                            <input type="checkbox" defaultChecked />
                            <span></span>
                        </label>
                    </div>

                    <div className="preference_row">
                        <div className="preference_left">
                            <div className="preference_icon yellow">
                                <i className="fa-regular fa-lightbulb"></i>
                            </div>

                            <div>
                                <h4>Show tips and suggestions</h4>
                                <span>Receive helpful tips to improve your experience.</span>
                            </div>
                        </div>

                        <label className="switch">
                            <input type="checkbox" defaultChecked />
                            <span></span>
                        </label>
                    </div>
                </div>

                <div className="settings_card">
                    <div className="settings_card_header">
                        <div>
                            <h2>Connected Accounts</h2>
                            <p>Manage your connected accounts and third-party services.</p>
                        </div>

                        <button className="settings_button">Manage Integrations</button>
                    </div>

                    <div className="integrations_grid">
                        <div className="integration">
                            <i className="fa-brands fa-google"></i>
                            <div>
                                <h4>Google</h4>
                                <span>Not connected</span>
                            </div>
                        </div>

                        <div className="integration">
                            <i className="fa-regular fa-calendar-days"></i>
                            <div>
                                <h4>Calendar</h4>
                                <span>Not connected</span>
                            </div>
                        </div>

                        <div className="integration">
                            <i className="fa-solid fa-video"></i>
                            <div>
                                <h4>Zoom</h4>
                                <span>Not connected</span>
                            </div>
                        </div>

                        <div className="integration">
                            <i className="fa-brands fa-slack"></i>
                            <div>
                                <h4>Slack</h4>
                                <span>Not connected</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings_side_content">
                    <div className="settings_side_card">
                        <h2>Subscription Plan</h2>

                        <div className="subscription_info">
                            <div className="subscription_icon">
                                <i className="fa-solid fa-crown"></i>
                            </div>

                            <div>
                                <h4>{user?.role === "EDUCATOR" ? "Educator Plan" : "Learner Plan"}</h4>
                                <p>
                                    {user?.role === "EDUCATOR"
                                        ? "Manage your educator subscription and billing."
                                        : "Learner accounts can access invited journeys."}
                                </p>
                            </div>
                        </div>

                        <button className="settings_side_button">
                            Manage Subscription
                        </button>
                    </div>

                    <div className="settings_side_card">
                        <h2>Quick Actions</h2>

                        <button className="quick_action" onClick={handleDownloadMyData}>
                            <i className="fa-solid fa-download"></i>

                            <div>
                                <h4>Download My Data</h4>
                                <p>Export your account data</p>
                            </div>

                            <i className="fa-solid fa-chevron-right"></i>
                        </button>

                        <button className="quick_action" onClick={() => openActionModal("deactivate")}>
                            <i className="fa-regular fa-clock"></i>

                            <div>
                                <h4>Deactivate Account</h4>
                                <p>Schedule your account for deletion</p>
                            </div>

                            <i className="fa-solid fa-chevron-right"></i>
                        </button>

                        <button className="quick_action danger" onClick={() => openActionModal("delete")}>
                            <i className="fa-regular fa-trash-can"></i>

                            <div>
                                <h4>Delete Account</h4>
                                <p>Your account can be restored within 30 days</p>
                            </div>

                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            {isDeleteAction && (
                <div className="delete_account_overlay">
                    <div className="delete_account_modal">
                        <button
                            className="delete_account_close"
                            type="button"
                            onClick={closeActionModal}
                            disabled={actionLoading}
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                        <div className="delete_account_icon">
                            <i
                                className={
                                    actionModal === "delete"
                                        ? "fa-solid fa-triangle-exclamation"
                                        : "fa-regular fa-clock"
                                }
                            ></i>
                        </div>

                        <h2>
                            {actionModal === "delete"
                                ? "Delete your account?"
                                : "Deactivate your account?"}
                        </h2>

                        <p>
                            {actionModal === "delete"
                                ? "Your account will be scheduled for deletion. You can restore it within 30 days by logging in again."
                                : "Your account will be temporarily deactivated and scheduled for deletion. You can restore it within 30 days."}
                        </p>

                        <form onSubmit={handleAccountAction}>
                            {actionError && (
                                <div className="delete_account_error">
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    <span>{actionError}</span>
                                </div>
                            )}

                            <div className="delete_account_group">
                                <label>Reason</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Optional reason"
                                ></textarea>
                            </div>

                            <div className="delete_account_group">
                                <label>Confirm password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>

                            <div className="delete_account_actions">
                                <button
                                    type="button"
                                    className="delete_cancel_btn"
                                    onClick={closeActionModal}
                                    disabled={actionLoading}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className={
                                        actionModal === "delete"
                                            ? "delete_confirm_btn danger"
                                            : "delete_confirm_btn"
                                    }
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                            Processing...
                                        </>
                                    ) : actionModal === "delete" ? (
                                        "Delete account"
                                    ) : (
                                        "Deactivate account"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}