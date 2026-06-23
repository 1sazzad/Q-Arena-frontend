import { useEffect, useMemo, useState } from "react";
import { FileDown, Target } from "lucide-react";

import StudentPageLayout from "../components/layout/StudentPageLayout";
import { apiEndpoints, downloadPredictionPdf } from "../api/api";
import PredictionSummary from "../features/prediction/PredictionSummary";
import PredictionTopicCard from "../features/prediction/PredictionTopicCard";
import {
  filterPredictionTopics,
  normalizePredictionResponse,
} from "../features/prediction/predictionMapper";

const EMPTY_PREDICTION_DATA = {
  success: false,
  subjectCode: "",
  subjectId: null,
  subjectName: "Selected Subject",
  message: "",
  pendingReviewCount: 0,
  topics: [],
  allQuestions: [],
  summary: {
    confidence: 0,
    predictedTopics: 0,
    predictedQuestions: 0,
    highPriorityTopics: 0,
    pastExamsUsed: 0,
  },
};

const FALLBACK_SUBJECTS = [
  {
    subject_code: "510225",
    subject_name: "Linear Algebra",
    subjectCode: "510225",
    subjectName: "Linear Algebra",
  },
];

const normalizeSubjects = (payload) => {
  const source =
    payload?.items ||
    payload?.subjects ||
    payload?.data ||
    payload;

  if (!Array.isArray(source)) return [];

  return source
    .map((subject) => {
      const subjectCode =
        subject.subject_code ||
        subject.subjectCode ||
        subject.code ||
        "";


      const subjectName =
        subject.subject_name ||
        subject.subjectName ||
        subject.name ||
        subject.title ||
        "Untitled Subject";

      return {
        ...subject,
        subject_code: String(subjectCode).trim(),
        subject_name: subjectName,
      };
    })
    .filter((subject) => subject.subject_code);


};

const subjectLabel = (subject) => {
  if (!subject) return "Select subject";
  return `${subject.subject_code} — ${subject.subject_name}`;
};

export default function PredictionsPage() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [predictionData, setPredictionData] = useState(EMPTY_PREDICTION_DATA);

  const [subjectLoading, setSubjectLoading] = useState(true);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    priority: "all",
    evidenceRange: "all",
  });

  const TOPICS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);


  useEffect(() => {
    let active = true;


    async function loadSubjects() {
      setSubjectLoading(true);

      try {
        const response = await apiEndpoints.getSubjects();
        const normalizedSubjects = normalizeSubjects(response.data);

        const finalSubjects = normalizedSubjects.length
          ? normalizedSubjects
          : FALLBACK_SUBJECTS;

        if (!active) return;

        setSubjects(finalSubjects);

        setSelectedSubjectCode((current) => {
          if (current) return current;
          return finalSubjects[0]?.subject_code || "";
        });
      } catch (error) {
        console.error("Failed to load subjects:", error);

        if (!active) return;

        setSubjects(FALLBACK_SUBJECTS);
        setSelectedSubjectCode(FALLBACK_SUBJECTS[0].subject_code);
      } finally {
        if (active) setSubjectLoading(false);
      }
    }

    loadSubjects();

    return () => {
      active = false;
    };


  }, []);

  useEffect(() => {
    if (!selectedSubjectCode) return;


    let active = true;

    async function loadPredictions() {
      setPredictionLoading(true);
      setStatusMessage("");

      try {
        const response = await apiEndpoints.getPredictions(selectedSubjectCode);
        const normalized = normalizePredictionResponse(response.data);

        if (!active) return;

        setPredictionData(normalized);

        if (!normalized.topics.length) {
          setStatusMessage("No predictions found for this subject yet.");
        }
      } catch (error) {
        console.error("Failed to load predictions:", error);

        if (!active) return;

        setPredictionData(EMPTY_PREDICTION_DATA);
        setStatusMessage(
          "Live prediction data is currently unavailable. Please try again later.",
        );
      } finally {
        if (active) setPredictionLoading(false);
      }
    }

    loadPredictions();

    return () => {
      active = false;
    };


  }, [selectedSubjectCode]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.subject_code === selectedSubjectCode),
    [subjects, selectedSubjectCode],
  );

  const visibleTopics = useMemo(
    () => filterPredictionTopics(predictionData.topics, filters),
    [predictionData.topics, filters],
  );

  const totalPages = Math.max(1, Math.ceil(visibleTopics.length / TOPICS_PER_PAGE));

  const paginatedTopics = useMemo(() => {
    const startIndex = (currentPage - 1) * TOPICS_PER_PAGE;
    return visibleTopics.slice(startIndex, startIndex + TOPICS_PER_PAGE);
  }, [visibleTopics, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubjectCode, filters.search, filters.priority, filters.evidenceRange]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const handleFilterChange = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      priority: "all",
      evidenceRange: "all",
    });
  };

  const handleDownloadPdf = async () => {
    if (!selectedSubjectCode) {
      setStatusMessage("Please select a subject before downloading the report.");
      return;
    }

    try {
      setStatusMessage("");


      const result = await downloadPredictionPdf(selectedSubjectCode);
      const blob = new Blob([result.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename || `q-arena-predictions-${selectedSubjectCode}.pdf`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);


    } catch (error) {
      console.error("Failed to download prediction PDF:", error);
      setStatusMessage("Could not download prediction report. Please try again.");
    }
  };


  return (
    <StudentPageLayout
      title="Smart Predictions"
      subtitle="Topic-first predictions with previous-question evidence."
      searchValue={filters.search}
      onSearchChange={(value) => handleFilterChange("search", value)}
      searchPlaceholder="Search topics or questions..."
    > <div className="space-y-6">
        {/* Filters */} <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"> <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          {/* Subject filter */} <label className="block"> <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Subject </span>


            <select
              value={selectedSubjectCode}
              disabled={subjectLoading}
              onChange={(event) => setSelectedSubjectCode(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            >
              {subjects.map((subject) => (
                <option key={subject.subject_code} value={subject.subject_code}>
                  {subjectLabel(subject)}
                </option>
              ))}
            </select>
          </label>

          {/* Evidence range filter */}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Evidence Range
            </span>

            <select
              value={filters.evidenceRange}
              onChange={(event) =>
                handleFilterChange("evidenceRange", event.target.value)
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            >
              <option value="all">All Evidence</option>
              <option value="recent">Latest Year</option>
              <option value="previous">Previous Years</option>
            </select>
          </label>

          {/* Priority filter */}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Priority
            </span>

            <select
              value={filters.priority}
              onChange={(event) =>
                handleFilterChange("priority", event.target.value)
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            >
              <option value="all">All Topics</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>

          {/* Filter actions */}
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:w-auto">
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-12 w-full sm:w-auto rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <FileDown className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>
        </section>

        {/* Status */}
        {statusMessage ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
            {statusMessage}
          </section>
        ) : null}

        {/* Summary */}
        <section>
          <PredictionSummary summary={predictionData.summary} />
        </section>

        {/* Main content */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Topic list */}
          <main className="space-y-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Predicted Topics to Study
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedSubject
                    ? subjectLabel(selectedSubject)
                    : predictionData.subjectName}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {visibleTopics.length} topic(s)
              </span>
            </div>

            {predictionLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">
                Loading predictions...
              </div>
            ) : null}

            {!predictionLoading && visibleTopics.length ? (
              <div className="space-y-5">
                {paginatedTopics.map((topic) => (
                  <PredictionTopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            ) : null}

            {!predictionLoading && visibleTopics.length > TOPICS_PER_PAGE ? (

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * TOPICS_PER_PAGE + 1}
                  {" - "}
                  {Math.min(currentPage * TOPICS_PER_PAGE, visibleTopics.length)}
                  {" of "}
                  {visibleTopics.length}
                  {" topics"}
                </p>

                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto"
                  >
                    Previous
                  </button>

                  <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 w-full sm:w-auto">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto"
                  >
                    Next
                  </button>
                </div>
                

              </div>
            ) : null}


            {!predictionLoading && !visibleTopics.length ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-sm font-medium text-slate-500">
                No predictions found for these filters.
              </div>
            ) : null}
          </main>

          {/* Right column */}
          <aside className="space-y-5 min-w-0">
            {/* Snapshot */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <Target className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-950">
                    Prediction Snapshot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Based on imported previous questions.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Confidence</span>
                  <span className="font-bold text-slate-900">
                    {predictionData.summary.confidence}%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Topics</span>
                  <span className="font-bold text-slate-900">
                    {predictionData.summary.predictedTopics}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Evidence Questions</span>
                  <span className="font-bold text-slate-900">
                    {predictionData.summary.predictedQuestions}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Past Exam Years</span>
                  <span className="font-bold text-slate-900">
                    {predictionData.summary.pastExamsUsed}
                  </span>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-950">How to use this</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Start with High priority topics. Open the related previous
                questions, practice repeated patterns, then ask AI Tutor for weak
                areas.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </StudentPageLayout>


  );
} 
