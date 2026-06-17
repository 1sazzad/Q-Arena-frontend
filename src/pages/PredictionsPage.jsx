import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookCheck,
  BookMarked,
  Brain,
  CircleHelp,
  ClipboardList,

  FileDown,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Sparkles,
  Target,
  TestTubeDiagonal,
  WandSparkles,
  X,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/useAuth";
import { Badge, Card } from "../components/ui";
import { apiEndpoints, downloadPredictionPdf } from "../api/api";
import { buildSubjectScopeParams, getAcademicProfileSignature } from "../utils/academicProfile";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";
import { normalizePredictionResponse } from "../utils/suggestionLookups";

const AVAILABLE_ROUTES = new Set([
  "/dashboard",
  "/subjects",
  "/search",
  "/predictions",
  "/analysis",
  "/profile",
  "/board-papers",
  "/suggestions",
  "/answers",
  "/generate-answer",
  "/ai-tutor",
]);

const DEFAULT_SUBJECT_NAME = "Linear Algebra";
const DEFAULT_EXAM_SESSION = "May 2024 Exam";
const ALL_SESSIONS = "All Sessions";
const ALL_TOPICS = "All Topics";
const PRIORITY_OPTIONS = [ALL_TOPICS, "High", "Medium", "Low"];
const FALLBACK_SESSIONS = [DEFAULT_EXAM_SESSION, "Previous Exams", ALL_SESSIONS];

const FALLBACK_SUBJECTS = [
  { subject_code: "LINEAR-ALGEBRA", subject_name: "Linear Algebra" },
  { subject_code: "CALCULUS", subject_name: "Calculus" },
  { subject_code: "PHYSICS", subject_name: "Physics" },
];

const FALLBACK_PREDICTION_DATA = {
  topTopics: [
    { topic: "Eigenvalues & Eigenvectors", confidence: 92, priority: "High", session: "May 2024 Exam" },
    { topic: "Determinants", confidence: 85, priority: "High", session: "May 2024 Exam" },
    { topic: "Matrix Transformations", confidence: 78, priority: "Medium", session: "Previous Exams" },
    { topic: "Vector Spaces", confidence: 64, priority: "Medium", session: "Previous Exams" },
    { topic: "Orthogonality & Projections", confidence: 58, priority: "Low", session: ALL_SESSIONS },
  ],
  likelyQuestions: [
    { question: "Find the eigenvalues and eigenvectors of matrix A.", topic: "Eigenvalues & Eigenvectors", confidence: 94, priority: "High", session: "May 2024 Exam" },
    { question: "Compute the determinant of the given matrix.", topic: "Determinants", confidence: 88, priority: "High", session: "May 2024 Exam" },
    { question: "Find the matrix of the linear transformation T.", topic: "Matrix Transformations", confidence: 79, priority: "Medium", session: "Previous Exams" },
    { question: "Check whether the given set is a basis for R³.", topic: "Vector Spaces", confidence: 68, priority: "Medium", session: "Previous Exams" },
    { question: "Find the projection of vector u onto vector v.", topic: "Orthogonality & Projections", confidence: 55, priority: "Low", session: ALL_SESSIONS },
  ],
  snapshot: {
    confidence: 87,
    questionsAnalyzed: 1240,
    pastExamsUsed: 8,
    predictedQuestions: 128,
    highPriorityTopics: 12,
  },
  sessions: FALLBACK_SESSIONS,
};

const sidebarItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Subjects", to: "/subjects", icon: BookCheck },
  { label: "Smart Predictions", to: "/predictions", icon: Brain },
  { label: "Search Questions", to: "/search", icon: Search },
  { label: "AI Tutor", to: "/ai-tutor", icon: WandSparkles },
  { label: "Bookmarks", to: "/bookmarks", icon: BookMarked },
  { label: "Practice", to: "/subjects", icon: Target },
  { label: "Mock Tests", to: "/mock-tests", icon: TestTubeDiagonal },
];

const sidebarBottomItems = [
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Help", to: "/help", icon: CircleHelp },
];

const predictionReasons = [
  { title: "Repeated in Past Exams", text: "Topics frequently appeared in past exams." },
  { title: "High Marks Frequency", text: "These topics carry more marks in the exam." },
  { title: "Recent Exam Trend", text: "Based on the latest exam patterns and focus areas." },
  { title: "Chapter Importance", text: "Aligns with syllabus weightage and learning outcomes." },
];

const usageSteps = [
  { title: "Start with High Priority", text: "Focus on high priority topics first for maximum impact." },
  { title: "Practice Likely Questions", text: "Solve predicted questions to build confidence and speed." },
  { title: "Review with AI Tutor", text: "Clear doubts and reinforce concepts with personalized help." },
];

const badgeToneByPriority = {
  "Very High": "rose",
  High: "rose",
  Medium: "amber",
  Low: "green",
};

function isRouteEnabled(path) {
  if (!path) {
    return false;
  }
  return AVAILABLE_ROUTES.has(path);
}

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function getPriorityFromConfidence(confidence) {
  const value = toNumber(confidence, 0);
  if (value >= 80) return "High";
  if (value >= 60) return "Medium";
  return "Low";
}

function priorityTone(priority) {
  if (priority === "High") return "rose";
  if (priority === "Medium") return "amber";
  return "green";
}

function getSessionLabel(sessionValue) {
  const text = String(sessionValue || "").trim();
  return text || ALL_SESSIONS;
}

function getSubjectName(subject) {
  return String(subject?.subject_name || subject?.name || subject?.subject_code || DEFAULT_SUBJECT_NAME).trim();
}

function getSubjectCode(subject) {
  return String(subject?.subject_code || subject?.code || "").trim();
}

function normalizePredictionData(payload, fallbackSubjectName = DEFAULT_SUBJECT_NAME) {
  const responseData = payload && typeof payload === "object" ? payload : {};
  const normalizedQuestions = normalizePredictionResponse(responseData);

  const topicCandidates = Array.isArray(responseData?.top_predicted_topics)
    ? responseData.top_predicted_topics
    : Array.isArray(responseData?.topics)
      ? responseData.topics
      : Array.isArray(responseData?.top_topics)
        ? responseData.top_topics
        : Array.isArray(responseData?.predictions)
          ? responseData.predictions
          : [];

  const topTopics = topicCandidates
    .map((item) => {
      const confidence = toNumber(item?.confidence ?? item?.prediction_score ?? item?.probability_score ?? item?.frequency, 0);
      const topic = String(item?.topic || item?.name || item?.predicted_topic || item?.label || "").trim();
      const priority = String(item?.priority || item?.importance || "").trim() || getPriorityFromConfidence(confidence);
      const session = getSessionLabel(item?.session || item?.exam || item?.exam_session || item?.exam_year);

      if (!topic) {
        return null;
      }

      return {
        topic,
        confidence,
        priority,
        session,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence);

  const likelyQuestions = normalizedQuestions
    .map((item) => {
      const question = String(item?.question_text || item?.question || "").trim();
      if (!question) {
        return null;
      }

      const confidence = toNumber(item?.prediction_score ?? item?.confidence ?? item?.score ?? item?.importance, 0);
      const priority = getPriorityFromConfidence(confidence);

      return {
        question,
        topic: String(item?.topic || item?.final_topic || item?.suggested_topic || "General").trim() || "General",
        subtopic: String(item?.subtopic || item?.label || "").trim(),
        confidence,
        priority,
        session: getSessionLabel(item?.session || item?.exam || item?.exam_session || item?.exam_year || item?.year),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence);

  const examYearsAnalyzed = Array.isArray(responseData?.exam_years_analyzed)
    ? responseData.exam_years_analyzed
    : [];

  const dynamicSessions = examYearsAnalyzed
    .map((year) => `${year} Exam`)
    .filter(Boolean);

  const sessions = Array.from(new Set([...FALLBACK_SESSIONS, ...dynamicSessions]));

  const confidenceFromPayload = toNumber(
    responseData?.expected_coverage ?? responseData?.overall_confidence ?? responseData?.confidence,
    0,
  );

  const confidence = confidenceFromPayload > 0
    ? confidenceFromPayload
    : (topTopics[0]?.confidence || likelyQuestions[0]?.confidence || 0);

  const questionsAnalyzed = toNumber(
    responseData?.total_questions_analyzed ?? responseData?.questions_analyzed,
    likelyQuestions.length,
  );

  const pastExamsUsed = toNumber(
    responseData?.past_exams_used ?? responseData?.exam_count,
    examYearsAnalyzed.length,
  );

  const highPriorityTopics = topTopics.filter((item) => item.priority === "High").length;

  return {
    subjectName: String(responseData?.subject_name || fallbackSubjectName || DEFAULT_SUBJECT_NAME),
    topTopics,
    likelyQuestions,
    sessions,
    snapshot: {
      confidence,
      questionsAnalyzed,
      pastExamsUsed,
      predictedQuestions: likelyQuestions.length,
      highPriorityTopics,
    },
  };
}

function filterPredictions(predictionData, filters) {
  const keyword = String(filters.search || "").trim().toLowerCase();
  const priority = filters.priority || ALL_TOPICS;
  const session = filters.exam || DEFAULT_EXAM_SESSION;

  const matchesSearch = (textValues) => {
    if (!keyword) return true;
    return textValues.some((value) => String(value || "").toLowerCase().includes(keyword));
  };

  const matchesPriority = (itemPriority) => {
    if (priority === ALL_TOPICS) return true;
    return String(itemPriority || "").toLowerCase() === priority.toLowerCase();
  };

  const matchesSession = (itemSession) => {
    if (session === ALL_SESSIONS) return true;
    if (session === "Previous Exams") {
      return String(itemSession || "").toLowerCase().includes("previous") || String(itemSession || "").toLowerCase().includes("exam");
    }
    return String(itemSession || "").toLowerCase().includes(session.toLowerCase()) || !itemSession;
  };

  const topTopics = predictionData.topTopics.filter((item) =>
    matchesPriority(item.priority) &&
    matchesSession(item.session) &&
    matchesSearch([item.topic, item.session]),
  );

  const likelyQuestions = predictionData.likelyQuestions.filter((item) =>
    matchesPriority(item.priority) &&
    matchesSession(item.session) &&
    matchesSearch([item.question, item.topic, item.subtopic, item.session]),
  );

  return {
    topTopics,
    likelyQuestions,
  };
}

function Sidebar({ user, onNavigate }) {
  const name = user?.full_name || "Alex Chen";

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const enabled = isRouteEnabled(item.to);
    const baseClass = "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

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
        {sidebarItems.map(renderNavItem)}
      </nav>

      <div className="space-y-1 border-t border-slate-100 px-3 py-3">
        {sidebarBottomItems.map(renderNavItem)}
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">AC</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">Student</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function FilterSelect({ icon: Icon, label, value, options, onChange }) {
  return (
    <label className="relative block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="pointer-events-none mb-1 flex items-center gap-2">
        <div className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent pr-8 text-sm font-semibold text-slate-900 outline-none"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}

function PredictionsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const initialSubjectCode = String(location.state?.subject_code || "").trim();
  const academicProfileSignature = getAcademicProfileSignature(user);
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [defaultSubjectCode, setDefaultSubjectCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    subjectCode: "",
    exam: DEFAULT_EXAM_SESSION,
    priority: ALL_TOPICS,
  });

  const [loading, setLoading] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [predictionData, setPredictionData] = useState(normalizePredictionData(FALLBACK_PREDICTION_DATA, DEFAULT_SUBJECT_NAME));

  const selectedSubject = useMemo(
    () => subjects.find((subject) => getSubjectCode(subject) === filters.subjectCode) || subjects[0] || null,
    [filters.subjectCode, subjects],
  );

  const sessionOptions = useMemo(() => {
    const merged = Array.from(new Set([DEFAULT_EXAM_SESSION, ...predictionData.sessions, ALL_SESSIONS]));
    return merged.map((session) => ({ value: session, label: session }));
  }, [predictionData.sessions]);

  const filteredData = useMemo(() => filterPredictions(predictionData, {
    exam: filters.exam,
    priority: filters.priority,
    search: searchTerm,
  }), [filters.exam, filters.priority, predictionData, searchTerm]);

  const snapshot = useMemo(() => {
    const confidence = toNumber(predictionData.snapshot?.confidence, 0);
    return {
      confidence,
      confidenceAngle: Math.min(Math.max(confidence, 0), 100),
      questionsAnalyzed: toNumber(predictionData.snapshot?.questionsAnalyzed, filteredData.likelyQuestions.length),
      pastExamsUsed: toNumber(predictionData.snapshot?.pastExamsUsed, 0),
      predictedQuestions: toNumber(predictionData.snapshot?.predictedQuestions, filteredData.likelyQuestions.length),
      highPriorityTopics: toNumber(
        predictionData.snapshot?.highPriorityTopics,
        filteredData.topTopics.filter((item) => item.priority === "High").length,
      ),
    };
  }, [filteredData.likelyQuestions.length, filteredData.topTopics, predictionData.snapshot]);

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      setSubjectLoading(true);
      setStatusMessage("");

      try {
        const params = buildSubjectScopeParams(user, { status: "published" });
        const response = await apiEndpoints.getSubjects(params);
        const normalizedSubjects = normalizeSubjectList(response.data);
        const nextSubjects = normalizedSubjects.length > 0 ? normalizedSubjects : FALLBACK_SUBJECTS;

        if (!active) {
          return;
        }

        setSubjects(nextSubjects);
        const linearAlgebraSubject = nextSubjects.find((item) => getSubjectName(item).toLowerCase().includes("linear algebra"));
        const initialMatch = initialSubjectCode
          ? nextSubjects.find((item) => getSubjectCode(item) === initialSubjectCode)
          : null;
        const defaultSubject = initialMatch || linearAlgebraSubject || nextSubjects[0] || null;
        const nextDefaultCode = getSubjectCode(defaultSubject);
        setDefaultSubjectCode(nextDefaultCode);
        setFilters((current) => ({ ...current, subjectCode: nextDefaultCode }));
      } catch {
        if (!active) {
          return;
        }

        setSubjects(FALLBACK_SUBJECTS);
        setDefaultSubjectCode(FALLBACK_SUBJECTS[0].subject_code);
        setFilters((current) => ({ ...current, subjectCode: FALLBACK_SUBJECTS[0].subject_code }));
        setStatusMessage("Unable to load live subjects. Using fallback subjects.");
      } finally {
        if (active) {
          setSubjectLoading(false);
        }
      }
    }

    loadSubjects();

    return () => {
      active = false;
    };
  }, [academicProfileSignature, initialSubjectCode, user]);

  useEffect(() => {
    if (!filters.subjectCode) {
      return;
    }

    let active = true;

    async function loadPredictions() {
      setLoading(true);
      setStatusMessage("");
      setUsingFallbackData(false);

      try {
        const response = await apiEndpoints.getPredictions(filters.subjectCode);
        if (!active) {
          return;
        }

        const subjectName = getSubjectName(selectedSubject);
        const normalized = normalizePredictionData(response.data, subjectName);
        setPredictionData(normalized);
      } catch {
        if (!active) {
          return;
        }

        const subjectName = getSubjectName(selectedSubject);
        setPredictionData(normalizePredictionData(FALLBACK_PREDICTION_DATA, subjectName));
        setUsingFallbackData(true);
        setStatusMessage("Using sample prediction data because live data is unavailable.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPredictions();

    return () => {
      active = false;
    };
  }, [filters.subjectCode, selectedSubject]);

  const handleResetFilters = () => {
    setFilters({
      subjectCode: defaultSubjectCode || filters.subjectCode,
      exam: DEFAULT_EXAM_SESSION,
      priority: ALL_TOPICS,
    });
    setSearchTerm("");
  };

  const handleDownloadReport = async () => {
    if (!filters.subjectCode || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setStatusMessage("");

    try {
      const { data, filename } = await downloadPredictionPdf(filters.subjectCode);
      const blob = data instanceof Blob ? data : new Blob([data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename || `q-arena-predictions-${filters.subjectCode}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      setStatusMessage("Prediction report download is currently unavailable.");
    } finally {
      setIsDownloading(false);
    }
  };

  const hasFilteredData = filteredData.topTopics.length > 0 || filteredData.likelyQuestions.length > 0;

  const quickActions = [
    {
      title: "Practice Predicted Questions",
      subtitle: "Start practicing now",
      to: "/subjects",
      icon: Target,
      enabled: isRouteEnabled("/subjects"),
    },
    {
      title: "Open AI Tutor",
      subtitle: "Get help on key topics",
      to: "/ai-tutor",
      icon: WandSparkles,
      enabled: isRouteEnabled("/ai-tutor"),
    },
    {
      title: "Download Prediction Report",
      subtitle: isDownloading ? "Preparing report..." : "PDF report with all predictions",
      icon: FileDown,
      enabled: Boolean(filters.subjectCode),
      onClick: handleDownloadReport,
    },
  ];

  if (subjectLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <Card className="mx-auto max-w-2xl rounded-2xl border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-600">Loading Smart Predictions...</p>
        </Card>
      </div>
    );
  }

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
                onClick={() => setSidebarOpen((current) => !current)}
                className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Smart Predictions</h1>
                <p className="mt-1 text-sm text-slate-500">Focus on the most likely questions from past exam analysis.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[290px] lg:w-[380px]">
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
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <FilterSelect
                  icon={GraduationCap}
                  label="Subject"
                  value={filters.subjectCode}
                  onChange={(value) => setFilters((current) => ({ ...current, subjectCode: value }))}
                  options={subjects.map((subject) => ({
                    value: getSubjectCode(subject),
                    label: formatSubjectLabel(subject),
                  }))}
                />
                <FilterSelect
                  icon={ClipboardList}
                  label="Exam / Session"
                  value={filters.exam}
                  onChange={(value) => setFilters((current) => ({ ...current, exam: value }))}
                  options={sessionOptions}
                />
                <FilterSelect
                  icon={Sparkles}
                  label="Topic Priority"
                  value={filters.priority}
                  onChange={(value) => setFilters((current) => ({ ...current, priority: value }))}
                  options={PRIORITY_OPTIONS.map((option) => ({ value: option, label: option }))}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Reset Filters
                  </button>

                  <button
                    type="button"
                    onClick={() => { if (!filters.subjectCode) return; navigate(`/subjects/${encodeURIComponent(filters.subjectCode)}/analysis`, { state: { subject_code: filters.subjectCode } }); }}
                    disabled={!filters.subjectCode}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    View Analysis
                  </button>
                </div>
              </div>
            </Card>

            {(statusMessage || usingFallbackData) && (
              <Card className="rounded-2xl border-slate-200 bg-white p-4 text-sm text-slate-600">
                {statusMessage || "Using sample prediction data because live data is unavailable."}
              </Card>
            )}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <main className="space-y-6">
                <Card className="overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white shadow-sm sm:p-6 lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex rounded-xl bg-white/20 p-2">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">{predictionData.subjectName || DEFAULT_SUBJECT_NAME} predictions updated today</h2>
                      <p className="mt-1 text-sm text-indigo-100">
                        Based on analysis of {snapshot.pastExamsUsed || "multiple"} past exams and {snapshot.questionsAnalyzed || 0} questions.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white/15 p-3">
                      <p className="text-xs text-indigo-100">Predicted Questions</p>
                      <p className="mt-1 text-2xl font-bold">{snapshot.predictedQuestions}</p>
                      <p className="text-xs text-indigo-100">This Exam</p>
                    </div>
                    <div className="rounded-xl bg-white/15 p-3">
                      <p className="text-xs text-indigo-100">High Priority Topics</p>
                      <p className="mt-1 text-2xl font-bold">{snapshot.highPriorityTopics}</p>
                      <p className="text-xs text-indigo-100">Topics</p>
                    </div>
                    <div className="rounded-xl bg-white/15 p-3">
                      <p className="text-xs text-indigo-100">Expected Coverage</p>
                      <p className="mt-1 text-2xl font-bold">{snapshot.confidenceAngle}%</p>
                      <p className="text-xs text-indigo-100">Confidence</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Top Predicted Topics</h3>
                  <div className="mt-4 space-y-3">
                    {loading ? (
                      <p className="text-sm text-slate-500">Loading predictions...</p>
                    ) : filteredData.topTopics.length === 0 ? (
                      <p className="text-sm text-slate-500">No predictions found for these filters.</p>
                    ) : (
                      filteredData.topTopics.map((item, index) => (
                        <div key={`${item.topic}-${index}`} className="rounded-xl bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">{index + 1}</span>
                              <p className="text-sm font-semibold text-slate-900">{item.topic}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-700">{Math.round(item.confidence)}%</span>
                              <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(3, Math.round(item.confidence))}%` }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Most Likely Questions</h3>
                  <div className="mt-4 space-y-3">
                    {loading ? (
                      <p className="text-sm text-slate-500">Loading predictions...</p>
                    ) : filteredData.likelyQuestions.length === 0 ? (
                      <p className="text-sm text-slate-500">No predictions found for these filters.</p>
                    ) : (
                      filteredData.likelyQuestions.map((item) => (
                        <div key={`${item.question}-${item.topic}`} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.question}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.topic}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={badgeToneByPriority[item.priority] || "amber"}>{item.priority}</Badge>
                            <Link
                              to="/subjects"
                              state={{ subject_code: filters.subjectCode }}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                            >
                              Practice
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {!loading && !hasFilteredData && (
                  <Card className="rounded-2xl border-slate-200 bg-white p-5 text-sm text-slate-500">
                    No predictions found for these filters.
                  </Card>
                )}

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Why these predictions?</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {predictionReasons.map((item) => (
                      <div key={item.title} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <h3 className="text-lg font-semibold text-slate-900">How to use these predictions</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {usageSteps.map((item, index) => (
                      <div key={item.title} className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-indigo-600">Step {index + 1}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </main>

              <aside className="space-y-4">
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <h3 className="text-sm font-semibold text-slate-900">Prediction Snapshot</h3>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="relative h-24 w-24 rounded-full p-1.5" style={{ background: `conic-gradient(#6366f1 ${snapshot.confidenceAngle}%, #e2e8f0 ${snapshot.confidenceAngle}%)` }}>
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-900">{snapshot.confidenceAngle}%</div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Overall Confidence</p>
                      <p className="mt-1 text-xs text-slate-500">High confidence that these topics will appear in your exam.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Questions Analyzed</p>
                      <p className="text-lg font-semibold text-slate-900">{snapshot.questionsAnalyzed}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Past Exams Used</p>
                      <p className="text-lg font-semibold text-slate-900">{snapshot.pastExamsUsed}</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Upcoming Exam</h3>
                    <span className="text-xs font-medium text-indigo-600">View all</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{predictionData.subjectName || DEFAULT_SUBJECT_NAME}</p>
                    <p className="mt-1 text-xs text-slate-500">May 20, 2024</p>
                    <p className="mt-1 text-xs font-semibold text-rose-600">7 Days left</p>
                  </div>
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
                  <div className="mt-3 space-y-3">
                    {quickActions.map((item) => {
                      const Icon = item.icon;

                      if (!item.enabled) {
                        return (
                          <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3 opacity-70">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <div className="rounded-lg bg-slate-200 p-1.5 text-slate-600">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                                  <p className="text-xs text-slate-500">{item.subtitle}</p>
                                </div>
                              </div>
                              <Badge tone="slate">Coming soon</Badge>
                            </div>
                          </div>
                        );
                      }

                      if (item.onClick) {
                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={item.onClick}
                            disabled={isDownloading}
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-white disabled:opacity-70"
                          >
                            <div className="flex items-start gap-2">
                              <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="text-xs text-slate-500">{item.subtitle}</p>
                              </div>
                            </div>
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={item.title}
                          to={item.to}
                          state={{ subject_code: filters.subjectCode }}
                          className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-indigo-200 hover:bg-white"
                        >
                          <div className="flex items-start gap-2">
                            <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-700">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="text-xs text-slate-500">{item.subtitle}</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PredictionsPage;