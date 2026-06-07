import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import SuperAdminRoute from "./routes/SuperAdminRoute";
import { useAuth } from "./context/useAuth";
import { useSidebarCollapsed } from "./hooks/useSidebarCollapsed";
import { PERMISSION_DENIED_MESSAGE } from "./utils/auth";

import UploadPage from "./pages/UploadPage";
import QuestionsPage from "./pages/QuestionsPage";
import BoardPapersPage from "./pages/BoardPapersPage";
import SimilarQuestionsPage from "./pages/SimilarQuestionsPage";
import AnalysisPage from "./pages/AnalysisPage";
import PredictionsPage from "./pages/PredictionsPage";
import SuggestionsPage from "./pages/SuggestionsPage";
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

  useEffect(() => {
    function handleForbidden() {
      setPermissionMessage(PERMISSION_DENIED_MESSAGE);
    }

    window.addEventListener("auth:forbidden", handleForbidden);
    return () => window.removeEventListener("auth:forbidden", handleForbidden);
  }, []);

  return (
    <>
      {!isPublicAuthPage && !isHomePage && <Navbar />}
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
        className={`min-w-0 overflow-x-hidden transition-all duration-300 ${
          isAuthenticated && !isPublicAuthPage && !isHomePage
            ? isCollapsed
              ? "lg:pl-20"
              : "lg:pl-72"
            : ""
        }`}
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
            <Route path="/dashboard" element={<Navigate to="/subjects" replace />} />
            <Route path="/subjects" element={<QuestionsPage />} />
            <Route path="/board-papers" element={<BoardPapersPage />} />
            <Route path="/search" element={<SimilarQuestionsPage />} />
            <Route path="/suggestions" element={<SuggestionsPage />} />
            <Route path="/generate-answer" element={<GenerateAnswerPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route path="/predict" element={<PredictionsPage />} />
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
