import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bell, BookMarked, ChevronRight, Menu, MoreHorizontal, Search, X } from "lucide-react";

import PublicSidebar from "../components/PublicSidebar";
import MathRenderer from "../components/MathRenderer";
import { Badge, Card, DiagramRenderer } from "../components/ui";
import TutorClassroomModal from "../components/ui/TutorClassroomModal";
import { apiEndpoints } from "../api/api";
import { useAuth } from "../context/useAuth";
import { buildSubjectScopeParams, getAcademicProfileSignature } from "../utils/academicProfile";
import { normalizeSubjectList } from "../utils/subjectLookups";
import { normalizeQuestionForRenderer } from "../utils/questionRenderUtils";

const AVAILABLE_ROUTES = new Set(["/dashboard", "/subjects", "/predictions", "/search", "/ai-tutor", "/analysis", "/profile"]);
const QUESTION_TABS = ["all", "past-year", "repeated", "predicted"];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "most-repeated", label: "Most Repeated" },
  { id: "highest-priority", label: "Highest Priority" },
];

const FALLBACK_SUBJECT_NAMES = {
  "510225": "Linear Algebra",
};

const FALLBACK_QUESTIONS = [
  {
    id: "sample-1",
    question_no: "1",
    question_text: "Find the eigenvalues of the matrix \\(A = \\begin{bmatrix}2 & 1\\\\1 & 2\\end{bmatrix}\\).",
    exam_year: "2024",
    marks: 5,
    topic: "Eigenvalues and Eigenvectors",
    question_type: "CQ",
    difficulty: "High",
    repeated_count: 3,
    is_predicted: true,
  },
  {
    id: "sample-2",
    question_no: "2",
    question_text: "If \\(\\vec{u}=(1,2,3)\\) and \\(\\vec{v}=(2,-1,4)\\), compute \\(\\vec{u}\\cdot\\vec{v}\\).",
    exam_year: "2022",
    marks: 5,
    topic: "Vectors",
    question_type: "CQ",
    difficulty: "Medium",
    repeated_count: 1,
    is_predicted: false,
  },
];

function normalizeQuestions(payload) {
  const items = payload?.questions || payload?.items || payload?.data || payload || [];
  const arr = Array.isArray(items) ? items : [];
  // Normalize each question for consistent renderer fields (diagram_svg, diagram_type, etc.)
  return arr.map((item, idx) => normalizeQuestionForRenderer(item, { index: idx }));
}

function getQuestionText(question) {
  return String(question?.question_text || question?.text || question?.question || "Question unavailable");
}

function getQuestionYear(question) {
  return String(question?.exam_year || question?.year || "").trim();
}

function getQuestionMarks(question) {
  const value = Number(question?.marks ?? question?.question_marks ?? question?.total_marks ?? 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getRepeatedCount(question) {
  const value = Number(question?.repeated_count ?? question?.repeat_count ?? question?.times_repeated ?? question?.frequency ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getQuestionDifficulty(question) {
  const raw = String(question?.difficulty || question?.priority || "").trim().toLowerCase();
  if (raw.includes("high")) return "High";
  if (raw.includes("medium")) return "Medium";
  if (raw.includes("low")) return "Low";
  return "Medium";
}

function getTopic(question) {
  return String(question?.topic || question?.chapter || question?.final_topic || question?.suggested_topic || "General").trim();
}

function getQuestionType(question) {
  return String(question?.question_type || question?.type || "Unknown").trim();
}

function isPredictedQuestion(question) {
  return Boolean(question?.is_predicted || question?.predicted || String(question?.source || "").toLowerCase().includes("predict"));
}

function isBookmarkedQuestion(question) {
  return Boolean(question?.is_bookmarked || question?.bookmarked);
}

function isPracticedQuestion(question) {
  return Boolean(question?.is_practiced || question?.practiced || question?.answered);
}

function isRouteEnabled(pathname) {
  return AVAILABLE_ROUTES.has(pathname);
}


function SubjectQuestionsPage() {
  const navigate = useNavigate();
  const { subjectCode = "" } = useParams();
  const { user } = useAuth();
  const academicProfileSignature = getAcademicProfileSignature(user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Tutor modal state (question-level AI Tutor)
  const [selectedTutorQuestion, setSelectedTutorQuestion] = useState(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState(null);
  const [tutorResponse, setTutorResponse] = useState(null);

  const openTutorModal = (question) => {
    const normalized = question || null;
    setSelectedTutorQuestion(normalized);
    if (normalized && (normalized.id || normalized.question_id)) {
      fetchTutorExplanation(normalized.id || normalized.question_id);
    }
  };

  const closeTutorModal = () => {
    setSelectedTutorQuestion(null);
    setTutorResponse(null);
    setTutorError(null);
    setTutorLoading(false);
  };

  async function fetchTutorExplanation(questionId) {
    if (!questionId) return;
    setTutorLoading(true);
    setTutorError(null);
    setTutorResponse(null);
    try {
      const resp = await apiEndpoints.explainTutorQuestion(questionId);
      const data = resp?.data ?? resp;
      setTutorResponse(data);
    } catch (err) {
      console.warn("Tutor explain API failed:", err?.message || err);
      console.error("Tutor explain request failed", { status: err?.response?.status, data: err?.response?.data });
      setTutorError("Q Arena AI Teacher is unavailable. Please try again.");
      setTutorResponse(null);
    } finally {
      setTutorLoading(false);
    }
  }
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState(FALLBACK_SUBJECT_NAMES[subjectCode] || `Subject ${subjectCode}`);
  const [questions, setQuestions] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [viewMode, setViewMode] = useState("list");
  const [statusMessage, setStatusMessage] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(null);
  const [totalPages, setTotalPages] = useState(null);
  const [isServerPaginated, setIsServerPaginated] = useState(false);

  const [draftFilters, setDraftFilters] = useState({
    topic: "",
    year: "",
    marks: "",
    questionType: "",
    difficulty: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    topic: "",
    year: "",
    marks: "",
    questionType: "",
    difficulty: "",
  });

  useEffect(() => {
    let active = true;

    async function loadSubjectQuestions(requestPage = page, requestLimit = limit) {
      setLoading(true);
      setStatusMessage("");
      setUsingFallback(false);

      try {
        // Build safe API params including user-visible filters where available.
        const apiParams = {
          page: requestPage,
          limit: requestLimit,
          query: appliedSearch || undefined,
          topic: appliedFilters.topic || undefined,
          exam_year: appliedFilters.year || undefined,
          marks: appliedFilters.marks || undefined,
          question_type: appliedFilters.questionType || undefined,
          difficulty: appliedFilters.difficulty || undefined,
          tab: activeTab && activeTab !== "all" ? activeTab : undefined,
          sort: sortOption || undefined,
        };

        const questionsResponse = await apiEndpoints.getSubjectQuestions(subjectCode, apiParams);
        if (!active) return;

        const payload = questionsResponse?.data ?? questionsResponse;
        const normalizedQuestions = normalizeQuestions(payload);

        // Try to detect pagination metadata from common fields
        const meta = payload?.meta || payload?.pagination || payload || {};
        const totalCandidates = [
          meta?.total,
          meta?.total_count,
          meta?.count,
          payload?.total,
          payload?.total_count,
          payload?.count,
        ].filter((v) => Number.isFinite(Number(v)));

        const pagesCandidates = [meta?.total_pages, meta?.pages, payload?.total_pages, payload?.pages].filter((v) => Number.isFinite(Number(v)));
        const limitCandidate = Number(meta?.limit ?? payload?.limit ?? requestLimit);

        if (totalCandidates.length > 0 || pagesCandidates.length > 0) {
          // server-side pagination assumed
          setIsServerPaginated(true);
          const total = totalCandidates.length > 0 ? Number(totalCandidates[0]) : null;
          const pages = pagesCandidates.length > 0 ? Number(pagesCandidates[0]) : total && limitCandidate ? Math.ceil(total / limitCandidate) : null;
          setTotalCount(total);
          setTotalPages(pages);
          setQuestions(normalizedQuestions);
        } else {
          // API didn't provide metadata - assume response might be full list
          setIsServerPaginated(false);
          // If API returned a page-sized chunk but we can't tell, still store items as full list
          setQuestions(normalizedQuestions);
          // Clear metadata
          setTotalCount(null);
          setTotalPages(null);
        }

        // If normalizedQuestions is empty, show empty state (do NOT use fallback)
        if (Array.isArray(normalizedQuestions) && normalizedQuestions.length === 0) {
          setStatusMessage("No questions found for this subject yet.");
        }

        // Try to load overview and subjects if available, but treat them as best-effort (do not trigger fallback)
        try {
          const overviewResponse = await apiEndpoints.getSubjectOverview(subjectCode);
          if (active && overviewResponse?.data?.subject_name) {
            setSubjectName(overviewResponse.data.subject_name);
          }
        } catch {
          // ignore overview errors; we'll try to resolve from subjects list next
        }

        try {
          const subjectsResponse = await apiEndpoints.getSubjects(buildSubjectScopeParams(user, { status: "published" }));
          if (!active) return;
          const subjectList = normalizeSubjectList(subjectsResponse?.data);
          const matchedSubject = subjectList.find((item) => String(item.subject_code) === String(subjectCode));
          if (matchedSubject?.subject_name) {
            setSubjectName(matchedSubject.subject_name);
          }
        } catch {
          // ignore subjects list errors
        }
      } catch (error) {
        if (!active) return;
        console.error("Failed to load subject questions", error);

        const fallbackName = FALLBACK_SUBJECT_NAMES[subjectCode] || `Subject ${subjectCode}`;
        setSubjectName(fallbackName);
        setQuestions(FALLBACK_QUESTIONS);
        setUsingFallback(true);
        setStatusMessage("Showing sample questions because subject question API is not connected yet.");
        setIsServerPaginated(false);
        setTotalCount(null);
        setTotalPages(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (subjectCode) {
      loadSubjectQuestions(page, limit);
    }

    return () => {
      active = false;
    };
    // include fetchTrigger so we can re-run when filters/search/tab applied
  }, [academicProfileSignature, subjectCode, user, page, limit, appliedFilters, appliedSearch, activeTab, sortOption]);

  const topicOptions = useMemo(() => [...new Set(questions.map(getTopic))], [questions]);
  const yearOptions = useMemo(() => [...new Set(questions.map(getQuestionYear).filter(Boolean))], [questions]);
  const marksOptions = useMemo(() => [...new Set(questions.map(getQuestionMarks).filter(Boolean))], [questions]);
  const questionTypeOptions = useMemo(() => [...new Set(questions.map(getQuestionType).filter(Boolean))], [questions]);

  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const practiced = questions.filter(isPracticedQuestion).length;
    const bookmarked = questions.filter(isBookmarkedQuestion).length;
    const repeated = questions.filter((question) => getRepeatedCount(question) > 0).length;

    return { totalQuestions, practiced, bookmarked, repeated };
  }, [questions]);

  // If API is server-paginated we treat `questions` as the current page items.
  // If client-side, we apply filtering/sorting to full questions list and then paginate.
  const filteredAndSorted = useMemo(() => {
    if (isServerPaginated) return questions;

    const keyword = appliedSearch.trim().toLowerCase();

    const filtered = questions.filter((question) => {
      const text = getQuestionText(question).toLowerCase();
      const topic = getTopic(question).toLowerCase();
      const questionYear = getQuestionYear(question);
      const marks = getQuestionMarks(question);
      const type = getQuestionType(question).toLowerCase();
      const difficulty = getQuestionDifficulty(question).toLowerCase();
      const repeatedCount = getRepeatedCount(question);

      const matchesSearch = keyword ? text.includes(keyword) || topic.includes(keyword) : true;
      const matchesTopic = appliedFilters.topic ? topic.includes(appliedFilters.topic.toLowerCase()) : true;
      const matchesYear = appliedFilters.year ? questionYear === appliedFilters.year : true;
      const matchesMarks = appliedFilters.marks ? Number(appliedFilters.marks) === Number(marks || 0) : true;
      const matchesType = appliedFilters.questionType ? type === appliedFilters.questionType.toLowerCase() : true;
      const matchesDifficulty = appliedFilters.difficulty ? difficulty === appliedFilters.difficulty.toLowerCase() : true;

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "past-year" && Boolean(questionYear)) ||
        (activeTab === "repeated" && repeatedCount > 0) ||
        (activeTab === "predicted" && isPredictedQuestion(question));

      return matchesSearch && matchesTopic && matchesYear && matchesMarks && matchesType && matchesDifficulty && matchesTab;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === "oldest") {
        return Number(getQuestionYear(a) || 0) - Number(getQuestionYear(b) || 0);
      }

      if (sortOption === "most-repeated") {
        return getRepeatedCount(b) - getRepeatedCount(a);
      }

      if (sortOption === "highest-priority") {
        const rank = { high: 3, medium: 2, low: 1 };
        const aRank = rank[getQuestionDifficulty(a).toLowerCase()] || 0;
        const bRank = rank[getQuestionDifficulty(b).toLowerCase()] || 0;
        return bRank - aRank;
      }

      return Number(getQuestionYear(b) || 0) - Number(getQuestionYear(a) || 0);
    });

    return sorted;
  }, [isServerPaginated, questions, appliedFilters, appliedSearch, sortOption, activeTab]);

  // Determine displayedQuestions and pagination meta for client-side case
  const displayedQuestions = useMemo(() => {
    if (isServerPaginated) return questions;

    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredAndSorted.slice(start, end);
  }, [isServerPaginated, questions, filteredAndSorted, page, limit]);

  const computedTotalCount = useMemo(() => {
    if (isServerPaginated) return totalCount ?? null;
    return filteredAndSorted.length;
  }, [isServerPaginated, totalCount, filteredAndSorted]);

  const computedTotalPages = useMemo(() => {
    if (isServerPaginated) return totalPages ?? null;
    return limit > 0 ? Math.ceil((filteredAndSorted.length || 0) / limit) : null;
  }, [isServerPaginated, totalPages, filteredAndSorted, limit]);

  // Pagination controls helpers
  const goToPage = (p) => {
    const safe = Math.max(1, Math.floor(p));
    setPage(safe);
  };

  const goPrev = () => {
    if (page > 1) setPage((v) => v - 1);
  };
  const goNext = () => {
    // If we know total pages, don't go past it
    if (computedTotalPages != null) {
      if (page < computedTotalPages) setPage((v) => v + 1);
    } else {
      // if unknown total, allow next if current page has full limit items
      if (questions.length >= limit) setPage((v) => v + 1);
    }
  };

  const renderPageButtons = () => {
    const total = computedTotalPages;
    const current = page;
    const buttons = [];
    if (total == null) {
      // Unknown total: show a small window around current page
      const start = Math.max(1, current - 2);
      const end = start + 4;
      for (let i = start; i <= end; i++) {
        buttons.push(i);
      }
      return buttons.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => goToPage(p)}
          className={`mx-1 inline-flex h-8 min-w-[34px] items-center justify-center rounded-lg border px-3 text-sm font-semibold ${p === current ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border-slate-200"}`}
        >
          {p}
        </button>
      ));
    }

    // Known total pages - use compact windowing
    const maxButtons = 7; // include possible ellipses
    if (total <= maxButtons) {
      for (let i = 1; i <= total; i++) buttons.push(i);
    } else {
      // show first, maybe left ellipsis, window, right ellipsis, last
      buttons.push(1);
      let start = Math.max(2, current - 1);
      let end = Math.min(total - 1, current + 1);

      if (current <= 3) {
        start = 2;
        end = 4;
      }
      if (current >= total - 2) {
        start = total - 3;
        end = total - 1;
      }

      if (start > 2) buttons.push("left-ellipsis");
      for (let i = start; i <= end; i++) buttons.push(i);
      if (end < total - 1) buttons.push("right-ellipsis");
      buttons.push(total);
    }

    return buttons.map((p, idx) => {
      if (p === "left-ellipsis" || p === "right-ellipsis") {
        return (
          <span key={`${p}-${idx}`} className="mx-2 inline-flex h-8 items-center px-1 text-sm text-slate-400">…</span>
        );
      }

      return (
        <button
          key={p}
          type="button"
          onClick={() => goToPage(p)}
          className={`mx-1 inline-flex h-8 min-w-[34px] items-center justify-center rounded-lg border px-3 text-sm font-semibold ${p === page ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border-slate-200"}`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <PublicSidebar user={user} onNavigate={() => {}} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <PublicSidebar user={user} onNavigate={() => setSidebarOpen(false)} />
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
                <Link to="/subjects" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  <ArrowLeft className="h-4 w-4" />
                  Back to My Subjects
                </Link>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">{subjectName} Questions</h1>
                <p className="mt-1 text-sm text-slate-500">Practice past questions, repeated questions and predicted questions from this subject.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:block sm:w-[300px] lg:w-[380px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { setAppliedSearch(searchInput); setPage(1); } }}
                type="search"
                placeholder={`Search questions in ${subjectName}...`}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-20 text-sm outline-none focus:border-indigo-300 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => { setAppliedSearch(searchInput); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
              >
                Search
              </button>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/subjects/${encodeURIComponent(subjectCode)}/analysis`, { state: { subject_code: subjectCode, subject_name: subjectName } })}
                disabled={!subjectCode}
                className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                View Analysis
                <ChevronRight className="h-4 w-4" />
              </button>

              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">AC</div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {usingFallback && statusMessage ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{statusMessage}</p>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Questions</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.totalQuestions}</p>
                </Card>
                <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Practiced</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.practiced}</p>
                </Card>
                <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bookmarked</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.bookmarked}</p>
                </Card>
                <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Repeated in Exams</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.repeated}</p>
                </Card>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {QUESTION_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => { setActiveTab(tab); setPage(1); }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        activeTab === tab ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tab === "all" ? "All Questions" : tab === "past-year" ? "Past Year Questions" : tab === "repeated" ? "Repeated Questions" : "Predicted Questions"}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-600">{(computedTotalCount ?? displayedQuestions.length).toLocaleString()} questions found</p>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <span>Sort</span>
                      <select
                        value={sortOption}
                        onChange={(event) => { setSortOption(event.target.value); setPage(1); }}
                        className="bg-transparent font-semibold text-slate-900 outline-none"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => setViewMode((mode) => (mode === "list" ? "card" : "list"))}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      {viewMode === "list" ? "List" : "Card"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                {loading ? (
                  <Card className="rounded-2xl border-slate-200 bg-white p-6 text-sm text-slate-500">Loading questions...</Card>
                ) : questions.length === 0 ? (
                  <Card className="rounded-2xl border-slate-200 bg-white p-6 text-sm text-slate-500">No questions found for this subject yet.</Card>
                ) : displayedQuestions.length === 0 ? (
                  <Card className="rounded-2xl border-slate-200 bg-white p-6 text-sm text-slate-500">No questions match your current filters.</Card>
                ) : (
                  displayedQuestions.map((question, index) => {
                    const year = getQuestionYear(question);
                    const marks = getQuestionMarks(question);
                    const repeatedCount = getRepeatedCount(question);
                    const difficulty = getQuestionDifficulty(question);

                    return (
                      <Card key={question?.id || `${subjectCode}-${index}`} className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">#{question?.question_no || index + 1}</p>
                            <div className="mt-2 text-sm leading-7 text-slate-700">
                              <MathRenderer value={getQuestionText(question)} className="prose max-w-none" />
                            </div>
                            <DiagramRenderer question={question} />
                          </div>

                          <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="More options">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {year ? <Badge tone="slate">{year}</Badge> : null}
                          {marks ? <Badge tone="indigo">{marks} Marks</Badge> : null}
                          {repeatedCount > 0 ? <Badge tone="amber">Repeated {repeatedCount} times</Badge> : null}
                          <Badge tone={difficulty === "High" ? "rose" : difficulty === "Medium" ? "amber" : "emerald"}>{difficulty}</Badge>
                          <button type="button" className="ml-auto rounded-lg border border-slate-200 p-2 text-slate-500" aria-label="Bookmark question">
                            <BookMarked className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled
                            className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500"
                          >
                            View Solution
                            <Badge tone="slate">Coming soon</Badge>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const q = question;
                              const qid = q?.id || q?.question_id || null;
                              openTutorModal({
                                id: qid,
                                question_text: getQuestionText(q),
                                marks: getQuestionMarks(q),
                                year: getQuestionYear(q),
                                topic: getTopic(q),
                                difficulty: getQuestionDifficulty(q),
                                subject_code: subjectCode,
                                subject_name: subjectName,
                                source: q?.source || "Q Arena DB",
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            Ask AI Tutor
                          </button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </section>

              {((computedTotalPages ? computedTotalPages > 1 : (filteredAndSorted.length || 0) > limit) || (isServerPaginated && questions.length > 0)) && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-slate-500">Showing {( (page - 1) * limit + 1 ).toLocaleString()}–{(((page - 1) * limit) + displayedQuestions.length).toLocaleString()} of {computedTotalCount != null ? computedTotalCount.toLocaleString() : (isServerPaginated ? 'many' : (filteredAndSorted.length || 0).toLocaleString())} questions</div>

                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={page === 1}
                      className={`mx-1 inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${page === 1 ? 'text-slate-400 bg-white cursor-not-allowed border-slate-100' : 'bg-white text-slate-700 border-slate-200'}`}
                    >
                      Previous
                    </button>

                    {renderPageButtons()}

                    <button
                      type="button"
                      onClick={goNext}
                      disabled={computedTotalPages != null ? page >= computedTotalPages : displayedQuestions.length < limit}
                      className={`mx-1 inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${computedTotalPages != null ? (page >= computedTotalPages ? 'text-slate-400 bg-white cursor-not-allowed border-slate-100' : 'bg-white text-slate-700 border-slate-200') : (displayedQuestions.length < limit ? 'text-slate-400 bg-white cursor-not-allowed border-slate-100' : 'bg-white text-slate-700 border-slate-200')}`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {statusMessage && !usingFallback ? <p className="text-xs text-slate-500">{statusMessage}</p> : null}
            </main>

            <aside className="space-y-4">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Filters</h3>
                <div className="mt-4 space-y-3">
                  <label className="block text-sm text-slate-600">
                    Chapter / Topic
                    <select
                      value={draftFilters.topic}
                      onChange={(event) => setDraftFilters((prev) => ({ ...prev, topic: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">All Topics</option>
                      {topicOptions.map((topic) => (
                        <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-slate-600">
                    Year
                    <select
                      value={draftFilters.year}
                      onChange={(event) => setDraftFilters((prev) => ({ ...prev, year: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">All Years</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-slate-600">
                    Marks
                    <select
                      value={draftFilters.marks}
                      onChange={(event) => setDraftFilters((prev) => ({ ...prev, marks: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">All Marks</option>
                      {marksOptions.map((marks) => (
                        <option key={marks} value={String(marks)}>{marks} Marks</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-slate-600">
                    Question Type
                    <select
                      value={draftFilters.questionType}
                      onChange={(event) => setDraftFilters((prev) => ({ ...prev, questionType: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">All Types</option>
                      {questionTypeOptions.map((questionType) => (
                        <option key={questionType} value={questionType}>{questionType}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-slate-600">
                    Difficulty
                    <select
                      value={draftFilters.difficulty}
                      onChange={(event) => setDraftFilters((prev) => ({ ...prev, difficulty: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-300"
                    >
                      <option value="">All</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setAppliedFilters(draftFilters); setPage(1); }}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Apply Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reset = { topic: "", year: "", marks: "", questionType: "", difficulty: "" };
                      setDraftFilters(reset);
                      setAppliedFilters(reset);
                      setPage(1);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Need help?</h3>
                <p className="mt-2 text-sm text-slate-600">Ask our AI Tutor to understand any question or topic.</p>
                <button
                  type="button"
                  onClick={() => navigate("/ai-tutor", { state: { subject_code: subjectCode } })}
                  disabled={!isRouteEnabled("/ai-tutor")}
                  className={`mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold ${
                    isRouteEnabled("/ai-tutor")
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "cursor-not-allowed bg-slate-200 text-slate-500"
                  }`}
                >
                  Ask AI Tutor
                </button>
              </Card>

              {/* Tutor modal instance (question-level) */}
              <TutorClassroomModal
                isOpen={Boolean(selectedTutorQuestion)}
                onClose={() => closeTutorModal()}
                tutorResponse={tutorResponse}
                loading={tutorLoading}
                error={tutorError}
                onRetry={() => {
                  if (selectedTutorQuestion) fetchTutorExplanation(selectedTutorQuestion.id || selectedTutorQuestion.question_id);
                }}
                selectedTutorQuestion={selectedTutorQuestion}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubjectQuestionsPage;
