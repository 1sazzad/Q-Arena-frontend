import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Search, X } from "lucide-react";

import PublicSidebar from "../components/PublicSidebar";
import { useAuth } from "../context/useAuth";
import { Badge, Card } from "../components/ui";
import { getAcademicProfileDisplay } from "../utils/academicProfile";

function getInitials(name = "Alex Chen") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatMemberSince(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

  const displayName = user?.full_name || user?.name || "Student";
  const displayEmail = user?.email || "—";
  const displayRole = user?.role || "student";
  const memberSince = formatMemberSince(user?.created_at || user?.createdAt || user?.joined_at);
  const academicDisplay = getAcademicProfileDisplay(user);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <PublicSidebar
          user={user}
          accountMenuOpen={accountMenuOpen}
          onToggleAccountMenu={() => setAccountMenuOpen((current) => !current)}
          onNavigate={() => {}}
          onLogout={handleLogout}
        />
            </div>

      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}

      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Toggle profile menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div>
                <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
                <p className="text-xs text-slate-500 sm:text-sm">View your profile information (read-only).</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[280px] lg:w-[360px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={headerSearch}
                  onChange={(event) => setHeaderSearch(event.target.value)}
                  placeholder="Search topics, classes, progress..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                />
              </div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700"
                aria-label="Open profile"
              >
                {getInitials(user?.full_name || user?.email || "Student")}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
            <main className="space-y-4">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
                      {getInitials(user?.full_name || user?.email || "Student")}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Profile Summary</h2>
                      <p className="text-sm text-slate-500">{user?.full_name || "Student"}</p>
                      <p className="text-xs text-slate-500">{user?.email || "No email found"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone="indigo">{user?.role || "student"}</Badge>
                    <Badge tone={academicDisplay?.isComplete ? "green" : "amber"}>{academicDisplay?.isComplete ? "Profile complete" : "Needs setup"}</Badge>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Account Details</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Full name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{displayName}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{displayEmail}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Role</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{displayRole}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Member since</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{memberSince}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Academic Profile</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Academic level</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{academicDisplay.academicLevel}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Curriculum</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{academicDisplay.curriculum}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Institution</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{academicDisplay.institutionName}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Department</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{academicDisplay.departmentName}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Batch / session</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{academicDisplay.batchSession}</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Profile Management</h3>
                <p className="mt-2 text-sm text-slate-500">Profile information is managed from Settings.</p>
                <div className="mt-4">
                  <button type="button" onClick={() => navigate("/settings")} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                    Open Settings
                  </button>
                </div>
              </Card>
            </main>

            <aside className="space-y-4">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                <ul className="mt-3 space-y-3">
                  <li className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-700">Last signed in</p>
                    <p className="mt-1 text-xs text-slate-500">{user?.last_sign_in_at || "—"}</p>
                  </li>
                  <li className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-700">Profile updated</p>
                    <p className="mt-1 text-xs text-slate-500">{user?.updated_at || "—"}</p>
                  </li>
                </ul>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Account</h3>
                <p className="mt-2 text-xs text-slate-600">Use the Settings page to edit your name, email, and academic information.</p>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

