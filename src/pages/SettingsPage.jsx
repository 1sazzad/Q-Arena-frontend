import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CreditCard, Menu, Palette, Search, Shield, SlidersHorizontal, UserCircle2, X } from "lucide-react";

import PublicSidebar from "../components/PublicSidebar";
import { useAuth } from "../context/useAuth";
import { Card, ErrorMessage } from "../components/ui";
import { apiEndpoints } from "../api/api";
import { getApiErrorMessage } from "../utils/auth";
import {
  buildAcademicProfilePayload,
  getAcademicProfileDefaults,

  getAcademicLevelOptions,
  CURRICULUM_OPTIONS,
  STREAM_GROUP_OPTIONS,
  CLASS_LEVEL_OPTIONS,
} from "../utils/academicProfile";

const SETTINGS_MENU = [
  { key: "Account", title: "Account", subtitle: "Your profile and account info", Icon: UserCircle2 },
  { key: "Learning Preferences", title: "Learning Preferences", subtitle: "Study style and options", Icon: SlidersHorizontal },
  { key: "Notifications", title: "Notifications", subtitle: "Manage your alerts", Icon: BellRing },
  { key: "Privacy & Security", title: "Privacy & Security", subtitle: "Security and data settings", Icon: Shield },
  { key: "Appearance", title: "Appearance", subtitle: "Theme and display", Icon: Palette },
  { key: "Billing / Plan", title: "Billing / Plan", subtitle: "Plan and subscription", Icon: CreditCard },
];

function getInitials(name = "Student") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatRole(role) {
  if (!role) return "Student";
  return String(role)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMemberSince(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function isAcademicProfileSet(user) {
  return Boolean(
    user?.academic_profile ||
    user?.academic_level ||
    user?.institution_name ||
    user?.university_id ||
    user?.department_id ||
    user?.curriculum ||
    user?.stream_group,
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selected, setSelected] = useState("Account");
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  const [name, setName] = useState(user?.full_name || user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  // Academic form state (Settings edit)
  const defaults = getAcademicProfileDefaults(user || {});
  const [academicLevel, setAcademicLevel] = useState(defaults.academic_level || "");
  const [curriculum, setCurriculum] = useState(defaults.curriculum || "");
  const [streamGroup, setStreamGroup] = useState(defaults.stream_group || "");
  const [classLevel, setClassLevel] = useState(defaults.class_level || "");
  const [universityId, setUniversityId] = useState(defaults.university_id || "");
  const [departmentId, setDepartmentId] = useState(defaults.department_id || "");
  const [program, setProgram] = useState(defaults.program || "");
  const [batchSession, setBatchSession] = useState(defaults.batch_session || "");
  const [institutionName, setInstitutionName] = useState(defaults.institution_name || "");

  const [academicProfile, setAcademicProfile] = useState(user?.academic_profile || "");
  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");

  const displayName = user?.full_name || user?.name || "Student";
  const displayEmail = user?.email || "student@example.com";
  const displayRole = formatRole(user?.role);
  const memberSince = formatMemberSince(user?.created_at || user?.createdAt || user?.joined_at);
  const academicProfileLabel = isAcademicProfileSet(user) ? "Set" : "Not set";

  const quickCards = useMemo(
    () => [
      {
        title: "Learning Preferences",
        text: "Set your default explanation style, language and level.",
        buttonText: "Manage Preferences",
      },
      {
        title: "Notifications",
        text: "Manage how you receive updates and reminders.",
        buttonText: "Manage Notifications",
      },
      {
        title: "Appearance",
        text: "Customize theme and sidebar display options.",
        buttonText: "Manage Appearance",
      },
    ],
    [],
  );

  async function loadUniversities() {
    try {
      setLoadingUniversities(true);
      const res = await apiEndpoints.getUniversities();
      setUniversities(res?.data || []);
    } catch (err) {
      console.error("Failed to load universities", err);
      setUniversities([]);
    } finally {
      setLoadingUniversities(false);
    }
  }

  async function loadDepartments(university) {
    if (!university) {
      setDepartments([]);
      return;
    }

    try {
      setLoadingDepartments(true);
      const res = await apiEndpoints.getUniversityDepartments(university);
      setDepartments(res?.data || []);
    } catch (err) {
      console.error("Failed to load departments", err);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  }

  useEffect(() => {
    if (!isEditingAccount) return;

    // load related lookup data asynchronously to avoid sync setState in effect body
    (async () => {
      if (academicLevel === "university") {
        await loadUniversities();
        if (universityId) await loadDepartments(universityId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingAccount]);

  function startEditing() {
    const defaults = getAcademicProfileDefaults(user || {});

    setName(user?.full_name || "");
    setEmail(user?.email || "");
    setAcademicProfile(user?.academic_profile || "");

    setAcademicLevel(defaults.academic_level || "");
    setCurriculum(defaults.curriculum || "");
    setStreamGroup(defaults.stream_group || "");
    setClassLevel(defaults.class_level || "");
    setUniversityId(defaults.university_id || "");
    setDepartmentId(defaults.department_id || "");
    setProgram(defaults.program || "");
    setBatchSession(defaults.batch_session || "");
    setInstitutionName(defaults.institution_name || "");

    setMessage("");
    setIsEditingAccount(true);

    if (defaults.academic_level === "university" || (!defaults.academic_level && defaults.university_id && defaults.department_id)) {
      loadUniversities();
      if (defaults.university_id) loadDepartments(defaults.university_id);
    }
  }

  async function handleSaveAccount(event) {
    event?.preventDefault?.();
    setSaving(true);
    setMessage("");

    try {
      const academicValues = {
        academic_level: academicLevel,
        curriculum,
        stream_group: streamGroup,
        class_level: classLevel,
        university_id: universityId,
        department_id: departmentId,
        program,
        batch_session: batchSession,
        institution_name: institutionName,
      };

      const academicPayload = buildAcademicProfilePayload(academicValues);

      const payload = {
        full_name: name,
        ...(email ? { email } : {}),
        ...academicPayload,
      };

      await apiEndpoints.updateCurrentUserProfile(payload);
      await refreshUser();
      setMessageTone("success");
      setMessage("Account updated successfully.");
      setIsEditingAccount(false);
    } catch (error) {
      console.error(error);
      setMessageTone("error");
      setMessage(getApiErrorMessage(error, "Unable to update account."));
    } finally {
      setSaving(false);
    }
  }

  function renderAccountSection() {
    return (
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 sm:h-16 sm:w-16 sm:text-base">{getInitials(displayName)}</div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Account Information</h2>
                <p className="mt-1 text-sm text-slate-500">View and manage your basic account details.</p>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500">{displayRole}</p>
                  <p className="text-xs text-slate-500">{displayEmail}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (isEditingAccount ? setIsEditingAccount(false) : startEditing())}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              {isEditingAccount ? "Close" : "Edit Profile"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Email Address</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{displayEmail}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Academic Profile</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{academicProfileLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Member Since</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{memberSince}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Role</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{displayRole}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">Manage your profile and account information here in Settings.</p>
            <button
              type="button"
              onClick={() => (isEditingAccount ? setIsEditingAccount(false) : startEditing())}
              className="mt-3 inline-flex items-center rounded-lg border border-blue-200 bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-900 transition hover:bg-blue-200"
            >
              {isEditingAccount ? "Close" : "Edit Account Info"}
            </button>
          </div>

          {isEditingAccount ? (
            <form onSubmit={handleSaveAccount} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Academic Level</label>
                <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none">
                  <option value="">Select academic level</option>
                  {getAcademicLevelOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {academicLevel === "university" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">University / Institution</label>
                    {loadingUniversities ? (
                      <div className="mt-2 text-sm text-slate-500">Loading universities...</div>
                    ) : universities && universities.length > 0 ? (
                      <select value={universityId} onChange={(e) => { setUniversityId(e.target.value); loadDepartments(e.target.value); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none">
                        <option value="">Select university</option>
                        {universities.map((u) => (
                          <option key={u.id || u.university_id} value={u.id ?? u.university_id}>{u.university_name || u.name || u.university_name}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} placeholder="Enter institution name" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Department</label>
                    {loadingDepartments ? (
                      <div className="mt-2 text-sm text-slate-500">Loading departments...</div>
                    ) : departments && departments.length > 0 ? (
                      <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none">
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d.id || d.department_id} value={d.id ?? d.department_id}>{d.department_name || d.name || d.department_name}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} placeholder="Enter department id or name" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Program</label>
                    <input value={program} onChange={(e) => setProgram(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Batch / Session</label>
                    <input value={batchSession} onChange={(e) => setBatchSession(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" />
                  </div>
                </div>
              ) : academicLevel === "ssc" || academicLevel === "hsc" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Curriculum</label>
                    <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none">
                      <option value="">Select curriculum</option>
                      {CURRICULUM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Stream / Group</label>
                    <select value={streamGroup} onChange={(e) => setStreamGroup(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none">
                      <option value="">Select stream</option>
                      {STREAM_GROUP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Class / Level</label>
                    <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none">
                      <option value="">Select class level</option>
                      {(CLASS_LEVEL_OPTIONS[academicLevel] || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Academic Profile (Details)</label>
                  <textarea value={academicProfile} onChange={(e) => setAcademicProfile(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none" rows={3} />
                </div>
              )}

              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                  Save Changes
                </button>
                <button type="button" onClick={() => setIsEditingAccount(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  Cancel
                </button>
                {message ? <ErrorMessage tone={messageTone}>{message}</ErrorMessage> : null}
              </div>
            </form>
          ) : null}
        </Card>

        <section>
          <h3 className="text-base font-semibold text-slate-900">Quick Settings</h3>
          <p className="text-sm text-slate-500">Frequently used settings, quick access.</p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickCards.map((card) => (
              <Card key={card.title} className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-900">{card.title}</h4>
                <p className="mt-1 text-xs text-slate-600">{card.text}</p>
                <button
                  type="button"
                  onClick={() => setSelected(card.title)}
                  className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {card.buttonText}
                </button>
              </Card>
            ))}
          </div>
        </section>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-sm font-semibold text-amber-900">More settings coming soon!</h4>
          <p className="mt-1 text-sm text-amber-800">We are working on more powerful settings to give you full control over your learning experience.</p>
          <span className="mt-3 inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Stay tuned</span>
        </div>
      </div>
    );
  }

  function renderSectionContent() {
    if (selected === "Account") {
      return renderAccountSection();
    }

    if (selected === "Learning Preferences") {
      return (
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Learning Preferences</h3>
          <p className="mt-1 text-sm text-slate-500">Set default study options for your Q Arena learning flow.</p>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Default explanation style</p>
              <p className="mt-1 text-sm text-slate-700">Coming soon</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Preferred language</p>
              <p className="mt-1 text-sm text-slate-700">Coming soon</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Student level</p>
              <p className="mt-1 text-sm text-slate-700">Coming soon</p>
            </div>
            <button disabled type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">
              Save Preferences (Coming soon)
            </button>
          </div>
        </Card>
      );
    }

    if (selected === "Notifications") {
      return (
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Notifications</h3>
          <p className="mt-1 text-sm text-slate-500">Manage how you receive updates and reminders.</p>

          <div className="mt-5 space-y-3">
            {[
              { title: "Exam reminders", text: "Receive reminders for upcoming exams" },
              { title: "Prediction updates", text: "Get updated prediction alerts" },
              { title: "AI Tutor reminders", text: "Receive AI Tutor nudges" },
            ].map((item) => (
              <div key={item.title} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.text}</p>
                </div>
                <button disabled type="button" className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                  Off
                </button>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (selected === "Privacy & Security") {
      return (
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Privacy & Security</h3>
          <p className="mt-1 text-sm text-slate-500">Security and data controls are coming soon.</p>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Change password — Coming soon</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Login sessions — Coming soon</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Data privacy — Coming soon</div>
          </div>
        </Card>
      );
    }

    if (selected === "Appearance") {
      return (
        <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Appearance</h3>
          <p className="mt-1 text-sm text-slate-500">Theme and display preferences.</p>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Theme: Light / Dark / System — Coming soon</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Sidebar density — Coming soon</div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Billing / Plan</h3>
        <p className="mt-1 text-sm text-slate-500">Plan and subscription controls.</p>
        <div className="mt-5 space-y-3 text-sm text-slate-700">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Current plan: Free</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">Upgrade: Coming soon</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <PublicSidebar user={user} />
      </div>

      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" /> : null}

      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <PublicSidebar
          user={user}
          onNavigate={() => {
            setSidebarOpen(false);
          }}
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
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div>
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Settings</h1>
                <p className="text-xs text-slate-500 sm:text-sm">Manage your account, preferences, and learning experience.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[250px] lg:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search anything..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none"
                />
              </div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700"
                aria-label="Open profile"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{getInitials(displayName)}</span>
                <span className="hidden max-w-[100px] truncate text-xs font-medium sm:inline">{displayName}</span>
              </button>
            </div>
          </div>
        </header>

        <main>
          <div className="mx-auto max-w-[1280px] px-6 py-6">
            <style>{`   .settings-page-shell {     display: flex;     flex-direction: column;     gap: 1.5rem;   }    .settings-page-menu,   .settings-page-content {     min-width: 0;   }    @media (min-width: 1024px) {     .settings-page-shell {       flex-direction: row;       align-items: flex-start;     }      .settings-page-menu {       width: 320px;       flex: 0 0 320px;       position: sticky;       top: 6rem;     }      .settings-page-content {       flex: 1 1 0%;       min-width: 0;     }   } `}</style>
            <div className="settings-page-shell">
              <aside className="settings-page-menu">
                <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">Settings</h2>
                  <p className="mt-1 text-xs text-slate-500">Choose a category to manage your preferences.</p>

                  <div className="mt-4 space-y-1.5">
                    {SETTINGS_MENU.map((item) => {
                      const isActive = selected === item.key;
                      const Icon = item.Icon;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelected(item.key)}
                          className={`w-full rounded-xl border-l-4 px-3 py-2.5 text-left transition ${isActive
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-transparent text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                            <div>
                              <p className="text-sm font-semibold">{item.title}</p>
                              <p className={`text-xs ${isActive ? "text-blue-600/80" : "text-slate-500"}`}>{item.subtitle}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </aside>

              <section className="settings-page-content min-w-0 flex-1 space-y-6">{renderSectionContent()}</section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
