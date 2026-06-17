import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookCheck,
  BookMarked,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CirclePlus,
  CircleUser,
  Filter,
  LayoutDashboard,
  Menu,
  Notebook,
  Search,
  Settings,
  Sparkles,
  Target,
  TestTubeDiagonal,
  WandSparkles,
  X,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { Badge, Card } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { apiEndpoints } from "../api/api";
import { buildSubjectScopeParams, getAcademicProfileSignature } from "../utils/academicProfile";
import { normalizeSubjectList } from "../utils/subjectLookups";

const AVAILABLE_ROUTES = new Set([
  "/dashboard",
  "/subjects",
  "/predictions",
  "/analysis",
  "/search",
  "/ai-tutor",
]);

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Recently Studied" },
  { id: "progress-high", label: "Progress High to Low" },
  { id: "progress-low", label: "Progress Low to High" },
  { id: "name", label: "Name A-Z" },
];

const FALLBACK_NOTICE = "Using sample subject data because live data is unavailable.";

function createDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

const FALLBACK_SUBJECTS = [
  {
    id: "linear-algebra",
    subject_code: "510225",
    subject_name: "Linear Algebra",
    studied_questions: 128,
    total_questions: 240,
    progress: 53,
    lastStudiedAt: createDateDaysAgo(0),
    accent: { bg: "bg-blue-100", text: "text-blue-600" },
  },
  {
    id: "calculus",
    subject_code: "CALCULUS",
    subject_name: "Calculus",
    studied_questions: 86,
    total_questions: 180,
    progress: 47,
    lastStudiedAt: createDateDaysAgo(1),
    accent: { bg: "bg-purple-100", text: "text-purple-600" },
  },
  {
    id: "probability",
    subject_code: "PROBABILITY",
    subject_name: "Probability",
    studied_questions: 64,
    total_questions: 150,
    progress: 43,
    lastStudiedAt: createDateDaysAgo(2),
    accent: { bg: "bg-emerald-100", text: "text-emerald-600" },
  },
  {
    id: "physics",
    subject_code: "PHYSICS",
    subject_name: "Physics",
    studied_questions: 72,
    total_questions: 160,
    progress: 45,
    lastStudiedAt: createDateDaysAgo(3),
    accent: { bg: "bg-orange-100", text: "text-orange-600" },
  },
  {
    id: "chemistry",
    subject_code: "CHEMISTRY",
    subject_name: "Chemistry",
    studied_questions: 54,
    total_questions: 140,
    progress: 39,
    lastStudiedAt: createDateDaysAgo(4),
    accent: { bg: "bg-rose-100", text: "text-rose-600" },
  },
  {
    id: "data-structures",
    subject_code: "DATA-STRUCTURES",
    subject_name: "Data Structures",
    studied_questions: 48,
    total_questions: 120,
    progress: 40,
    lastStudiedAt: createDateDaysAgo(5),
    accent: { bg: "bg-teal-100", text: "text-teal-600" },
  },
];

const FALLBACK_EXAMS = [
  { date: "May 20", title: "Midterm Exam", subject: "Linear Algebra", remaining: "7 Days left" },
  { date: "May 28", title: "Chapter 5 Test", subject: "Calculus", remaining: "15 Days left" },
  { date: "Jun 05", title: "Final Assessment", subject: "Physics", remaining: "23 Days left" },
];

const FALLBACK_FOCUS = [
  {
    subject: "Linear Algebra",
    topic: "Eigenvalues & Eigenvectors",
    message: "You’re performing well! Keep it up.",
  },
  {
    subject: "Calculus",
    topic: "Integrals",
    message: "A few weak areas detected. Practice more questions.",
  },
  {
    subject: "Physics",
    topic: "Mechanics",
    message: "Revisit key concepts to strengthen your understanding.",
  },
];

function clampProgress(value, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return Math.max(0, Math.min(100, fallback));
  }
  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function isRouteEnabled(path) {
  return AVAILABLE_ROUTES.has(path);
}

function getStatusFromProgress(progress) {
  if (progress >= 99) {
    return "completed";
  }
  if (progress > 0) {
    return "in-progress";
  }
  return "not-started";
}

function formatLastStudiedText(isoString) {
  if (!isoString) {
    return "Last studied: Recently";
  }
  const timestamp = Date.parse(isoString);
  if (!Number.isFinite(timestamp)) {
    return `Last studied: ${isoString}`;
  }
  const diffMs = Date.now() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return "Last studied: Today";
  }
  if (diffDays === 1) {
    return "Last studied: Yesterday";
  }
  return `Last studied: ${diffDays} days ago`;
}

function normalizeSubjectsData(subjects, accentPalette = []) {
  const base = Array.isArray(subjects) ? subjects : [];
  return base.map((subject, index) => {
    const accent = accentPalette[index % accentPalette.length] || {};
    const totalQuestions = Number(
      subject.total_questions ??
        subject.total_questions_count ??
        subject.totalQuestions ??
        subject.question_count ??
        subject.questions_total ??
        0,
    );
    const studiedQuestions = Number(
      subject.questions_studied ??
        subject.studied_questions ??
        subject.completed_questions ??
        subject.questions_completed ??
        subject.questionsPracticed ??
        0,
    );

    let progress = clampProgress(
      subject.progress ??
        subject.progress_percent ??
        subject.progress_percentage ??
        subject.completion_percentage ??
        subject.completionPercent ??
        (totalQuestions > 0 ? (studiedQuestions / totalQuestions) * 100 : 0),
      0,
    );

    if (progress === 0 && totalQuestions > 0 && studiedQuestions > 0) {
      progress = clampProgress((studiedQuestions / totalQuestions) * 100, progress);
    }

    const lastStudiedAt =
      subject.last_studied_at ||
      subject.last_activity_at ||
      subject.lastStudiedAt ||
      subject.updated_at ||
      subject.created_at ||
      "";

    return {
      id: subject.id || subject.subject_code || `subject-${index}`,
      subject_code: subject.subject_code,
      subject_name: subject.subject_name || subject.name || subject.subject_code,
      studied_questions: studiedQuestions,
      total_questions: totalQuestions,
      progress,
      lastStudiedAt,
      status: getStatusFromProgress(progress),
      accent,
    };
  });
}

function calculateSubjectStats(subjects) {
  const list = Array.isArray(subjects) ? subjects : [];
  const enrolled = list.length;
  const active = list.filter((subject) => {
    if (subject.status === "completed" || subject.status === "in-progress") {
      return true;
    }
    const lastStudied = Date.parse(subject.lastStudiedAt || "");
    if (!Number.isFinite(lastStudied)) {
      return false;
    }
    const diffDays = (Date.now() - lastStudied) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;
  const averageProgress = list.length === 0
    ? 0
    : Math.round(list.reduce((sum, subject) => sum + (subject.progress || 0), 0) / list.length);

  return {
    enrolled,
    active,
    averageProgress,
  };
}

function sortSubjects(subjects, optionId) {
  const list = [...subjects];
  if (optionId === "progress-high") {
    return list.sort((a, b) => b.progress - a.progress);
  }
  if (optionId === "progress-low") {
    return list.sort((a, b) => a.progress - b.progress);
  }
  if (optionId === "name") {
    return list.sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  }
  // default recent
  return list.sort((a, b) => {
    const aTime = Date.parse(a.lastStudiedAt || "") || 0;
    const bTime = Date.parse(b.lastStudiedAt || "") || 0;
    return bTime - aTime;
  });
}

function filterSubjects(subjects, searchTerm, statusId) {
  const keyword = String(searchTerm || "").trim().toLowerCase();
  return subjects.filter((subject) => {
    const matchesSearch = keyword
      ? [subject.subject_name, subject.subject_code]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(keyword))
      : true;

    if (!matchesSearch) {
      return false;
    }

    if (statusId === "all") {
      return true;
    }

    if (statusId === "completed") {
      return subject.status === "completed";
    }

    if (statusId === "in-progress") {
      return subject.status === "in-progress";
    }

    return true;
  });
}

const ACCENT_PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-600" },
  { bg: "bg-purple-100", text: "text-purple-600" },
  { bg: "bg-emerald-100", text: "text-emerald-600" },
  { bg: "bg-orange-100", text: "text-orange-600" },
  { bg: "bg-rose-100", text: "text-rose-600" },
  { bg: "bg-teal-100", text: "text-teal-600" },
];

const sidebarItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Subjects", to: "/subjects", icon: BookCheck },
  { label: "Smart Predictions", to: "/predictions", icon: Brain },
  { label: "Search Questions", to: "/search", icon: Search },
  { label: "AI Tutor", to: "/ai-tutor", icon: WandSparkles },
  { label: "Bookmarks", to: "/bookmarks", icon: BookMarked },
  { label: "Practice", to: "/subjects", icon: Target },
  { label: "Mock Tests", to: "/mock-tests", icon: TestTubeDiagonal },
  { label: "Notes", to: "/notes", icon: Notebook },
];

const sidebarBottomItems = [
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Help", to: "/help", icon: CircleHelp },
];

function Sidebar({ onNavigate, user }) {
  const baseClass = "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

  const renderItem = (item) => {
    const Icon = item.icon;
    const enabled = isRouteEnabled(item.to);

    if (!enabled) {
      return (
        <div key={item.label} className={`${baseClass} cursor-not-allowed text-slate-500 opacity-70`}>
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
          <Badge tone="slate" className="ml-auto">Coming soon</Badge>
        </div>
      );
    }

    return (
      <NavLink
        key={item.label}
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          `${baseClass} ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`
        }
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white">
      <div className="px-5 pb-5 pt-6">
        <BrandLogo className="gap-3" imageClassName="h-9 w-9" textClassName="text-lg font-semibold text-slate-900" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {sidebarItems.map(renderItem)}
      </nav>

      <div className="space-y-1 border-t border-slate-100 px-3 py-3">
        {sidebarBottomItems.map(renderItem)}
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">AC</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.full_name || "Alex Chen"}</p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon, accent }) {
  return (
    <Card className="flex items-center gap-4 rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className={`rounded-xl p-3 text-lg ${accent.bg} ${accent.text}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </Card>
  );
}

function ProgressRing({ value }) {
  return (
    <div className="relative h-24 w-24 rounded-full p-1.5" style={{ background: `conic-gradient(#6366f1 ${value}%, #e2e8f0 ${value}%)` }}>
      <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-900">{value}%</div>
    </div>
  );
}

function SubjectCard({ subject, onContinue, onViewAnalysis }) {
  const accentBg = subject.accent?.bg || "bg-slate-100";
  const accentText = subject.accent?.text || "text-slate-600";
  return (
    <Card className="relative flex h-full flex-col rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accentBg} ${accentText}`}>
        <BookOpen className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{subject.subject_name}</h3>
      <p className="mt-1 text-sm text-slate-500">{subject.subject_code}</p>

      <div className="mt-4 space-y-2">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{subject.studied_questions}</span> / {subject.total_questions || "—"} Questions Studied
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500" style={{ width: `${subject.progress}%` }} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-900">{subject.progress}%</span>
          <span className="text-xs text-slate-500">{formatLastStudiedText(subject.lastStudiedAt)}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onContinue(subject)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onViewAnalysis && onViewAnalysis(subject)}
          className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          View Analysis
        </button>
      </div>

      <CircleUser className="absolute right-5 top-5 h-5 w-5 text-slate-200" />
    </Card>
  );
}

function WeeklyGoalCard() {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Weekly Goal</h3>
        <span className="text-xs font-medium text-slate-500">Edit <Badge tone="slate">Coming soon</Badge></span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-24 w-24 rounded-full p-1.5" style={{ background: "conic-gradient(#22c55e 70%, #e2e8f0 70%)" }}>
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-900">70%</div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Study 15 hours this week</p>
          <p className="mt-1 text-xs text-slate-500">10.5 / 15 hours</p>
          <div className="mt-3 flex gap-2 text-xs font-semibold text-slate-500">
            {"MTWTFSS".split("").map((day, index) => (
              <span
                key={`${day}-${index}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${index < 4 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function UpcomingExamsCard({ exams }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Upcoming Exams</h3>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
          View all
          <Badge tone="slate">Coming soon</Badge>
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {exams.map((exam) => (
          <div key={`${exam.date}-${exam.title}`} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{exam.subject}</p>
              <p className="text-xs text-slate-500">{exam.title}</p>
            </div>
            <div className="text-right text-xs font-semibold text-indigo-600">
              <p>{exam.date}</p>
              <p className="mt-1 text-rose-500">{exam.remaining}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StudyTipCard() {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-indigo-700">
        <Sparkles className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Study Tip</h3>
      </div>
      <p className="mt-3 text-sm text-slate-700">Review concepts spaced over time to improve long-term retention.</p>
      <p className="mt-2 text-xs font-medium text-indigo-600">Try revisiting topics you studied last week!</p>
    </Card>
  );
}

function RecommendedFocusCard({ focusList, predictEnabled, onReview }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Recommended Focus</h3>
        {predictEnabled ? (
          <button
            type="button"
            onClick={onReview}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Review
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            Review
            <Badge tone="slate">Coming soon</Badge>
          </span>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {focusList.map((item) => (
          <div key={`${item.subject}-${item.topic}`} className="rounded-2xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{item.subject} — {item.topic}</p>
            <p className="mt-1 text-xs text-slate-500">{item.message}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
        View all recommendations
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Card>
  );
}

function SubjectsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const academicProfileSignature = getAcademicProfileSignature(user);

  const locationState = location.state;
  const initialSubjectSearch = typeof locationState?.subject_code === "string" ? String(locationState.subject_code) : "";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState(initialSubjectSearch);
  const [statusTab, setStatusTab] = useState("all");
  const [sortOption, setSortOption] = useState("recent");
  const [usingFallback, setUsingFallback] = useState(false);

  const predictEnabled = isRouteEnabled("/predictions");

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      setLoading(true);
      setStatusMessage("");
      setUsingFallback(false);

      try {
        const params = buildSubjectScopeParams(user, { status: "published" });
        const response = await apiEndpoints.getSubjects(params);
        if (!active) {
          return;
        }
        const normalized = normalizeSubjectList(response.data);
        const enriched = normalizeSubjectsData(normalized, ACCENT_PALETTE);

        if (enriched.length === 0) {
          setSubjects(normalizeSubjectsData(FALLBACK_SUBJECTS, ACCENT_PALETTE));
          setUsingFallback(true);
          setStatusMessage("Your subjects will appear here when available.");
        } else {
          setSubjects(enriched);
        }
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("Failed to load subjects", error);
        setSubjects(normalizeSubjectsData(FALLBACK_SUBJECTS, ACCENT_PALETTE));
        setUsingFallback(true);
        setStatusMessage("Unable to load live subjects. Showing fallback subjects.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSubjects();

    return () => {
      active = false;
    };
  }, [academicProfileSignature, user]);

  const filteredSubjects = useMemo(() => {
    const filtered = filterSubjects(subjects, searchTerm, statusTab);
    return sortSubjects(filtered, sortOption);
  }, [statusTab, subjects, searchTerm, sortOption]);

  const stats = useMemo(() => calculateSubjectStats(subjects), [subjects]);

  const handleContinue = (subject) => {
    const normalizedSubjectCode = String(subject?.subject_code || "").trim();

    if (!normalizedSubjectCode) {
      navigate("/subjects");
      return;
    }

    navigate(`/subjects/${encodeURIComponent(normalizedSubjectCode)}/questions`, {
      state: { subject_code: normalizedSubjectCode, subject_name: subject.subject_name },
    });
  };

  const handleViewAnalysis = (subject) => {
    const normalizedSubjectCode = String(subject?.subject_code || "").trim();

    if (!normalizedSubjectCode) {
      navigate("/subjects");
      return;
    }

    navigate(`/subjects/${encodeURIComponent(normalizedSubjectCode)}/analysis`, {
      state: { subject_code: normalizedSubjectCode, subject_name: subject.subject_name },
    });
  };

  const handleReviewFocus = () => {
    if (!predictEnabled) {
      return;
    }
    const topSubject = subjects[0];
    navigate("/predictions", {
      state: topSubject ? { subject_code: topSubject.subject_code } : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <Sidebar user={user} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar user={user} onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((value) => !value)}
                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Toggle dashboard menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">My Subjects</h1>
                <p className="mt-1 text-sm text-slate-500">Track your progress and continue learning across all your subjects.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[300px] lg:w-[380px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  type="search"
                  placeholder="Search topics or questions..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                />
              </div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">AC</div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="space-y-6">
              <section className="grid gap-4 lg:grid-cols-4">
                <SummaryCard
                  title="Enrolled Subjects"
                  value={stats.enrolled}
                  subtitle="Total subjects"
                  icon={BookCheck}
                  accent={{ bg: "bg-blue-100", text: "text-blue-600" }}
                />
                <SummaryCard
                  title="Active This Week"
                  value={stats.active}
                  subtitle="Subjects in progress"
                  icon={Target}
                  accent={{ bg: "bg-emerald-100", text: "text-emerald-600" }}
                />
                <Card className="flex items-center gap-4 rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                  <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-4">
                    <ProgressRing value={stats.averageProgress} />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overall Progress</p>
                      <p className="mt-1 text-sm text-slate-600">Across all subjects</p>
                    </div>
                  </div>
                </Card>
                <SummaryCard
                  title="Upcoming Exams"
                  value={FALLBACK_EXAMS.length}
                  subtitle="In the next 30 days"
                  icon={CalendarDays}
                  accent={{ bg: "bg-orange-100", text: "text-orange-600" }}
                />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="relative flex-1 min-w-[220px]">
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      type="search"
                      placeholder="Search within subjects..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-300"
                    />
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </label>

                  <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-sm font-medium text-slate-600">
                    {STATUS_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusTab(tab.id)}
                        className={`rounded-lg px-3 py-1.5 transition ${statusTab === tab.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    <Filter className="h-4 w-4" />
                    <select
                      value={sortOption}
                      onChange={(event) => setSortOption(event.target.value)}
                      className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section>
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((item) => (
                      <Card key={item} className="h-full rounded-2xl border-slate-200 bg-white/80 p-5 shadow-sm">
                        <div className="h-10 w-10 rounded-xl bg-slate-200" />
                        <div className="mt-4 h-5 w-3/4 rounded bg-slate-200" />
                        <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
                        <div className="mt-5 h-2 rounded bg-slate-100" />
                        <div className="mt-3 h-4 w-1/3 rounded bg-slate-100" />
                      </Card>
                    ))}
                  </div>
                ) : filteredSubjects.length === 0 ? (
                  <Card className="rounded-2xl border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    No subjects match these filters yet.
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredSubjects.map((subject) => (
                      <SubjectCard
                        key={subject.id}
                        subject={subject}
                        onContinue={handleContinue}
                        onViewAnalysis={handleViewAnalysis}
                      />
                    ))}

                    <Card className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 text-center shadow-sm">
                      <div className="rounded-full bg-slate-100 p-3 text-slate-500">
                        <CirclePlus className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-lg font-semibold text-slate-700">Add Subject</p>
                      <p className="mt-1 text-sm text-slate-500">Explore more subjects to expand your learning</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                        Coming soon
                        <Badge tone="slate">Disabled</Badge>
                      </span>
                    </Card>
                  </div>
                )}

                {statusMessage && !loading ? (
                  <p className="mt-3 text-xs text-slate-500">{statusMessage}</p>
                ) : null}

                {usingFallback ? (
                  <p className="mt-2 text-xs font-medium text-amber-600">{FALLBACK_NOTICE}</p>
                ) : null}
              </section>
            </main>

            <aside className="space-y-4">
              <UpcomingExamsCard exams={FALLBACK_EXAMS} />
              <StudyTipCard />
              <WeeklyGoalCard />
              <RecommendedFocusCard
                focusList={FALLBACK_FOCUS}
                predictEnabled={predictEnabled}
                onReview={handleReviewFocus}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubjectsPage;
