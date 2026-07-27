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
import Security from "./components/pages/settings/security/Security";
import ForgotPassword from "./components/pages/forgotPassword/ForgotPassword";
import ResetPassword from "./components/pages/forgotPassword/ResetPassword";
import RegisterSuccess from "./components/pages/registerSucces/registerSucces";
import Billing from "./components/pages/settings/billing/Billing";
import JourneyBuilder from "./components/pages/studio/journeyBuilder/JourneyBuilder";
import StepEditor from "./components/pages/studio/stepEditor/StepEditor";

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

                <Route path="/my-settings/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />

                <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />

                <Route path="/my-settings/account" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                    path="/register/success"
                    element={<RegisterSuccess />}
                />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route
                    path="/my-settings/billing"
                    element={
                        <ProtectedRoute>
                            <Billing />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/studio/journey/:journeyId"
                    element={
                        <ProtectedRoute>
                            <JourneyBuilder />
                        </ProtectedRoute>
                    }
                />

                <Route
    path="/studio/journey/:journeyId/preview"
    element={
        <ProtectedRoute>
            <JourneyBuilder previewMode />
        </ProtectedRoute>
    }
/>
<Route
    path="/studio/step/:stepId"
    element={
        <ProtectedRoute>
            <StepEditor />
        </ProtectedRoute>
    }
/>


            </Routes>



        </BrowserRouter>
    );
}
