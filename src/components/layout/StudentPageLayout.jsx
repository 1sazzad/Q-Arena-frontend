import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Search, X } from "lucide-react";

import PublicSidebar from "../PublicSidebar";
import { useAuth } from "../../context/useAuth";

function getInitials(name = "Student") {
const parts = String(name || "")
.trim()
.split(/\s+/)
.filter(Boolean);

if (parts.length === 0) return "ST";
if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function StudentPageLayout({
title,
subtitle,
searchValue = "",
onSearchChange,
onSearchKeyDown,
searchPlaceholder = "Search questions, topics, subjects...",
children,
}) {
const { user, logout } = useAuth();
const navigate = useNavigate();

const [sidebarOpen, setSidebarOpen] = useState(false);
const [accountMenuOpen, setAccountMenuOpen] = useState(false);

const handleLogout = () => {
logout();
navigate("/login", { replace: true });
};

return ( <div className="min-h-screen bg-slate-50"> <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
<PublicSidebar
user={user}
accountMenuOpen={accountMenuOpen}
onToggleAccountMenu={() => setAccountMenuOpen((current) => !current)}
onNavigate={() => {}}
onLogout={handleLogout}
/> </div>

```
  {sidebarOpen ? (
    <div
      className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
      onClick={() => setSidebarOpen(false)}
      aria-hidden="true"
    />
  ) : null}

  <div
    className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${
      sidebarOpen ? "translate-x-0" : "-translate-x-full"
    }`}
  >
    <PublicSidebar
      user={user}
      accountMenuOpen={accountMenuOpen}
      onToggleAccountMenu={() => setAccountMenuOpen((current) => !current)}
      onNavigate={() => {
        setSidebarOpen(false);
        setAccountMenuOpen(false);
      }}
      onLogout={handleLogout}
    />
  </div>

  <div className="lg:pl-[240px]">
    <header className="sticky top-0 z-30 h-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
            aria-label="Toggle student menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-slate-900">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-1 truncate text-sm text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden sm:block sm:w-[320px] lg:w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
            />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
            aria-label="Open profile"
          >
            {getInitials(user?.full_name || "Student")}
          </button>
        </div>
      </div>
    </header>

    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  </div>
</div>

);
}
