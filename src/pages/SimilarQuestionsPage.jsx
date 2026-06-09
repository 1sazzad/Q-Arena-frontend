import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/useAuth";
import { apiEndpoints } from "../api/api";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card, DiagramRenderer, EmptyState, LoadingSpinner, PageHeader, QuestionExtras, ResponsiveContainer } from "../components/ui";
import QuestionRenderer from "../components/ui/QuestionRenderer";
import { hasRenderableQuestionText, normalizeQuestionForRenderer } from "../utils/questionRenderUtils";
import { buildSubjectScopeParams, getAcademicProfileSignature } from "../utils/academicProfile";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";

function normalizeResults(payload) {
  return payload?.results || payload?.matches || payload?.questions || payload?.data || [];
}

function SimilarQuestionsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [subjects, setSubjects] = useState([]);
  const [query, setQuery] = useState("Explain SEO");
  const [subjectCode, setSubjectCode] = useState("");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
    const [message, setMessage] = useState("Run a search to see similar questions from the database.");
  const requestCounterRef = useRef(0);



  const navigate = useNavigate();
  const initialSubjectCode = String(location.state?.subject_code || "").trim();
  const academicProfileSignature = getAcademicProfileSignature(user);

  useEffect(() => {
    let active = true;

    const params = buildSubjectScopeParams(user, { status: "published" });

    apiEndpoints.getSubjects(params)
      .then((response) => {
        if (!active) {
          return;
        }

        const subjectList = normalizeSubjectList(response.data);
        setSubjects(subjectList);
        if (initialSubjectCode) {
          setSubjectCode(initialSubjectCode);
        } else if (subjectList.length > 0) {
          setSubjectCode(subjectList[0].subject_code);
        } else {
          setMessage("Select a subject code to narrow semantic search.");
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (active) {
          setBooting(false);
        }
      });

    return () => {
      active = false;
    };
  }, [academicProfileSignature, initialSubjectCode, user]);

    async function fetchSimilarQuestions(event) {
    event.preventDefault();

    if (!query.trim()) {
      setMessage("Enter a query before searching.");
      return;
    }

    // increment request id to help ignore stale responses
    requestCounterRef.current = (requestCounterRef.current || 0) + 1;
    const requestId = requestCounterRef.current;

    try {
      setLoading(true);
      setMessage("Searching semantic matches...");
      // clear previous results immediately to avoid showing stale results while loading
      setResults([]);

      const payload = {
        query: query.trim(),
        subject_code: subjectCode || undefined,
        top_k: Number(topK),
      };

      // Log the outgoing payload to help debug request shapes
      // eslint-disable-next-line no-console
      console.debug("[semantic-search] sending request", { requestId, payload });

      const response = await apiEndpoints.searchQuestions(payload);

      // If a newer request was started after this one, ignore this response
      if (requestCounterRef.current !== requestId) {
        // eslint-disable-next-line no-console
        console.debug("[semantic-search] ignoring stale response", { requestId, current: requestCounterRef.current });
        return;
      }

      const nextResults = normalizeResults(response.data);
      setResults(nextResults);
      setMessage(`Found ${nextResults.length} similar question(s).`);
    } catch (error) {
      // If a newer request is in flight, do not overwrite its message
      if (requestCounterRef.current !== requestId) {
        // eslint-disable-next-line no-console
        console.debug("[semantic-search] error for stale request ignored", { requestId, current: requestCounterRef.current });
        return;
      }

      console.error(error);
      setMessage(error.response?.data?.detail || "Search failed. Check the backend and embeddings.");
    } finally {
      if (requestCounterRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  if (booting) {
    return <LoadingSpinner label="Loading search workspace..." />;
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        eyebrow="Semantic search"
        title="Find similar questions from the vector store"
        description="Search stored question embeddings with a natural-language query and narrow results by subject."
        actions={<Button onClick={() => navigate("/analysis", { state: { subject_code: subjectCode } })}>View analysis</Button>}
      />

        <Card as="form" onSubmit={fetchSimilarQuestions} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
            Search query
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="Explain SEO"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            Subject code
            <select
              value={subjectCode}
              onChange={(event) => setSubjectCode(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id || subject.subject_code} value={subject.subject_code}>
                  {formatSubjectLabel(subject)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            Top K
            <input
              type="number"
              min="1"
              max="20"
              value={topK}
              onChange={(event) => setTopK(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search similar questions"}
            </Button>
            <span className="text-sm text-slate-500">{message}</span>
          </div>
        </Card>

        <div className="grid gap-4">
          {results.length === 0 ? (
          <EmptyState title="No similar questions yet" description="Run a search to populate semantic matches from the published question database." />
          ) : (
          results.map((result, index) => (
            <Card as="article" key={result.id || index} className="transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Result {index + 1}</p>
                  <h2 className="mt-2 whitespace-pre-line break-words text-lg font-semibold leading-7 text-slate-950 sm:text-xl">
                    {result.question_text || result.question || result.main_question || "Similar question"}
                  </h2>
                </div>
                <Badge tone="indigo">
                  {result.score ?? result.similarity ?? result.confidence ?? result.distance ?? "Match"}
                </Badge>
              </div>
              {hasRenderableQuestionText(result) ? (
                <QuestionRenderer question={normalizeQuestionForRenderer(result)} index={index} />
              ) : (
                <>
                  <DiagramRenderer question={result} />
                  <QuestionExtras item={result} />

                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    {result.subject_code && <span className="rounded-xl bg-slate-100 px-3 py-2">{result.subject_code}</span>}
                    {result.question_no && <span className="rounded-xl bg-slate-100 px-3 py-2">{result.question_no}</span>}
                    {result.topic && <span className="rounded-xl bg-indigo-50 px-3 py-2 text-indigo-800">{result.topic}</span>}
                    {result.exam_year && <span className="rounded-xl bg-slate-100 px-3 py-2">{result.exam_year}</span>}
                  </div>
                </>
              )}
            </Card>
          ))
          )}
        </div>
    </ResponsiveContainer>
  );
}

export default SimilarQuestionsPage;

// similar questions page