import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { isStudentRouteRole, PERMISSION_DENIED_MESSAGE, MISSING_STUDENT_SCOPE_MESSAGE } from "../utils/auth";
import { isAcademicProfileComplete } from "../utils/academicProfile";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, role, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="px-4 py-10 text-center text-sm text-slate-500">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location, message: "Please login to continue." }} />;
  }

  if (role && !isStudentRouteRole(role)) {
    return <div className="px-4 py-10 text-center text-sm font-medium text-rose-700">{PERMISSION_DENIED_MESSAGE}</div>;
  }

  // Prevent students without academic scope from accessing subject-related flows
  if (
    user?.role === "student" &&
    !isAcademicProfileComplete(user) &&
    location?.pathname &&
    [
      "/subjects",
      "/search",
      "/suggestions",
      "/generate-answer",
      "/analysis",
      "/predictions",
      "/answers",
    ].some((p) => location.pathname.startsWith(p))
  ) {
    return <Navigate to="/profile" replace state={{ from: location, message: MISSING_STUDENT_SCOPE_MESSAGE }} />;
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
