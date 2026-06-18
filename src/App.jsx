import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";

import Navbar from "./components/Navbar";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import SuperAdminRoute from "./routes/SuperAdminRoute";
import { useAuth } from "./context/useAuth";
import { useSidebarCollapsed } from "./hooks/useSidebarCollapsed";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from "./config/sidebar";
import { PERMISSION_DENIED_MESSAGE } from "./utils/auth";

const UploadPage = lazy(() => import("./pages/UploadPage"));

const BoardPapersPage = lazy(() => import("./pages/BoardPapersPage"));
const SimilarQuestionsPage = lazy(() => import("./pages/SimilarQuestionsPage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const PredictionsPage = lazy(() => import("./pages/PredictionsPage"));
const SuggestionsPage = lazy(() => import("./pages/SuggestionsPage"));
const AITutorPage = lazy(() => import("./pages/AITutorPage"));
const GenerateAnswerPage = lazy(() => import("./pages/GenerateAnswerPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ResendVerificationPage = lazy(() => import("./pages/ResendVerificationPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const DonationPage = lazy(() => import("./pages/DonationPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));
const SubjectQuestionsPage = lazy(() => import("./pages/SubjectQuestionsPage"));
const AdminCreatePage = lazy(() => import("./pages/AdminCreatePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const JobStatusPage = lazy(() => import("./pages/JobStatusPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminUploadPage = lazy(() => import("./pages/admin/AdminUploadPage"));
const ManageQuestionsPage = lazy(() => import("./pages/admin/ManageQuestionsPage"));
const ManageSubjectsPage = lazy(() => import("./pages/admin/ManageSubjectsPage"));
const ManageUniversitiesPage = lazy(() => import("./pages/admin/ManageUniversitiesPage"));
const ManageDepartmentsPage = lazy(() => import("./pages/admin/ManageDepartmentsPage"));
const AdminProfilePage = lazy(() => import("./pages/admin/AdminProfilePage"));

function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { isCollapsed } = useSidebarCollapsed();
  const [permissionMessage, setPermissionMessage] = useState("");
  // Gate super-admin setup UI behind an opt-in env flag to avoid exposing setup in production by default
  const isSuperAdminSetupEnabled = import.meta.env.VITE_ENABLE_SUPERADMIN_SETUP === "1";

  // Show PublicNavbar only on homepage
  const isHomePage = location.pathname === "/";

  // List of public auth pages that shouldn't show any navbar
  const publicAuthPages = ["/login", "/register", "/verify-email", "/resend-verification", "/forgot-password", "/reset-password", "/admin/login", "/admin/create"];
  const isPublicAuthPage = publicAuthPages.includes(location.pathname);
  const isStudentDashboard = location.pathname === "/dashboard";
  const isMySubjects = location.pathname === "/subjects";
  const isSubjectQuestionsPage = /^\/subjects\/[^/]+\/questions$/.test(location.pathname);
  const isSubjectAnalysisPage = /^\/subjects\/[^/]+\/analysis$/.test(location.pathname);
  const isSearchPage = location.pathname === "/search";
  const isProfilePage = location.pathname === "/profile";
  const isAnalysisPage = location.pathname === "/analysis";
  const isSettingsPage = location.pathname === "/settings";
  const isHelpPage = location.pathname === "/help";
  const usesStudentShellLayout = isStudentDashboard || isMySubjects || isSubjectQuestionsPage || isSubjectAnalysisPage || isSearchPage || isProfilePage || isSettingsPage || isHelpPage || location.pathname === "/predictions" || isAnalysisPage || location.pathname === "/ai-tutor";

  useEffect(() => {
    function handleForbidden() {
      setPermissionMessage(PERMISSION_DENIED_MESSAGE);
    }

    window.addEventListener("auth:forbidden", handleForbidden);
    return () => window.removeEventListener("auth:forbidden", handleForbidden);
  }, []);

  return (
    <>
      {!isPublicAuthPage && !isHomePage && !usesStudentShellLayout && <Navbar />}
      <AnalyticsTracker />

      {permissionMessage && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700">
          {permissionMessage}
          <button type="button" onClick={() => setPermissionMessage("")} className="ml-4 underline">
            Dismiss
          </button>
        </div>
      )}

      <div
        className={`app-with-sidebar min-w-0 overflow-x-hidden transition-all duration-300`}
        style={
          isAuthenticated && !isPublicAuthPage && !isHomePage && !usesStudentShellLayout
            ? { ["--sidebar-width"]: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH }
            : undefined
        }
      >
        <Suspense fallback={<div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-600">Loading Q Arena...</div>}>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/resend-verification" element={<ResendVerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/support" element={<DonationPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/create" element={isSuperAdminSetupEnabled ? <AdminCreatePage /> : <Navigate to="/admin/login" replace />} />
          <Route path="/jobs/:jobId" element={<JobStatusPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/subjects/:subjectCode/questions" element={<SubjectQuestionsPage />} />
            <Route path="/subjects/:subjectCode/analysis" element={<AnalysisPage />} />
            {/* Legacy redirect: keep for backward compatibility with external/bookmarked old URLs */}
            <Route path="/subjects/browse" element={<Navigate to="/subjects" replace />} />
            <Route path="/board-papers" element={<BoardPapersPage />} />
            <Route path="/search" element={<SimilarQuestionsPage />} />
            <Route path="/suggestions" element={<SuggestionsPage />} />
            <Route path="/ai-tutor" element={<AITutorPage />} />
            {/* Legacy path: redirect /tutor to canonical /ai-tutor */}
            <Route path="/tutor" element={<Navigate to="/ai-tutor" replace />} />
            <Route path="/generate-answer" element={<GenerateAnswerPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />

            <Route path="/predictions" element={<PredictionsPage />} />
            <Route path="/answers" element={<GenerateAnswerPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/upload" element={<AdminUploadPage />} />
            <Route path="/admin/jobs/:jobId" element={<JobStatusPage />} />
            <Route path="/admin/questions" element={<ManageQuestionsPage />} />
            <Route path="/admin/subjects" element={<ManageSubjectsPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />

            <Route path="/admin/exams" element={<UploadPage />} />
          </Route>

          <Route element={<SuperAdminRoute />}>
            <Route path="/admin/universities" element={<ManageUniversitiesPage />} />
            <Route path="/admin/departments" element={<ManageDepartmentsPage />} />
          </Route>
        </Routes>
        </Suspense>
      </div>
    </>
  );
}

export default App;
