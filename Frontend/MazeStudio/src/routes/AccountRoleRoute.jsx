import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AccountRoleRoute({ audience, children }) {
    const { user } = useAuth();
    const isEducator = user?.role === "EDUCATOR";

    if (audience === "educator" && !isEducator) {
        return <Navigate to="/student/settings" replace />;
    }

    if (audience === "learner" && isEducator) {
        return <Navigate to="/my-settings/account" replace />;
    }

    return children;
}
