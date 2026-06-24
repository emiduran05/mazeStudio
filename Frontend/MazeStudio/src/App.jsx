import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./components/pages/landing/Landing";
import Login from "./components/pages/login/Login";
import Register from "./components/pages/register/Register";
import ContentBuilder from "./components/contentBuilder/ContentBuilder";
import Studio from "./components/pages/studio/Studio";
import Settings from "./components/pages/settings/Settings";
import ProtectedRoute from "./routes/ProtectedRoute";
import AccountRecovery from "./components/pages/recovery/AccountRecovery";
import ProtectedPendingRoute from "./routes/ProtectedPendingRoute";

export default function App() {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/content-builder" element={<ContentBuilder />} />
                <Route
                    path="/account-recovery"
                    element={<ProtectedPendingRoute><AccountRecovery /></ProtectedPendingRoute>}
                />

                <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />

                <Route path="/my-settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            </Routes>

        </BrowserRouter>
    );
}
