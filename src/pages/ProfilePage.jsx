import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookCheck,
  BookMarked,
  Brain,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Notebook,
  Search,
  Settings,
  Target,
  TestTubeDiagonal,
  UserCircle2,
  WandSparkles,
  X,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { apiEndpoints } from "../api/api";
import { useAuth } from "../context/useAuth";
import { Badge, Card, ErrorMessage } from "../components/ui";
import { getApiErrorMessage } from "../utils/auth";
import { getLookupId, getLookupLabel, normalizeDepartments, normalizeUniversities } from "../utils/academicLookups";
import {
  buildAcademicProfilePayload,
  CLASS_LEVEL_OPTIONS,
  CURRICULUM_OPTIONS,
  getAcademicProfileDefaults,
  getAcademicProfileDisplay,
  isAcademicProfileComplete,
  normalizeAcademicLevel,
  STREAM_GROUP_OPTIONS,
  VISIBLE_ACADEMIC_LEVEL_OPTIONS,
} from "../utils/academicProfile";

const AVAILABLE_ROUTES = new Set(["/dashboard", "/predictions", "/search", "/analysis", "/subjects", "/profile", "/support", "/ai-tutor"]);

const SIDEBAR_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Subjects", to: "/subjects", icon: BookCheck },
  { label: "Smart Predictions", to: "/predictions", icon: Brain },
  { label: "Search Questions", to: "/search", icon: Search },
  { label: "AI Tutor", to: "/ai-tutor", icon: WandSparkles },
  { label: "Bookmarks", to: "/bookmarks", icon: BookMarked },
  { label: "Practice", to: "/subjects", icon: Target },
  { label: "Mock Tests", to: "/mock-tests", icon: TestTubeDiagonal },
  { label: "Notes", to: "/notes", icon: Notebook },
  { label: "Profile", to: "/profile", icon: UserCircle2 },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Help", to: "/support", icon: CircleHelp },
];

const RECENT_ACTIVITY = [
  { text: "Updated academic profile details", time: "Today" },
  { text: "Reviewed progress snapshot", time: "Yesterday" },
  { text: "Visited search questions page", time: "2 days ago" },
];

function isRouteEnabled(path) {
  return AVAILABLE_ROUTES.has(path);
}

function getInitials(name = "Alex Chen") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "AC";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function Sidebar({ user, isMenuOpen, onToggleMenu, onNavigate, onLogout }) {
  const initials = getInitials(user?.full_name || user?.email || "Student");

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="px-5 pb-5 pt-6">
        <BrandLogo className="gap-3" imageClassName="h-9 w-9" textClassName="text-lg font-semibold text-slate-900" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const enabled = isRouteEnabled(item.to);
          const baseClass = "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

          if (!enabled) {
            return (
              <div key={item.label} className={`${baseClass} cursor-not-allowed text-slate-500 opacity-70`}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <Badge tone="slate" className="ml-auto">
                  Coming soon
                </Badge>
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => `${baseClass} ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-slate-100 px-4 py-4">

        <div className="relative">
          <div className="flex items-center gap-2">
            <Link to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user?.full_name || "Student"}</p>
                <p className="truncate text-xs text-slate-500">{user?.email || "student@qarena.com"}</p>
              </div>
            </Link>
            <button type="button" onClick={onToggleMenu} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100">
              <ChevronDown className={`h-4 w-4 transition ${isMenuOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {isMenuOpen ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <Link to="/profile" onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <UserCircle2 className="h-4 w-4" />
                Profile
              </Link>
              <button type="button" disabled className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left text-sm text-slate-400">
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <Link to="/support" onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <CircleHelp className="h-4 w-4" />
                Help
              </Link>
              <div className="border-t border-slate-100" />
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const routeMessage = location?.state?.message || "";
  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(() => getAcademicProfileDefaults(user));
  const [universitiesLoading, setUniversitiesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(routeMessage);
  const [messageTone, setMessageTone] = useState("info");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");

  const isStudent = user?.role === "student";
  const academicLevel = normalizeAcademicLevel(form.academic_level) || "university";
  const isUniversityLevel = academicLevel === "university";
  const isSecondaryLevel = academicLevel === "ssc" || academicLevel === "hsc";
  const selectedUniversity = form.university_id;
  const selectedDepartment = form.department_id;
  const academicDisplay = getAcademicProfileDisplay(user);
  const missingAcademicProfile = isStudent && !isAcademicProfileComplete(user);

  const profileCompletion = missingAcademicProfile ? 70 : 100;
  const learningHealth = isStudent ? (missingAcademicProfile ? "Needs setup" : "On track") : "Active";

  useEffect(() => {
    if (!isStudent || !isUniversityLevel) {
      return;
    }

    let active = true;

    Promise.resolve()
      .then(() => {
        setUniversitiesLoading(true);
        return apiEndpoints.getUniversities();
      })
      .then((response) => {
        if (!active) {
          return;
        }
        setUniversities(normalizeUniversities(response.data));
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setUniversities([]);
          setMessageTone("error");
          setMessage(getApiErrorMessage(error, "Unable to load universities."));
        }
      })
      .finally(() => {
        if (active) {
          setUniversitiesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isStudent, isUniversityLevel]);

  useEffect(() => {
    if (!isStudent || !isUniversityLevel || !selectedUniversity) {
      return;
    }

    let active = true;

    Promise.resolve()
      .then(() => {
        setDepartmentsLoading(true);
        return apiEndpoints.getUniversityDepartments(selectedUniversity);
      })
      .then((response) => {
        if (!active) {
          return;
        }

        const nextDepartments = normalizeDepartments(response.data);
        setDepartments(nextDepartments);
        setForm((current) => {
          if (!current.department_id) {
            return current;
          }

          const departmentStillValid = nextDepartments.some((department) => String(getLookupId(department)) === current.department_id);
          return departmentStillValid ? current : { ...current, department_id: "" };
        });
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setDepartments([]);
          setMessageTone("error");
          setMessage(getApiErrorMessage(error, "Unable to load departments."));
        }
      })
      .finally(() => {
        if (active) {
          setDepartmentsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isStudent, isUniversityLevel, selectedUniversity]);

  const canSaveAcademicScope = Boolean(
    !saving &&
      academicLevel &&
      ((isUniversityLevel && selectedUniversity && selectedDepartment) || (isSecondaryLevel && form.curriculum && form.stream_group)),
  );

  const selectedUniversityName = useMemo(() => {
    return universities.find((university) => String(getLookupId(university)) === selectedUniversity)?.name || "";
  }, [universities, selectedUniversity]);

  function updateField(field, value) {
    if (field === "academic_level") {
      const nextLevel = normalizeAcademicLevel(value) || "university";

      setForm((current) => ({
        ...current,
        academic_level: nextLevel,
        institution_type: nextLevel === "university" ? "university" : nextLevel === "ssc" ? "school" : "college",
        curriculum: nextLevel === "university" ? "university_specific" : "national",
        stream_group: "",
        class_level: "",
        university_id: "",
        department_id: "",
        program: "",
        batch_session: "",
        institution_name: "",
      }));

      setDepartments([]);
      setDepartmentsLoading(false);
      return;
    }

    if (field === "university_id") {
      setForm((current) => ({
        ...current,
        university_id: value,
        department_id: "",
      }));
      setDepartments([]);
      return;
    }

    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleUniversityChange(event) {
    updateField("university_id", event.target.value);
    setMessage("");
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleSaveAcademicScope(event) {
    event.preventDefault();

    if (!canSaveAcademicScope) {
      setMessageTone("error");
      setMessage("Complete the required academic profile fields before saving.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = buildAcademicProfilePayload(form);
      await apiEndpoints.updateCurrentUserProfile(payload);
      await refreshUser();
      setMessageTone("success");
      setMessage("Academic profile updated successfully.");
    } catch (error) {
      console.error(error);
      setMessageTone("error");
      setMessage(getApiErrorMessage(error, "Unable to update academic profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <Sidebar
          user={user}
          isMenuOpen={accountMenuOpen}
          onToggleMenu={() => setAccountMenuOpen((current) => !current)}
          onLogout={handleLogout}
        />
            </div>

      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}

      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar
          user={user}
          isMenuOpen={accountMenuOpen}
          onToggleMenu={() => setAccountMenuOpen((current) => !current)}
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
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Profile</h1>
                <p className="text-xs text-slate-500 sm:text-sm">Manage your account and track your learning profile.</p>
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
                    <Badge tone={missingAcademicProfile ? "amber" : "green"}>{missingAcademicProfile ? "Needs setup" : "Profile complete"}</Badge>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Progress Snapshot</h3>
                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>Profile completion</span>
                        <span>{profileCompletion}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${profileCompletion}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>Academic setup</span>
                        <span>{missingAcademicProfile ? "In progress" : "Done"}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full ${missingAcademicProfile ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${missingAcademicProfile ? 65 : 100}%` }} />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Subscription / Plan</h3>
                  <p className="mt-2 text-sm text-slate-700">Current plan: <span className="font-semibold">Free Student</span></p>
                  <p className="mt-1 text-xs text-slate-500">Upgrade options will appear here when enabled.</p>
                  <button type="button" disabled className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
                    Manage plan
                  </button>
                </Card>
              </div>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Learning Overview</h3>
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
                    <p className="text-xs text-slate-500">Learning status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{learningHealth}</p>
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

              {isStudent ? (
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Account Settings</h3>
                    <p className="mt-1 text-xs text-slate-500">Update your academic scope to improve content relevance.</p>
                  </div>

                  <form onSubmit={handleSaveAcademicScope} className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                      Academic level
                      <select
                        value={form.academic_level}
                        onChange={(event) => updateField("academic_level", event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      >
                        {VISIBLE_ACADEMIC_LEVEL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {isUniversityLevel ? (
                        <>
                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            University
                            <select
                              value={selectedUniversity}
                              onChange={handleUniversityChange}
                              disabled={universitiesLoading}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="">{universitiesLoading ? "Loading universities..." : "Select university"}</option>
                              {universities.map((university) => {
                                const id = getLookupId(university);
                                return (
                                  <option key={id || getLookupLabel(university)} value={id}>
                                    {getLookupLabel(university)}
                                  </option>
                                );
                              })}
                            </select>
                          </label>

                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            Department
                            <select
                              value={selectedDepartment}
                              onChange={(event) => {
                                updateField("department_id", event.target.value);
                                setMessage("");
                              }}
                              disabled={!selectedUniversity || departmentsLoading || departments.length === 0}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="">
                                {!selectedUniversity ? "Select university first" : departmentsLoading ? "Loading departments..." : "Select department"}
                              </option>
                              {departments.map((department) => {
                                const id = getLookupId(department);
                                return (
                                  <option key={id || getLookupLabel(department)} value={id}>
                                    {getLookupLabel(department)}
                                  </option>
                                );
                              })}
                            </select>
                          </label>

                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            Program / degree
                            <input
                              value={form.program}
                              onChange={(event) => updateField("program", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                              placeholder="Optional"
                            />
                          </label>

                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            Batch / session
                            <input
                              value={form.batch_session}
                              onChange={(event) => updateField("batch_session", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                              placeholder="Optional"
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            Curriculum
                            <select
                              value={form.curriculum}
                              onChange={(event) => updateField("curriculum", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            >
                              {CURRICULUM_OPTIONS.filter((option) => option.value !== "university_specific").map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            Group
                            <select
                              value={form.stream_group}
                              onChange={(event) => updateField("stream_group", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="">Select group</option>
                              {STREAM_GROUP_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2 text-sm font-medium text-slate-700">
                            Class level (optional)
                            <select
                              value={form.class_level}
                              onChange={(event) => updateField("class_level", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="">No class level</option>
                              {(academicLevel === "ssc" ? CLASS_LEVEL_OPTIONS.ssc : CLASS_LEVEL_OPTIONS.hsc).map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                            Institution / school name
                            <input
                              value={form.institution_name}
                              onChange={(event) => updateField("institution_name", event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                              placeholder="Optional"
                            />
                          </label>
                        </>
                      )}
                    </div>

                    {selectedUniversity && !departmentsLoading && departments.length === 0 ? (
                      <ErrorMessage tone="warning">
                        {selectedUniversityName ? `No departments found for ${selectedUniversityName}.` : "No departments found for this university."}
                      </ErrorMessage>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={!canSaveAcademicScope}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        {saving ? "Saving..." : "Save academic profile"}
                      </button>
                      <ErrorMessage tone={messageTone}>{message}</ErrorMessage>
                    </div>
                  </form>
                </Card>
              ) : null}
            </main>

            <aside className="space-y-4">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                <ul className="mt-3 space-y-3">
                  {RECENT_ACTIVITY.map((item) => (
                    <li key={`${item.text}-${item.time}`} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-sm text-slate-700">{item.text}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Account Settings</h3>
                <p className="mt-2 text-xs text-slate-600">Use the sidebar account menu for profile actions like sign out.</p>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
