import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Bell, Brain, ChevronRight, Compass, Menu, Search, Sparkles, WandSparkles, Plus, X } from "lucide-react";

import PublicSidebar from "../components/PublicSidebar";
import { useAuth } from "../context/useAuth";
import { apiEndpoints } from "../api/api";
import { buildSubjectScopeParams, getAcademicProfileSignature } from "../utils/academicProfile";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";
import { normalizePredictionResponse } from "../utils/suggestionLookups";
import { Badge, Card } from "../components/ui";

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

const FALLBACK_DASHBOARD_DATA = {
  subjects: [
    { id: "linear", subject_code: "LINEAR-ALGEBRA", name: "Linear Algebra", progress: 72, lastStudied: "Last studied 2h ago" },
    { id: "ds", subject_code: "DATA-STRUCTURES", name: "Data Structures", progress: 48, lastStudied: "Last studied 1d ago" },
    { id: "dm", subject_code: "DISCRETE-MATH", name: "Discrete Math", progress: 36, lastStudied: "Last studied 3d ago" },
  ],
  recommendation: {
    title: "Focus on Eigenvalues & Eigenvectors",
    detail: "Based on past papers, 6-8 questions are likely from this topic.",
    topic: "Eigenvalues & Eigenvectors",
  },
  upcomingExams: [
    { subject: "Linear Algebra", title: "Mid Term Exam", date: "15 May" },
    { subject: "Data Structures", title: "Quiz 2", date: "22 May" },
  ],
  recentActivities: [
    { text: "Solved 5 questions in Linear Algebra", time: "2h ago" },
    { text: "Bookmarked a question in Data Structures", time: "1d ago" },
    { text: "Generated report for Discrete Math", time: "2d ago" },
    { text: "Practiced 10 questions", time: "3d ago" },
  ],
  studyTip: "Solve past year questions regularly to understand exam patterns better.",
  studyStreakDays: 7,
  overallProgress: 64,
};


const quickActions = [
  { title: "Smart Predictions", to: "/predictions", description: "See probable questions", icon: Brain, accent: "text-blue-700 bg-blue-100" },
  { title: "Search Questions", to: "/search", description: "Find by topic or meaning", icon: Search, accent: "text-green-700 bg-green-100" },
  { title: "AI Tutor", to: "/ai-tutor", description: "Get explanation & help", icon: WandSparkles, accent: "text-violet-700 bg-violet-100" },

  { title: "Practice Now", to: "/subjects", description: "Start practicing", icon: Compass, accent: "text-rose-700 bg-rose-100" },
];

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clampProgress(value, fallback = 0) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value, fallback))));
}

function isRouteEnabled(path) {
  return AVAILABLE_ROUTES.has(path);
}

function getSafeRouteStatus(path) {
  return {
    path,
    enabled: isRouteEnabled(path),
  };
}

function getSubjectCode(subject) {
  return String(subject?.subject_code || subject?.code || "").trim();
}

function getSubjectName(subject) {
  return String(subject?.subject_name || subject?.name || getSubjectCode(subject) || "Unknown subject").trim();
}

function formatRelativeStudyTime(value, fallback = "Last studied recently") {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);
  const timestamp = parsedDate.getTime();

  if (!Number.isFinite(timestamp)) {
    const text = String(value).trim();
    return text || fallback;
  }

  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return fallback;
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    const safeMinutes = Math.max(1, diffMinutes);
    return `Last studied ${safeMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Last studied ${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Last studied ${diffDays}d ago`;
}

function deriveProgressFromPrediction(payload, fallback = 45) {
  const confidence = clampProgress(
    payload?.expected_coverage ?? payload?.overall_confidence ?? payload?.confidence,
    -1,
  );

  if (confidence >= 0) {
    return confidence;
  }

  const normalizedQuestions = normalizePredictionResponse(payload);
  if (normalizedQuestions.length > 0) {
    const topScores = normalizedQuestions
      .slice(0, 5)
      .map((item) => item?.prediction_score ?? item?.confidence)
      .map((score) => toNumber(score, 0))
      .filter((score) => score > 0);

    if (topScores.length > 0) {
      const total = topScores.reduce((sum, score) => sum + score, 0);
      return clampProgress(total / topScores.length, fallback);
    }
  }

  const topTopicCandidates = Array.isArray(payload?.top_predicted_topics)
    ? payload.top_predicted_topics
    : Array.isArray(payload?.topics)
      ? payload.topics
      : [];

  if (topTopicCandidates.length > 0) {
    const topScore = toNumber(topTopicCandidates[0]?.confidence ?? topTopicCandidates[0]?.prediction_score, fallback);
    return clampProgress(topScore, fallback);
  }

  return clampProgress(fallback, fallback);
}

function calculateOverallProgress(subjects, fallback = FALLBACK_DASHBOARD_DATA.overallProgress) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return clampProgress(fallback, fallback);
  }

  const values = subjects
    .map((item) => clampProgress(item?.progress, -1))
    .filter((item) => item >= 0);

  if (values.length === 0) {
    return clampProgress(fallback, fallback);
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return clampProgress(sum / values.length, fallback);
}

function buildDashboardRecommendation(payload, subjectName = "") {
  const fallback = FALLBACK_DASHBOARD_DATA.recommendation;
  const topTopicCandidates = Array.isArray(payload?.top_predicted_topics)
    ? payload.top_predicted_topics
    : Array.isArray(payload?.topics)
      ? payload.topics
      : Array.isArray(payload?.top_topics)
        ? payload.top_topics
        : [];

  const bestTopic = topTopicCandidates
    .map((item) => ({
      topic: String(item?.topic || item?.name || item?.predicted_topic || "").trim(),
      confidence: toNumber(item?.confidence ?? item?.prediction_score ?? item?.probability_score, 0),
    }))
    .filter((item) => item.topic)
    .sort((a, b) => b.confidence - a.confidence)[0];

  const bestQuestion = normalizePredictionResponse(payload)
    .map((item) => ({
      question: String(item?.question_text || item?.question || "").trim(),
      topic: String(item?.topic || item?.final_topic || "").trim(),
      confidence: toNumber(item?.prediction_score ?? item?.confidence, 0),
    }))
    .filter((item) => item.question)
    .sort((a, b) => b.confidence - a.confidence)[0];

  const chosenTopic = bestTopic?.topic || bestQuestion?.topic || fallback.topic;
  const chosenSubjectName = subjectName || "this subject";

  return {
    title: chosenTopic ? `Focus on ${chosenTopic}` : fallback.title,
    detail: bestQuestion?.question
      ? `High-confidence question: "${bestQuestion.question}"`
      : `Based on past papers for ${chosenSubjectName}, this topic is likely to appear in your exam.`,
    topic: chosenTopic || fallback.topic,
  };
}

function extractUpcomingExams(payload, subjectLabel = "") {
  const source = payload && typeof payload === "object" ? payload : {};

  const candidates = [
    ...(Array.isArray(source?.upcoming_exams) ? source.upcoming_exams : []),
    ...(Array.isArray(source?.upcomingExams) ? source.upcomingExams : []),
    ...(Array.isArray(source?.exams) ? source.exams : []),
    ...(Array.isArray(source?.sessions) ? source.sessions : []),
    ...(Array.isArray(source?.data?.upcoming_exams) ? source.data.upcoming_exams : []),
  ];

  return candidates
    .map((item) => {
      const title = String(item?.title || item?.exam_name || item?.name || item?.session || item?.type || "Upcoming Exam").trim();
      const date = String(item?.date || item?.exam_date || item?.session_date || item?.month || item?.exam_year || "TBD").trim();
      const subject = String(item?.subject_name || item?.subject || subjectLabel || "Subject").trim();

      if (!title || !date) {
        return null;
      }

      return { subject, title, date };
    })
    .filter(Boolean);
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

function normalizeDashboardSubjects(subjects, searchTerm = "") {
  const keyword = String(searchTerm || "").trim().toLowerCase();
  const source = Array.isArray(subjects) ? subjects : [];

  const filtered = keyword
    ? source.filter((item) =>
      [item?.name, item?.subject_code, item?.lastStudied]
        .map((entry) => String(entry || "").toLowerCase())
        .some((entry) => entry.includes(keyword)))
    : source;

  return filtered.slice(0, 3);
}


function QuickActionCard({ action, selectedSubjectCode }) {
  const Icon = action.icon;
  const routeStatus = getSafeRouteStatus(action.to);

  const content = (
    <Card className="relative h-full rounded-2xl border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:p-4">
      {!routeStatus.enabled && <Badge tone="slate" className="absolute right-3 top-3">Coming soon</Badge>}
      <div className={`inline-flex rounded-xl p-2 ${action.accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{action.title}</h3>
      <p className="mt-1 text-xs text-slate-600">{action.description}</p>
    </Card>
  );

  if (!routeStatus.enabled) {
    return <div className="cursor-not-allowed opacity-75">{content}</div>;
  }

  return (
    <Link
      to={action.to}
      state={selectedSubjectCode ? { subject_code: selectedSubjectCode } : undefined}
      className="group block h-full"
    >
      <div className="transition group-hover:-translate-y-0.5">{content}</div>
    </Link>
  );
}

function SubjectCard({ subject }) {
  const continueRoute = getSafeRouteStatus("/subjects");

  return (
    <Card className="h-full rounded-2xl border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:p-4">
      <h3 className="text-sm font-semibold text-slate-900">{subject.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{subject.lastStudied}</p>
      <p className="mt-3 text-xs font-semibold text-slate-700">Progress {subject.progress}%</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" style={{ width: `${subject.progress}%` }} />
      </div>

      {continueRoute.enabled ? (
        <Link
          to="/subjects"
          state={{ subject_code: subject.subject_code, subject_name: subject.name }}
          className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-4 inline-flex cursor-not-allowed items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500"
        >
          Continue
          <Badge tone="slate">Coming soon</Badge>
        </button>
      )}
    </Card>
  );
}

function RightSummaryColumn({ overallProgress, upcomingExams, recentActivities, upcomingFallbackNotice }) {
  const examsRoute = getSafeRouteStatus("/board-papers");

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
        <h3 className="text-sm font-semibold text-slate-900">Overall Progress</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-24 w-24 rounded-full p-1.5" style={{ background: `conic-gradient(#6366f1 ${overallProgress}%,#e2e8f0 ${overallProgress}%)` }}>
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-xl font-semibold text-slate-900">{overallProgress}%</div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">You&apos;re doing great!</p>
            <p className="mt-1 text-xs text-slate-500">Keep it up and achieve more.</p>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Upcoming Exams</h3>
          {examsRoute.enabled ? (
            <Link to={examsRoute.path} className="text-xs font-medium text-indigo-600">View all</Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">View all <Badge tone="slate">Coming soon</Badge></span>
          )}
        </div>

        {upcomingFallbackNotice ? (
          <p className="mt-3 text-xs text-slate-500">Live exam metadata is unavailable. Showing fallback schedule.</p>
        ) : null}

        <div className="mt-3 space-y-3">
          {upcomingExams.map((exam) => (
            <div key={`${exam.subject}-${exam.title}-${exam.date}`} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{exam.subject}</p>
                <p className="text-xs text-slate-500">{exam.title}</p>
              </div>
              <span className="text-xs font-semibold text-indigo-700">{exam.date}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
        <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
        {recentActivities.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">Activity will appear here when available.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recentActivities.map((activity) => (
              <li key={`${activity.text}-${activity.time}`} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                <div className="mt-0.5 rounded-full bg-indigo-100 p-1 text-indigo-700">
                  <Sparkles className="h-3 w-3" />
                </div>
                <div>
                  <p className="text-xs text-slate-700">{activity.text}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{activity.time}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="mt-3 cursor-not-default text-xs font-semibold text-indigo-600 opacity-80">View all activity</button>
      </Card>
    </div>
  );
}

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const academicProfileSignature = getAcademicProfileSignature(user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [subjectCards, setSubjectCards] = useState(FALLBACK_DASHBOARD_DATA.subjects);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsFallbackNotice, setSubjectsFallbackNotice] = useState("");
  const [predictionCache, setPredictionCache] = useState({});

  const [recommendation, setRecommendation] = useState(FALLBACK_DASHBOARD_DATA.recommendation);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationFallbackNotice, setRecommendationFallbackNotice] = useState("");

  const [upcomingExams, setUpcomingExams] = useState(FALLBACK_DASHBOARD_DATA.upcomingExams);
  const [upcomingFallbackNotice, setUpcomingFallbackNotice] = useState(false);

  const searchRouteStatus = getSafeRouteStatus("/search");
  const practiceRouteStatus = getSafeRouteStatus("/subjects");
  const predictRouteStatus = getSafeRouteStatus("/predictions");

  const greetingName = useMemo(() => {
    if (user?.full_name) {
      return user.full_name.split(" ")[0];
    }

    return "Alex";
  }, [user]);

  const displayedSubjectCards = useMemo(
    () => normalizeDashboardSubjects(subjectCards, searchValue),
    [searchValue, subjectCards],
  );

  const filteredQuickActions = useMemo(() => {
    const keyword = String(searchValue || "").trim().toLowerCase();

    if (!keyword) {
      return quickActions;
    }

    const filtered = quickActions.filter((action) =>
      [action.title, action.description]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(keyword)),
    );

    return filtered.length > 0 ? filtered : quickActions;
  }, [searchValue]);

  const selectedSubjectForActions = displayedSubjectCards[0]?.subject_code || subjectCards[0]?.subject_code || "";
  const overallProgress = useMemo(
    () => calculateOverallProgress(subjectCards, FALLBACK_DASHBOARD_DATA.overallProgress),
    [subjectCards],
  );

  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      setSubjectsLoading(true);
      setSubjectsFallbackNotice("");

      try {
        const params = buildSubjectScopeParams(user, { status: "published" });
        const response = await apiEndpoints.getSubjects(params);
        const normalized = normalizeSubjectList(response?.data);

        if (!active) {
          return;
        }

        const selectedSubjects = (normalized.length > 0 ? normalized : FALLBACK_DASHBOARD_DATA.subjects).slice(0, 3);
        const predictionResponses = await Promise.allSettled(
          selectedSubjects.map((subject) => {
            const subjectCode = getSubjectCode(subject);
            return subjectCode ? apiEndpoints.getPredictions(subjectCode) : Promise.resolve({ data: null });
          }),
        );

        if (!active) {
          return;
        }

        const nextPredictionCache = {};
        const cards = selectedSubjects.map((subject, index) => {
          const fallbackSubject = FALLBACK_DASHBOARD_DATA.subjects[index] || FALLBACK_DASHBOARD_DATA.subjects[0];
          const subjectCode = getSubjectCode(subject) || fallbackSubject.subject_code;
          const predictionResult = predictionResponses[index];
          const predictionData = predictionResult?.status === "fulfilled" ? predictionResult.value?.data : null;

          if (predictionData && subjectCode) {
            nextPredictionCache[subjectCode] = predictionData;
          }

          const progressFromSubject = subject?.progress ?? subject?.completion_percentage ?? subject?.completionPercent;
          const progress = progressFromSubject !== undefined && progressFromSubject !== null
            ? clampProgress(progressFromSubject, fallbackSubject.progress)
            : deriveProgressFromPrediction(predictionData, fallbackSubject.progress);

          return {
            id: subject?.id || subjectCode || `${index}`,
            subject_code: subjectCode,
            name: formatSubjectLabel(subject, getSubjectName(subject)),
            progress,
            lastStudied: formatRelativeStudyTime(
              subject?.last_studied_at || subject?.last_activity_at || subject?.updated_at || subject?.last_studied,
              fallbackSubject.lastStudied,
            ),
          };
        });

        setPredictionCache(nextPredictionCache);

        if (normalized.length === 0) {
          setSubjectCards(FALLBACK_DASHBOARD_DATA.subjects);
          setSubjectsFallbackNotice("Your subjects will appear here when available.");
        } else {
          setSubjectCards(cards);
        }
      } catch {
        if (!active) {
          return;
        }

        setSubjectCards(FALLBACK_DASHBOARD_DATA.subjects);
        setSubjectsFallbackNotice("Unable to load live subjects. Showing fallback subjects.");
      } finally {
        if (active) {
          setSubjectsLoading(false);
        }
      }
    }

    loadSubjects();

    return () => {
      active = false;
    };
  }, [academicProfileSignature, user]);

  useEffect(() => {
    let active = true;

    async function loadRecommendation() {
      const primarySubject = subjectCards[0];

      if (!primarySubject?.subject_code) {
        if (active) {
          setRecommendation(FALLBACK_DASHBOARD_DATA.recommendation);
          setRecommendationFallbackNotice("");
          setRecommendationLoading(false);
        }
        return;
      }

      setRecommendationLoading(true);
      setRecommendationFallbackNotice("");

      try {
        const cached = predictionCache[primarySubject.subject_code];
        const payload = cached
          ? cached
          : (await apiEndpoints.getPredictions(primarySubject.subject_code)).data;

        if (!active) {
          return;
        }

        setRecommendation(buildDashboardRecommendation(payload, primarySubject.name));
      } catch {
        if (!active) {
          return;
        }

        setRecommendation(FALLBACK_DASHBOARD_DATA.recommendation);
        setRecommendationFallbackNotice("Using fallback recommendation because live prediction data is unavailable.");
      } finally {
        if (active) {
          setRecommendationLoading(false);
        }
      }
    }

    loadRecommendation();

    return () => {
      active = false;
    };
  }, [predictionCache, subjectCards]);

  useEffect(() => {
    let active = true;

    async function loadUpcomingExams() {
      try {
        const targetSubjects = subjectCards.slice(0, 2).filter((subject) => subject?.subject_code);

        if (targetSubjects.length === 0) {
          setUpcomingExams(FALLBACK_DASHBOARD_DATA.upcomingExams);
          setUpcomingFallbackNotice(true);
          return;
        }

        const responses = await Promise.allSettled(
          targetSubjects.map((subject) => apiEndpoints.getSubjectOverview(subject.subject_code)),
        );

        if (!active) {
          return;
        }

        const merged = responses.flatMap((response, index) => {
          if (response.status !== "fulfilled") {
            return [];
          }

          return extractUpcomingExams(response.value?.data, targetSubjects[index]?.name || "");
        });

        if (merged.length > 0) {
          setUpcomingExams(merged.slice(0, 2));
          setUpcomingFallbackNotice(false);
        } else {
          setUpcomingExams(FALLBACK_DASHBOARD_DATA.upcomingExams);
          setUpcomingFallbackNotice(true);
        }
      } catch {
        if (!active) {
          return;
        }

        setUpcomingExams(FALLBACK_DASHBOARD_DATA.upcomingExams);
        setUpcomingFallbackNotice(true);
      }
    }

    loadUpcomingExams();

    return () => {
      active = false;
    };
  }, [subjectCards]);

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    const keyword = String(searchValue || "").trim();
    if (!keyword || !searchRouteStatus.enabled) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const handleRecommendationClick = () => {
    if (!predictRouteStatus.enabled) {
      return;
    }

    navigate("/predictions", {
      state: selectedSubjectForActions ? { subject_code: selectedSubjectForActions, recommendation_topic: recommendation.topic } : undefined,
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

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

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

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
        <header className="sticky top-0 z-30 h-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
                aria-label="Toggle dashboard menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[320px] lg:w-[420px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search questions, topics, subjects..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                />
              </div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700"
                aria-label="Open profile"
              >
                {getInitials(user?.full_name || "Alex Chen")}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="space-y-6">
              <section>
                <p className="text-3xl font-bold text-slate-900">Good morning, {greetingName}! 👋</p>
                <p className="mt-2 text-sm text-slate-500">Ready to learn something new today?</p>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {filteredQuickActions.map((action) => (
                    <QuickActionCard key={action.title} action={action} selectedSubjectCode={selectedSubjectForActions} />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">My Subjects</h2>
                  {practiceRouteStatus.enabled ? (
                    <Link to={practiceRouteStatus.path} className="text-sm font-medium text-indigo-600">View all</Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-500">View all <Badge tone="slate">Coming soon</Badge></span>
                  )}
                </div>

                {subjectsLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((item) => (
                      <Card key={item} className="rounded-2xl border-slate-200 bg-white p-4 opacity-80 shadow-sm sm:p-4 lg:p-4">
                        <div className="h-3 w-2/3 rounded bg-slate-200" />
                        <div className="mt-2 h-2 rounded bg-slate-100" />
                        <p className="mt-3 text-xs text-slate-400">Loading subjects...</p>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {displayedSubjectCards.length > 0 ? (
                      displayedSubjectCards.map((subject) => <SubjectCard key={subject.id} subject={subject} />)
                    ) : (
                      <Card className="flex min-h-[190px] items-center rounded-2xl border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm sm:col-span-2 lg:col-span-3">
                        Your subjects will appear here when available.
                      </Card>
                    )}

                    <Card className="relative flex h-full min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-center shadow-sm sm:p-4 lg:p-4 opacity-80">
                      <Badge tone="slate" className="absolute right-3 top-3">Coming soon</Badge>
                      <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                        <Plus className="h-4 w-4" />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-600">Add Subject</p>
                    </Card>
                  </div>
                )}

                {subjectsFallbackNotice && !subjectsLoading ? (
                  <p className="mt-3 text-xs text-slate-500">{subjectsFallbackNotice}</p>
                ) : null}
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-sm font-semibold">Today&apos;s Recommendation</p>
                  </div>

                  {recommendationLoading ? (
                    <p className="mt-3 text-sm text-slate-500">Loading recommendation...</p>
                  ) : (
                    <>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{recommendation.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{recommendation.detail}</p>
                    </>
                  )}

                  {recommendationFallbackNotice ? (
                    <p className="mt-2 text-xs text-slate-500">{recommendationFallbackNotice}</p>
                  ) : null}

                  {predictRouteStatus.enabled ? (
                    <button
                      type="button"
                      onClick={handleRecommendationClick}
                      className="mt-4 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white"
                    >
                      View Questions
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-4 inline-flex cursor-not-allowed items-center gap-1 rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500"
                    >
                      View Questions
                      <Badge tone="slate">Coming soon</Badge>
                    </button>
                  )}
                </Card>

                <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm sm:p-5 lg:p-5">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-sm font-semibold">Study Tip</p>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{FALLBACK_DASHBOARD_DATA.studyTip}</p>
                </Card>
              </section>
            </main>

            <aside>
              <RightSummaryColumn
                overallProgress={overallProgress}
                upcomingExams={upcomingExams}
                recentActivities={FALLBACK_DASHBOARD_DATA.recentActivities}
                upcomingFallbackNotice={upcomingFallbackNotice}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
