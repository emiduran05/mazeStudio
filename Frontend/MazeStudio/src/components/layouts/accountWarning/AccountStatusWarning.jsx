import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../api/api";
import "./AccountStatusWarning.css";

export default function AccountStatusWarning() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user?.status !== "INACTIVE") return null;

  async function handleReactivate() {
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/users/account/reactivate", {
        method: "POST",
      });

      setUser(data.user);
    } catch (err) {
      setError(err.message || "Could not reactivate account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="account_status_warning">
      <div className="account_status_icon">
        <i className="fa-solid fa-triangle-exclamation"></i>
      </div>

      <div className="account_status_content">
        <strong>Your account is deactivated</strong>
        <p>
          Your public Learning Journeys are hidden from discovery, new enrollments
          are disabled, and billing/public features may be paused. You can still
          access your settings and manage your account.
        </p>

        {error && <span className="account_status_error">{error}</span>}
      </div>

      <button onClick={handleReactivate} disabled={loading}>
        {loading ? "Reactivating..." : "Reactivate account"}
      </button>
    </div>
  );
}