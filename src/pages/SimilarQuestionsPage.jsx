import { useEffect, useMemo, useRef, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { Bell, Bookmark, ChevronDown, LayoutGrid, List, Menu, Search, Sparkles, X } from "lucide-react";


import PublicSidebar from "../components/PublicSidebar";
import { useAuth } from "../context/useAuth";
import { apiEndpoints } from "../api/api";
import { Badge, Card, LoadingSpinner } from "../components/ui";
import TutorClassroomModal from "../components/ui/TutorClassroomModal";
import MathRenderer from "../components/MathRenderer";
import { buildSubjectScopeParams, getAcademicProfileSignature } from "../utils/academicProfile";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";

const AVAILABLE_ROUTES = new Set([
  "/dashboard",
  "/subjects",
  "/predictions",
  "/search",
  "/analysis",
  "/profile",
  "/support",
  "/ai-tutor",
]);






const POPULAR_SEARCHES = [
  "Eigenvalues",
  "Matrix Inverse",
  "Determinants",
  "Rank of Matrix",
  "Cayley-Hamilton Theorem",
  "Linear Transformation",
  "More",
];

const SORT_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "match", label: "Match" },
  { id: "recent", label: "Recent" },
  { id: "marks", label: "Marks" },
];

const TOP_K = 12;
const PER_PAGE = 6;
const DEFAULT_YEAR_FROM = 2018;
const DEFAULT_YEAR_TO = new Date().getFullYear();
const FALLBACK_WARNING = "Showing sample results because semantic search is temporarily unavailable.";

const FALLBACK_RESULTS = [
  {
    id: "fb-1",
    subject_name: "Linear Algebra",
    subject_code: "LINEAR-ALGEBRA",
    topic: "Eigenvalues & Eigenvectors",
    question_text: "Find the eigenvalues and eigenvectors of matrix A = [[4, 1], [2, 3]].",
    description: "Frequently asked from linear transformations and matrix diagonalization.",
    exam_year: 2023,
    question_type: "Long Question",
    exam_type: "Written",
    marks: 5,
    score: 0.93,
  },
  {
    id: "fb-2",
    subject_name: "Linear Algebra",
    subject_code: "LINEAR-ALGEBRA",
    topic: "Determinants",
    question_text: "Using determinant properties, compute det(A⁻¹B) for the given matrices.",
    description: "Combines determinant laws with inverse matrix basics.",
    exam_year: 2022,
    question_type: "Short Question",
    exam_type: "Written",
    marks: 4,
    score: 0.82,
  },
  {
    id: "fb-3",
    subject_name: "Calculus",
    subject_code: "CALCULUS",
    topic: "Integrals",
    question_text: "Evaluate ∫(x² + 2x + 1)eˣ dx using integration by parts.",
    description: "Tests repeated integration by parts and simplification.",
    exam_year: 2021,
    question_type: "Long Question",
    exam_type: "CQ",
    marks: 6,
    score: 0.68,
  },
];

function isRouteEnabled(path) {
  return AVAILABLE_ROUTES.has(path);
}

function toNumber(value, fallback = null) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getInitials(name = "Alex Chen") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getQueryParamFromSearch(search) {
  const params = new URLSearchParams(search || "");
  return String(params.get("q") || "").trim();
}

function normalizeResults(payload) {

  const items = Array.isArray(payload)
    ? payload
    : payload?.results || payload?.matches || payload?.questions || payload?.items || payload?.data || [];

  return (Array.isArray(items) ? items : []).map((item, index) => {
    const scoreRaw = item?.score ?? item?.similarity ?? item?.match_score ?? item?.confidence;
    const score = toNumber(scoreRaw, null);
    const percent = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score <= 1 ? score * 100 : score))) : null;

    let matchLevel = "Low Match";
    if (percent >= 80) {
      matchLevel = "High Match";
    } else if (percent >= 60) {
      matchLevel = "Medium Match";
    }

    return {
      id: item?.id || item?._id || `result-${index}`,
      subjectName: String(item?.subject_name || item?.subject || item?.subject_code || "General").trim(),
      subjectCode: String(item?.subject_code || "").trim(),
      topic: String(item?.topic || item?.final_topic || item?.suggested_topic || "").trim(),
      questionText: String(item?.question_text || item?.question || item?.text || "").trim(),
      description: String(item?.description || item?.context || item?.summary || "").trim(),
      year: item?.exam_year ?? item?.year ?? null,
      marks: toNumber(item?.marks ?? item?.question_marks ?? item?.total_marks, null),
      questionType: String(item?.question_type || item?.type || "").trim(),
      examType: String(item?.exam_type || item?.paper_type || item?.paper || "").trim(),
      matchPercent: percent,
      matchLevel,
    };
  });
}

function getBadgeTone(level) {
  if (level === "High Match") return "emerald";
  if (level === "Medium Match") return "amber";
  return "slate";
}

function buildFilterOptions(results, subjects) {
  const topics = new Set();
  const types = new Set();
  const exams = new Set();
  const marks = new Set();

  results.forEach((item) => {
    if (item.topic) topics.add(item.topic);
    if (item.questionType) types.add(item.questionType);
    if (item.examType) exams.add(item.examType);
    if (item.marks !== null) marks.add(item.marks);
  });

  return {
    subjects: [{ code: "", label: "All Subjects" }, ...subjects],
    topics: ["All Topics", ...Array.from(topics)],
    questionTypes: ["All Types", ...Array.from(types)],
    examTypes: ["All Exams", ...Array.from(exams)],
    marks: ["All Marks", ...Array.from(marks).sort((a, b) => a - b)],
  };
}

function applyClientFilters(results, filters) {
  return results.filter((item) => {
    if (filters.subjectCode && item.subjectCode !== filters.subjectCode) return false;
    if (filters.topic !== "All Topics" && item.topic !== filters.topic) return false;
    if (filters.questionType !== "All Types" && item.questionType !== filters.questionType) return false;
    if (filters.examType !== "All Exams" && item.examType !== filters.examType) return false;
    if (filters.marks !== "All Marks" && Number(item.marks) !== Number(filters.marks)) return false;

    const year = toNumber(item.year, null);
    if (Number.isFinite(year)) {
      if (year < filters.yearFrom || year > filters.yearTo) return false;
    }

    return true;
  });
}

function applySort(results, sortId) {
  const list = [...results];

  if (sortId === "match" || sortId === "relevance") {
    return list.sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0));
  }
  if (sortId === "recent") {
    return list.sort((a, b) => (toNumber(b.year, 0) || 0) - (toNumber(a.year, 0) || 0));
  }
  if (sortId === "marks") {
    return list.sort((a, b) => (b.marks || 0) - (a.marks || 0));
  }

  return list;
}



function ResultCard({ result, rank, onAskTutor }) {
  return (
    <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">{rank}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="indigo">{result.subjectName}</Badge>
            <Badge tone={getBadgeTone(result.matchLevel)}>{result.matchLevel}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {result.matchPercent !== null ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{result.matchPercent}%</span> : null}
          <button type="button" disabled className="rounded-lg bg-slate-100 p-2 text-slate-500" title="Coming soon">
            <Bookmark className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <MathRenderer value={result.questionText || "Question unavailable"} className="prose max-w-none text-base text-slate-900" />
        {result.description ? <p className="mt-2 text-sm text-slate-600">{result.description}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {result.topic ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{result.topic}</span> : null}
        {result.year ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{result.year}</span> : null}
        {result.marks !== null ? <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{result.marks} Marks</span> : null}
        {result.questionType ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{result.questionType}</span> : null}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAskTutor && onAskTutor({
              id: result.id,
              question_text: result.questionText || result.question_text || result.question || result.description || "",
              marks: result.marks ?? null,
              year: result.year ?? null,
              topic: result.topic || "",
              difficulty: result.difficulty || null,
              subject_code: result.subjectCode || result.subject_code || "",
              subject_name: result.subjectName || result.subject_name || "",
              source: result.source || "Q Arena DB",
            })}
            className="rounded-lg border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Ask AI Tutor
          </button>
        </div>
      </div>
    </Card>
  );
}

function SimilarQuestionsPage() {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();
  const academicProfileSignature = getAcademicProfileSignature(user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [subjects, setSubjects] = useState([]);
  const [queryInput, setQueryInput] = useState(() => getQueryParamFromSearch(location.search));

  const [activeQuery, setActiveQuery] = useState("");
  const [liveResults, setLiveResults] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [sortId, setSortId] = useState("relevance");
  const [viewMode, setViewMode] = useState("list");
  const [page, setPage] = useState(1);

  const requestIdRef = useRef(0);

  const [filters, setFilters] = useState({
    subjectCode: "",
    topic: "All Topics",
    questionType: "All Types",
    examType: "All Exams",
    marks: "All Marks",
    yearFrom: DEFAULT_YEAR_FROM,
    yearTo: DEFAULT_YEAR_TO,
  });

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

  useEffect(() => {
    let mounted = true;

    async function loadSubjects() {
      setLoadingSubjects(true);
      try {
        const params = buildSubjectScopeParams(user, { status: "published" });
        const response = await apiEndpoints.getSubjects(params);
        if (!mounted) {
          return;
        }

        const normalized = normalizeSubjectList(response.data).map((item) => ({
          code: item.subject_code,
          label: formatSubjectLabel(item),
        }));

        setSubjects(normalized);

        const stateSubjectCode = String(location.state?.subject_code || "").trim();
        if (stateSubjectCode && normalized.some((item) => item.code === stateSubjectCode)) {
          setFilters((current) => ({ ...current, subjectCode: stateSubjectCode }));
        }


        const initialQuery = getQueryParamFromSearch(location.search);
        if (initialQuery) {
          setQueryInput(initialQuery);
        }

      } catch {
        if (mounted) {
          setSubjects([]);

          const initialQuery = getQueryParamFromSearch(location.search);
          if (initialQuery) {
            setQueryInput(initialQuery);
          }

        }
      } finally {
        if (mounted) {
          setLoadingSubjects(false);
        }
      }
    }

    loadSubjects();

    return () => {
      mounted = false;
    };
  }, [academicProfileSignature, location.search, location.state?.subject_code, user]);





  async function executeSemanticSearch(query, selectedSubjectCode) {

    const cleanQuery = String(query || "").trim();

    if (!cleanQuery) {
      setLiveResults([]);
      setActiveQuery("");
      setUsingFallback(false);
      setWarningMessage("");
      return;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setLoadingSearch(true);
    setUsingFallback(false);
    setWarningMessage("");

    try {
      const payload = {
        query: cleanQuery,
        top_k: TOP_K,
      };

      if (selectedSubjectCode) {
        payload.subject_code = selectedSubjectCode;
      }

      const response = await apiEndpoints.searchQuestions(payload);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setLiveResults(normalizeResults(response?.data));
      setActiveQuery(cleanQuery);
      setPage(1);
    } catch {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setLiveResults(normalizeResults(FALLBACK_RESULTS));
      setUsingFallback(true);
      setWarningMessage(FALLBACK_WARNING);
      setActiveQuery(cleanQuery);
      setPage(1);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoadingSearch(false);
      }
    }
  }

  const searchFromUrl = useMemo(() => getQueryParamFromSearch(location.search), [location.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryInput(searchFromUrl);
      if (searchFromUrl) {
        executeSemanticSearch(searchFromUrl, filters.subjectCode);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [filters.subjectCode, searchFromUrl]);

  const filterOptions = useMemo(() => buildFilterOptions(liveResults, subjects), [liveResults, subjects]);


  const filteredResults = useMemo(() => {
    const filtered = applyClientFilters(liveResults, filters);
    return applySort(filtered, sortId);
  }, [filters, liveResults, sortId]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE;
    return filteredResults.slice(start, start + PER_PAGE);
  }, [currentPage, filteredResults]);




  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanQuery = String(queryInput || "").trim();
    const params = new URLSearchParams(location.search);

    if (!cleanQuery) {
      params.delete("q");
      navigate({ pathname: "/search", search: params.toString() ? `?${params.toString()}` : "" });
      executeSemanticSearch("", filters.subjectCode);
      return;
    }

    params.set("q", cleanQuery);
    navigate({ pathname: "/search", search: `?${params.toString()}` });
    executeSemanticSearch(cleanQuery, filters.subjectCode);

  };

  const handlePopularSearch = (value) => {
    if (value === "More") {
      return;
    }
    setQueryInput(value);
    const params = new URLSearchParams(location.search);
    params.set("q", value);
    navigate({ pathname: "/search", search: `?${params.toString()}` });
    executeSemanticSearch(value, filters.subjectCode);

  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const clearFilters = () => {

    setFilters({
      subjectCode: "",
      topic: "All Topics",
      questionType: "All Types",
      examType: "All Exams",
      marks: "All Marks",
      yearFrom: DEFAULT_YEAR_FROM,
      yearTo: DEFAULT_YEAR_TO,
    });
    setPage(1);
  };

  const paginationNumbers = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) {
      if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
        pages.push(i);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  if (loadingSubjects) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <Card className="mx-auto max-w-xl rounded-2xl border-slate-200 bg-white p-8 text-center">
          <LoadingSpinner label="Loading search workspace..." />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]">
        <PublicSidebar
          user={user}
          accountMenuOpen={accountMenuOpen}
          onToggleAccountMenu={() => setAccountMenuOpen((current) => !current)}
          onNavigate={() => { }}
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
                <h1 className="text-2xl font-semibold text-slate-900">Search Questions</h1>
                <p className="mt-1 text-sm text-slate-500">Find questions by keywords, topics, or meaning.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600">
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700"
                aria-label="Open profile"
              >
                {getInitials(user?.full_name || "Alex Chen")}
              </button>

            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="space-y-6">
              <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={queryInput}
                        onChange={(event) => setQueryInput(event.target.value)}
                        type="search"
                        placeholder="Search questions, topics, concepts..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none focus:border-indigo-300 focus:bg-white"
                      />
                      {queryInput ? (
                        <button
                          type="button"
                          onClick={() => setQueryInput("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-1 text-slate-500 hover:bg-slate-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <button type="submit" disabled={loadingSearch} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-70">
                      {loadingSearch ? "Searching..." : "Search"}
                    </button>
                  </div>
                </form>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Popular Searches</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {POPULAR_SEARCHES.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        disabled={chip === "More"}
                        onClick={() => handlePopularSearch(chip)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${chip === "More" ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {warningMessage ? <p className="mt-3 text-xs font-medium text-amber-600">{warningMessage}</p> : null}
                {usingFallback ? <Badge tone="amber" className="mt-2">Sample fallback results</Badge> : null}

              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">Showing results for "{activeQuery || queryInput || "..."}"</p>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={sortId}
                        onChange={(event) => setSortId(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm font-semibold text-slate-700"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>

                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        disabled
                        className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg text-slate-400"
                        title="Grid mode coming soon"
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("list")}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${viewMode === "list" ? "bg-white text-indigo-600 shadow" : "text-slate-500"}`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              {loadingSearch ? (
                <Card className="rounded-2xl border-slate-200 bg-white p-8 text-center shadow-sm">
                  <LoadingSpinner label="Running semantic search..." />
                </Card>
              ) : null}

              {!loadingSearch && filteredResults.length === 0 ? (
                <Card className="rounded-2xl border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                  No questions found. Try another query or adjust filters.
                </Card>
              ) : null}

              {!loadingSearch && filteredResults.length > 0 ? (
                <div className="space-y-4">
                  {paginatedResults.map((result, index) => (
                    <ResultCard key={result.id} result={result} rank={(currentPage - 1) * PER_PAGE + index + 1} onAskTutor={openTutorModal} />
                  ))}
                </div>
              ) : null}

              {totalPages > 1 ? (
                <Card className="rounded-2xl border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>

                    {paginationNumbers.map((num, index) => {
                      const previous = paginationNumbers[index - 1];
                      const showGap = previous && num - previous > 1;
                      return (
                        <span key={num} className="inline-flex items-center">
                          {showGap ? <span className="px-1 text-slate-400">…</span> : null}
                          <button
                            type="button"
                            onClick={() => setPage(num)}
                            disabled={num === currentPage}
                            className={`mx-1 rounded-lg px-3 py-1.5 text-sm font-semibold ${num === currentPage ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}
                          >
                            {num}
                          </button>
                        </span>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </Card>
              ) : null}
            </main>

            <aside className="space-y-4">
              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                  <button type="button" onClick={clearFilters} className="text-xs font-semibold text-indigo-600">Clear all</button>
                </div>

                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Subject</span>
                    <select
                      value={filters.subjectCode}
                      onChange={(event) => {
                        const nextSubjectCode = event.target.value;
                        setFilters((current) => ({ ...current, subjectCode: nextSubjectCode }));
                        setPage(1);
                        const currentQuery = String(activeQuery || queryInput || "").trim();
                        if (currentQuery) {
                          executeSemanticSearch(currentQuery, nextSubjectCode);
                        }
                      }}

                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      {filterOptions.subjects.map((subject) => (
                        <option key={subject.code || "all"} value={subject.code}>{subject.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Topic</span>
                    <select
                      value={filters.topic}
                      onChange={(event) => {
                        setFilters((current) => ({ ...current, topic: event.target.value }));
                        setPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      {filterOptions.topics.map((topic) => (
                        <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Question Type</span>
                    <select
                      value={filters.questionType}
                      onChange={(event) => {
                        setFilters((current) => ({ ...current, questionType: event.target.value }));
                        setPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      {filterOptions.questionTypes.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Exam Type</span>
                    <select
                      value={filters.examType}
                      onChange={(event) => {
                        setFilters((current) => ({ ...current, examType: event.target.value }));
                        setPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      {filterOptions.examTypes.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Year Range</span>
                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        type="number"
                        value={filters.yearFrom}
                        onChange={(event) => {
                          setFilters((current) => ({ ...current, yearFrom: toNumber(event.target.value, DEFAULT_YEAR_FROM) }));
                          setPage(1);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
                      />
                      <span className="text-xs text-slate-500">to</span>
                      <input
                        type="number"
                        value={filters.yearTo}
                        onChange={(event) => {
                          setFilters((current) => ({ ...current, yearTo: toNumber(event.target.value, DEFAULT_YEAR_TO) }));
                          setPage(1);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
                      />
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Marks</span>
                    <select
                      value={filters.marks}
                      onChange={(event) => {
                        setFilters((current) => ({ ...current, marks: event.target.value }));
                        setPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                    >
                      {filterOptions.marks.map((mark) => (
                        <option key={String(mark)} value={mark}>{mark}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Search Tips</h3>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li>• Use key concepts or natural language phrases.</li>
                  <li>• Keep query specific for higher quality matches.</li>
                  <li>• Combine topic + type, e.g. "determinant proof".</li>
                </ul>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Ask AI Tutor</h3>
                <p className="mt-2 text-xs text-slate-600">Need explanation for a result? Ask AI Tutor.</p>
                <button
                  type="button"
                  onClick={() => navigate("/ai-tutor", { state: { subject_code: filters.subjectCode } })}
                  disabled={!isRouteEnabled("/ai-tutor")}
                  className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isRouteEnabled("/ai-tutor") ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-200 text-slate-600 cursor-not-allowed"}`}
                >
                  Ask AI Tutor
                </button>
              </Card>
            </aside>
          </div>
        </div>
      </div>

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

    </div>
  );
}


export default SimilarQuestionsPage;