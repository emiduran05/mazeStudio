import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
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
import StepPreview from "./components/pages/studio/stepPreview/StepPreview";
import StudentLayout from "./components/layouts/studentLayout/StudentLayout";
import MyLearning from "./components/pages/student/MyLearning";
import CompletedLearning from "./components/pages/student/CompletedLearning";
import Marketplace from "./components/pages/student/Marketplace";
import MarketplaceOffer from "./components/pages/student/MarketplaceOffer";
import StudentNotifications from "./components/pages/student/StudentNotifications";
import StudentSettings from "./components/pages/student/StudentSettings";
import StudentSecurity from "./components/pages/student/StudentSecurity";
import StudentBilling from "./components/pages/student/StudentBilling";
import AccountRoleRoute from "./routes/AccountRoleRoute";
import LearnerJourney from "./components/pages/student/LearnerJourney";
import LearnerStep from "./components/pages/student/LearnerStep";
import LearnerPathMap from "./components/pages/student/LearnerPathMap";
import LearnerChallengePage from "./components/pages/student/LearnerChallengePage";
import PrivateChallenge from "./components/pages/student/PrivateChallenge";
import ChallengeList from "./components/pages/studio/challenges/ChallengeList";
import ChallengeEditor from "./components/pages/studio/challenges/ChallengeEditor";
import ChallengeSubmissions from "./components/pages/studio/challenges/ChallengeSubmissions";
import ChallengeReview from "./components/pages/studio/challenges/ChallengeReview";
import LinkLearnerProfile from "./components/pages/student/LinkLearnerProfile";
import PrivateStep from "./components/pages/student/PrivateStep";
import BecomeEducator from "./components/pages/student/BecomeEducator";
import NotFound from "./components/pages/notFound/NotFound";
import Insights from "./components/pages/insights/Insights";
import Calendar from "./components/pages/calendar/Calendar";
import EducatorProfileEditor from "./components/pages/settings/EducatorProfileEditor";
import EducatorProfile from "./components/pages/student/EducatorProfile";
import PublicStepPreview from "./components/pages/student/PublicStepPreview";

export default function App() {
    if (window.location.pathname.startsWith("//")) {
        const normalizedPath = window.location.pathname.replace(/^\/+/, "/");
        window.history.replaceState(
            window.history.state,
            "",
            `${normalizedPath}${window.location.search}${window.location.hash}`
        );
    }

    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/challenge/private/:token" element={<PrivateChallenge />} />
                <Route path="/step/private/:token" element={<PrivateStep />} />
                <Route path="/link-learner-profile" element={<LinkLearnerProfile />} />
                <Route path="/content-builder" element={<ContentBuilder />} />
                <Route
                    path="/account-recovery"
                    element={<ProtectedPendingRoute><AccountRecovery /></ProtectedPendingRoute>}
                />

                <Route path="/my-settings/security" element={<ProtectedRoute><AccountRoleRoute audience="educator"><Security /></AccountRoleRoute></ProtectedRoute>} />

                <Route path="/studio" element={<ProtectedRoute><Studio /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><AccountRoleRoute audience="educator"><Calendar /></AccountRoleRoute></ProtectedRoute>} />
                <Route path="/insights" element={<ProtectedRoute><AccountRoleRoute audience="educator"><Insights /></AccountRoleRoute></ProtectedRoute>} />

                <Route element={<StudentLayout />}>
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/marketplace/journeys/:journeyId" element={<MarketplaceOffer />} />
                    <Route path="/marketplace/journeys/:journeyId/preview/steps/:stepId" element={<PublicStepPreview />} />
                    <Route path="/educators/:identifier" element={<EducatorProfile />} />
                </Route>

                <Route element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
                    <Route path="/my-learning" element={<MyLearning />} />
                    <Route path="/my-learning/completed" element={<CompletedLearning />} />
                    <Route path="/student/notifications" element={<StudentNotifications />} />
                    <Route path="/student/calendar" element={<Calendar learnerMode />} />
                    <Route path="/student/settings" element={<AccountRoleRoute audience="learner"><StudentSettings /></AccountRoleRoute>} />
                    <Route path="/student/settings/security" element={<AccountRoleRoute audience="learner"><StudentSecurity /></AccountRoleRoute>} />
                    <Route path="/student/settings/billing" element={<AccountRoleRoute audience="learner"><StudentBilling /></AccountRoleRoute>} />
                    <Route path="/student/become-educator" element={<BecomeEducator />} />
                    <Route path="/learn/journeys/:journeyId" element={<LearnerJourney />} />
                    <Route path="/learn/journeys/:journeyId/path" element={<LearnerPathMap />} />
                    <Route
                        path="/learn/journeys/:journeyId/steps/:stepId"
                        element={<LearnerStep />}
                    />
                    <Route path="/learn/challenges/:challengeId" element={<LearnerChallengePage />} />
                    <Route path="/student" element={<Navigate to="/my-learning" replace />} />
                </Route>

                <Route path="/my-settings/account" element={<ProtectedRoute><AccountRoleRoute audience="educator"><Settings /></AccountRoleRoute></ProtectedRoute>} />
                <Route path="/my-settings/educator-profile" element={<ProtectedRoute><AccountRoleRoute audience="educator"><EducatorProfileEditor /></AccountRoleRoute></ProtectedRoute>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                    path="/register/success"
                    element={<RegisterSuccess />}
                />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route
    path="/studio/step/:stepId/preview"
    element={
        <ProtectedRoute>
            <StepPreview />
        </ProtectedRoute>
    }
/>

                <Route
                    path="/my-settings/billing"
                    element={
                        <ProtectedRoute>
                            <AccountRoleRoute audience="educator"><Billing /></AccountRoleRoute>
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
                <Route path="/studio/journeys/:journeyId/challenges" element={<ProtectedRoute><ChallengeList /></ProtectedRoute>} />
                <Route path="/studio/challenges/:challengeId/edit" element={<ProtectedRoute><ChallengeEditor /></ProtectedRoute>} />
                <Route path="/studio/challenges/:challengeId/submissions" element={<ProtectedRoute><ChallengeSubmissions /></ProtectedRoute>} />
                <Route path="/studio/challenge-attempts/:attemptId/review" element={<ProtectedRoute><ChallengeReview /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />

            </Routes>



        </BrowserRouter>
    );
}
