import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import SuperAdminRoute from "./routes/SuperAdminRoute";
import { useAuth } from "./context/useAuth";
import { useSidebarCollapsed } from "./hooks/useSidebarCollapsed";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from "./config/sidebar";
import { PERMISSION_DENIED_MESSAGE } from "./utils/auth";

import UploadPage from "./pages/UploadPage";

import BoardPapersPage from "./pages/BoardPapersPage";
import SimilarQuestionsPage from "./pages/SimilarQuestionsPage";
import AnalysisPage from "./pages/AnalysisPage";
import PredictionsPage from "./pages/PredictionsPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import AITutorPage from "./pages/AITutorPage";
import GenerateAnswerPage from "./pages/GenerateAnswerPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ResendVerificationPage from "./pages/ResendVerificationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import FeedbackPage from "./pages/FeedbackPage";
import DonationPage from "./pages/DonationPage";
import HomePage from "./pages/HomePage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import ContactPage from "./pages/ContactPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import SubjectsPage from "./pages/SubjectsPage";
import SubjectQuestionsPage from "./pages/SubjectQuestionsPage";
import AdminCreatePage from "./pages/AdminCreatePage";
import ProfilePage from "./pages/ProfilePage";
import JobStatusPage from "./pages/JobStatusPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUploadPage from "./pages/admin/AdminUploadPage";
import ManageQuestionsPage from "./pages/admin/ManageQuestionsPage";
import ManageSubjectsPage from "./pages/admin/ManageSubjectsPage";
import ManageUniversitiesPage from "./pages/admin/ManageUniversitiesPage";
import ManageDepartmentsPage from "./pages/admin/ManageDepartmentsPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";

function App() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { isCollapsed } = useSidebarCollapsed();
  const [permissionMessage, setPermissionMessage] = useState("");

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
  const usesStudentShellLayout = isStudentDashboard || isMySubjects || isSubjectQuestionsPage || isSubjectAnalysisPage || isSearchPage || isProfilePage || location.pathname === "/predictions" || isAnalysisPage || location.pathname === "/ai-tutor";

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
          <Route path="/admin/create" element={<AdminCreatePage />} />
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
      </div>
    </>
  );
}

export default App;
