import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ProtectedRoute.css";

export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="auth_loading_page">
        <div className="auth_loading_card">
          <div className="auth_loader">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <h2>Preparing your studio</h2>
          <p>Checking your session and loading your workspace...</p>
        </div>
      </div>
    );
  }

if (
  user?.status ===
  "PENDING_DELETION"
) {
  return (
    <Navigate
      to="/account-recovery"
      replace
    />
  );
}

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  

  return children;
}