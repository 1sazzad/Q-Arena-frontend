import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/useAuth";
import Button from "./ui/Button";
import { isSuperAdminRole } from "../utils/auth";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import BrandLogo from "./BrandLogo";
import { SIDEBAR_COLLAPSED_CLASS, SIDEBAR_EXPANDED_CLASS } from "../config/sidebar";

const publicNavItems = [
  { to: "/#features", label: "Features" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/#request-subject", label: "Request subject" },
  { to: "/#feedback", label: "Feedback" },
  { to: "/#support", label: "Support" },
  { to: "/login", label: "Login" },
];

const studentNavItems = [
  { to: "/profile", label: "Profile" },
  { to: "/subjects", label: "Subjects" },
  { to: "/board-papers", label: "Board Papers" },
  { to: "/suggestions", label: "Suggestions" },
  { to: "/answers", label: "Answer Builder" },
  { to: "/support", label: "Support" },
  { to: "/feedback", label: "Contact / Feedback" },
];

const adminNavItems = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/upload", label: "Upload" },
  { to: "/admin/questions", label: "Questions" },
  { to: "/admin/subjects", label: "Subjects" },
  { to: "/support", label: "Support" },
  { to: "/feedback", label: "Feedback" },
  { to: "/admin/profile", label: "Profile" },
];

const superAdminNavItems = [
  { to: "/admin/universities", label: "Universities" },
  { to: "/admin/departments", label: "Departments" },
];

function getIconForItem(label) {
  const iconMap = {
    Profile: "👤",
    Subjects: "📚",
    Suggestions: "💡",
    "Board Papers": "🧾",
    "Answer Builder": "🔨",
    Support: "🤝",
    "Contact / Feedback": "💬",
    Dashboard: "📊",
    Upload: "⬆️",
    Questions: "❓",
    "Manage Questions": "❓",
    Universities: "🏛️",
    Departments: "🏢",
    Feedback: "💬",
  };
  return iconMap[label] || "•";
}

function navClass({ isActive }) {
  return [
    "flex min-h-10 items-center rounded-2xl px-3 py-2 text-sm font-medium transition-all",
    isActive ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  ].join(" ");
}

function Brand({ onClick }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="block min-w-0 cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      aria-label="Go to Q Arena homepage"
    >
      <BrandLogo className="gap-3" imageClassName="h-10 w-10" textClassName="block truncate text-lg font-semibold tracking-tight text-slate-950" showTagline />
    </Link>
  );
}

function getRoleLabel(role, isAdmin) {
  if (isSuperAdminRole(role)) {
    return "Super Admin";
  }

  return isAdmin ? "Sub Admin" : "Student";
}

function Navbar() {
  const { isAuthenticated, isAdmin, isSuperAdmin, logout, role, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isPublicMenuOpen, setIsPublicMenuOpen] = useState(false);
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);
  const { isCollapsed, toggleCollapsed } = useSidebarCollapsed();
  const navItems = !isAuthenticated
    ? publicNavItems
    : isAdmin
      ? [...adminNavItems.slice(0, 4), ...(isSuperAdmin ? superAdminNavItems : []), ...adminNavItems.slice(4)]
      : studentNavItems;
  const roleLabel = getRoleLabel(role, isAdmin);

  function handleLogout() {
    setIsAppMenuOpen(false);
    logout();
    navigate("/", { replace: true });
  }

  function scrollHomeToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleBrandClick(event) {
    event.preventDefault();
    setIsPublicMenuOpen(false);
    setIsAppMenuOpen(false);

    if (location.pathname === "/" && !location.hash) {
      scrollHomeToTop();
      return;
    }

    navigate("/");
    window.setTimeout(scrollHomeToTop, 0);
  }

  if (!isAuthenticated) {
    return (
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Brand onClick={handleBrandClick} />
          <button
            type="button"
            className="inline-flex min-h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isPublicMenuOpen}
            onClick={() => setIsPublicMenuOpen((current) => !current)}
          >
            {isPublicMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden items-center gap-2 lg:flex lg:justify-end">
            {navItems.map((item) => {
              if (item.to.includes("#")) {
                const itemHash = item.to.slice(item.to.indexOf("#"));
                const isHashActive = location.pathname === "/" && location.hash === itemHash;

                return (
                  <Link key={item.to} to={item.to} className={navClass({ isActive: isHashActive })}>
                    {item.label}
                  </Link>
                );
              }

              return (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              );
            })}
            <Link
              to="/register"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:from-indigo-700 hover:to-cyan-700"
            >
              <Sparkles className="h-4 w-4" />
              Get Started
            </Link>
          </div>
        </div>
        {isPublicMenuOpen && (
          <div className="border-t border-slate-100 px-4 pb-4 sm:px-6 lg:hidden">
            <div className="grid gap-2 pt-3">
              {navItems.map((item) => {
                const commonClass = "flex min-h-11 w-full items-center rounded-2xl px-3 py-2 text-sm font-medium transition";

                if (item.to.includes("#")) {
                  const itemHash = item.to.slice(item.to.indexOf("#"));
                  const isHashActive = location.pathname === "/" && location.hash === itemHash;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsPublicMenuOpen(false)}
                      className={`${commonClass} ${isHashActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsPublicMenuOpen(false)}
                    className={({ isActive }) =>
                      `${commonClass} ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`
                    }
                  >
                    {item.label}
                  </NavLink>
                );
              })}
              <Link
                to="/register"
                onClick={() => setIsPublicMenuOpen(false)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:from-indigo-700 hover:to-cyan-700"
              >
                <Sparkles className="h-4 w-4" />
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Brand onClick={handleBrandClick} />
          <button
            type="button"
            className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            aria-label="Toggle navigation menu"
            aria-expanded={isAppMenuOpen}
            onClick={() => setIsAppMenuOpen((current) => !current)}
          >
            {isAppMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isAppMenuOpen && (
          <div className="border-t border-slate-100 px-4 pb-4">
            <div className="grid gap-2 pt-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {roleLabel}
                </p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950">
                  {user?.full_name || user?.email || roleLabel}
                </p>
              </div>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsAppMenuOpen(false)}
                  className={({ isActive }) => navClass({ isActive })}
                >
                  {item.label}
                </NavLink>
              ))}
              <Button variant="secondary" className="w-full" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        )}
      </nav>

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/80 bg-white/98 transition-all duration-300 lg:flex lg:flex-col ${
          isCollapsed ? SIDEBAR_COLLAPSED_CLASS : SIDEBAR_EXPANDED_CLASS
        }`}
      >
        {/* Header with Brand and Collapse Button */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-5">
          {!isCollapsed && <Brand onClick={handleBrandClick} />}
          {isCollapsed && (
            <Link
              to="/"
              onClick={handleBrandClick}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white"
              aria-label="Q Arena"
              title="Q Arena"
            >
              <BrandLogo showText={false} imageClassName="h-10 w-10" />
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            )}
          </button>
        </div>

        {/* User Info Card */}
        {!isCollapsed && (
          <div className="mx-4 mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{roleLabel}</p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-950">
              {user?.full_name || user?.email || roleLabel}
            </p>
            {user?.email && <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>}
          </div>
        )}

        {/* Scrollable Menu Container */}
        <div
          className={`mt-6 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-4 ${
            isCollapsed ? "px-2" : ""
          }`}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                  `flex min-h-10 items-center rounded-2xl transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                } ${isCollapsed ? "justify-center" : "gap-3 px-3 py-2"}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="shrink-0 text-lg">{getIconForItem(item.label)}</span>
              {!isCollapsed && (
                <span className="min-w-0 truncate text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Logout Button */}
        <div className="border-t border-slate-100 px-4 py-4">
          <Button
            variant="secondary"
            className={`w-full ${isCollapsed ? "p-0" : ""}`}
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
          >
            {isCollapsed ? "🚪" : "Logout"}
          </Button>
        </div>
      </aside>
    </>
  );
}

export default Navbar;
