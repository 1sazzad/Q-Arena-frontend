
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  BookCheck,
  Brain,
  Search,
  WandSparkles,
  BookMarked,
  TestTubeDiagonal,
  Notebook,
  CircleHelp,
  ChevronDown,
  UserCircle2,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { Badge } from "./ui";
import { useAuth } from "../context/useAuth";

// Unified public/student sidebar component
export default function PublicSidebar({ user, onNavigate, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname || "/";
  const { logout: authLogout } = useAuth();

  // Main nav items. Profile/Settings intentionally removed from main nav and moved to the account dropdown.
  const items = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, enabled: true, key: "dashboard" },
    { label: "My Subjects", to: "/subjects", icon: BookCheck, enabled: true, key: "subjects" },
    { label: "Smart Predictions", to: "/predictions", icon: Brain, enabled: true, key: "predictions" },
    { label: "Search Questions", to: "/search", icon: Search, enabled: true, key: "search" },
    { label: "AI Tutor", to: "/ai-tutor", icon: WandSparkles, enabled: true, key: "ai-tutor" },
    { label: "Bookmarks", to: "/bookmarks", icon: BookMarked, enabled: false, key: "bookmarks" },
    { label: "Mock Tests", to: "/mock-tests", icon: TestTubeDiagonal, enabled: false, key: "mock-tests" },
    { label: "Notes", to: "/notes", icon: Notebook, enabled: false, key: "notes" },
    { label: "Help", to: "/help", icon: CircleHelp, enabled: true, key: "help" },
  ];

  function isActiveKey(key) {
    switch (key) {
      case "dashboard":
        return pathname === "/dashboard";
      case "subjects":
        return pathname === "/subjects" || pathname.startsWith("/subjects/");
      case "predictions":
        return pathname === "/predictions";
      case "search":
        return pathname === "/search" || pathname.startsWith("/search");
      case "ai-tutor":
        return pathname === "/ai-tutor" || pathname.startsWith("/ai-tutor");
      case "help":
        return pathname === "/help";
      default:
        return false;
    }
  }

  const baseClass = "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

  // Local account menu state (uncontrolled component). Do not mix controlled props.
  const [accountOpen, setAccountOpen] = useState(false);
  const wrapperRef = useRef(null);

  const toggleAccount = useCallback(() => {
    setAccountOpen((v) => !v);
  }, []);

  const closeAccount = useCallback(() => {
    setAccountOpen(false);
  }, []);

  useEffect(() => {
    function handleDocClick(e) {
      if (!accountOpen) return;
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        closeAccount();
      }
    }

    function handleKey(e) {
      if (!accountOpen) return;
      if (e.key === "Escape") {
        closeAccount();
      }
    }

    document.addEventListener("mousedown", handleDocClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [accountOpen, closeAccount]);

  const handleLogout = useCallback(async () => {
    closeAccount();
    if (onLogout) {
      try {
        await onLogout();
      } catch {
        // ignore
      }
      return;
    }
    // fallback to auth context logout pattern
    try {
      authLogout && (await authLogout());
    } catch {
      // ignore
    }
    navigate("/login", { replace: true });
  }, [onLogout, authLogout, navigate, closeAccount]);

  const handleProfileNavigate = useCallback(
    (e) => {
      e.preventDefault();
      closeAccount();
      navigate("/profile");
      if (onNavigate) onNavigate();
    },
    [navigate, onNavigate, closeAccount],
  );

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="px-5 pb-5 pt-6">
        <BrandLogo className="gap-3" imageClassName="h-9 w-9" textClassName="text-lg font-semibold text-slate-900" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {items.map((item) => {
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <div key={item.key} className={`${baseClass} cursor-not-allowed text-slate-500 opacity-70`} title="Coming soon">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <Badge className="ml-auto" tone="slate">Coming soon</Badge>
              </div>
            );
          }

          const active = isActiveKey(item.key);
          return (
            <Link
              key={item.key}
              to={item.to}
              onClick={onNavigate}
              className={`${baseClass} ${active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-slate-100 px-4 py-4">
        <div ref={wrapperRef} className="relative">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAccount}
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl border p-3 transition ${pathname === "/profile" ? "border-blue-100 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">{getInitials(user)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.full_name || user?.email || "Student"}</p>
                <p className="text-xs text-slate-500">Student</p>
              </div>
            </button>
            <button type="button" onClick={toggleAccount} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100">
              <ChevronDown className={`h-4 w-4 transition ${accountOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {accountOpen ? (
            <div className="absolute right-0 bottom-full mb-2 w-56 rounded-xl border border-slate-100 bg-white shadow-lg">
              <div className="flex flex-col p-2">
                <button
                  type="button"
                  onClick={handleProfileNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/profile" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <UserCircle2 className="h-4 w-4" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    closeAccount();
                    navigate("/settings");
                    if (onNavigate) onNavigate();
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${pathname === "/settings" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.2 4.2l1.4 1.4"/><path d="M18.4 18.4l1.4 1.4"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.2 19.8l1.4-1.4"/><path d="M18.4 5.6l1.4-1.4"/></svg>
                  <span>Settings</span>
                </button>

                <button type="button" onClick={handleLogout} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function getInitials(user) {
  const name = (user && (user.full_name || user.email || user.name)) || "Student";
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
