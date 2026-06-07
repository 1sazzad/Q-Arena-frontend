import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/useAuth";
import { Link, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { apiEndpoints, getAnswerBuilderErrorKind, getAnswerGenerationErrorMessage, logAnswerGenerationError } from "../api/api";
import AnswerWarningBanner from "../components/common/AnswerWarningBanner";
import { Badge, Button, Card, DiagramRenderer, ErrorMessage, PageHeader, QuestionExtras, ResponsiveContainer } from "../components/ui";
import { MISSING_STUDENT_SCOPE_MESSAGE, isMissingStudentScopeError } from "../utils/auth";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";

const ANSWER_TYPE_MARKS = {
  "2_mark": 2,
  "5_mark": 5,
  "10_mark": 10,
  "15_mark": 15,
};
const ALLOWED_ANSWER_TYPES = Object.keys(ANSWER_TYPE_MARKS);
const MAX_QUESTION_LENGTH = 2000;
const MAX_DIAGRAM_REFERENCE_LENGTH = 500;
const MAX_DIAGRAM_DESCRIPTION_LENGTH = 2000;
const MAX_FORMULA_LATEX_LENGTH = 5000;
const ANSWER_BUILDING_WARNING_DELAY_MS = 15000;

const RETRIEVAL_SOURCE_LABELS = {
  chroma: "Chroma context",
  database_fallback: "Database fallback",
  fallback: "No strong context",
};

const FALLBACK_REASON_LABELS = {
  gemini_error: "AI generation failed, fallback answer used",
  missing_vectors: "No vectors found, database context used",
  weak_chroma_results: "Weak vector match, fallback context used",
  empty_context: "No related context found",
};

const KATEX_OPTIONS = {
  throwOnError: false,
  strict: false,
  trust: false,
};

const WARNING_APPLICABLE_SUBJECT_KEYWORDS = [
  "math",
  "mathematics",
  "physics",
  "engineering",
  "statistic",
  "programming",
  "problem solving",
  "algorithm",
  "coding",
  "computer science",
  "calculus",
  "numerical",
];

const PURE_THEORY_SUBJECT_KEYWORDS = [
  "history",
  "business",
  "management",
  "marketing",
  "human resource",
  "sociology",
  "philosophy",
  "literature",
  "organizational behavior",
];

const markdownComponents = {
  h2: (props) => <h2 className="mt-7 border-b border-slate-200 pb-2 text-xl font-semibold leading-snug text-slate-950 first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-5 text-lg font-semibold leading-snug text-slate-900" {...props} />,
  p: (props) => <p className="my-3 text-[16px] leading-8 text-slate-700 sm:text-[17px]" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-2 pl-6 text-[16px] leading-8 text-slate-700 sm:text-[17px]" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-2 pl-6 text-[16px] leading-8 text-slate-700 sm:text-[17px]" {...props} />,
  li: (props) => <li className="pl-1" {...props} />,
  strong: (props) => <strong className="font-semibold text-slate-950" {...props} />,
  blockquote: (props) => <blockquote className="my-4 border-l-4 border-indigo-200 bg-indigo-50/60 py-2 pl-4 pr-3 text-slate-700" {...props} />,
  table: (props) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full border-collapse bg-white text-left text-sm text-slate-700" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-slate-100 text-slate-950" {...props} />,
  th: (props) => <th className="border border-slate-200 px-3 py-2 font-semibold align-top" {...props} />,
  td: (props) => <td className="border border-slate-200 px-3 py-2 align-top" {...props} />,
  pre: (props) => <pre className="my-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100" {...props} />,
  code: (props) => {
    const { className = "", children, ...rest } = props;
    const isBlock = className.includes("language-") || String(children).includes("\n");

    if (isBlock) {
      return <code className={`${className} block min-w-max`} {...rest}>{children}</code>;
    }

    return (
      <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.92em] font-medium text-slate-900" {...rest}>
        {children}
      </code>
    );
  },
};

function getErrorMessage(error, fallback) {
  if (isMissingStudentScopeError(error)) {
    return MISSING_STUDENT_SCOPE_MESSAGE;
  }

  const detail = error.response?.data?.detail || error.response?.data?.message;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return detail || error.message || fallback;
}

function getQuotaFromError(error) {
  return error.response?.data?.quota || error.data?.quota || null;
}

function getAnswerBuilderErrorMessage(error) {
  switch (getAnswerBuilderErrorKind(error)) {
    case "timeout":
      return "Your answer is taking longer than usual. Please wait a little and try again.";
    case "rate-limit":
      return "Many students are using Q Arena right now. Please wait a little while and try again.";
    case "network":
      return "Connection issue detected. Please check your internet and try again.";
    case "server":
    case "unknown":
    default:
      return "Something went wrong while preparing your answer. Please try again.";
  }
}

function normalizeRelatedQuestions(payload) {
  const items = payload?.related_questions || payload?.related_previous_questions || [];
  return Array.isArray(items) ? items : [];
}

function buildSubjectMetadataText(answerResult, subjectFromList) {
  return [
    answerResult?.subject_type,
    answerResult?.subject_category,
    answerResult?.subject_name,
    answerResult?.subject_code,
    answerResult?.topic_used,
    subjectFromList?.subject_type,
    subjectFromList?.subject_category,
    subjectFromList?.subject_name,
    subjectFromList?.subject_code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesAnyKeyword(text, keywords) {
  if (!text) {
    return false;
  }
  return keywords.some((keyword) => text.includes(keyword));
}

function answerLooksTechnical(answerText) {
  if (!answerText || !String(answerText).trim()) {
    return false;
  }

  const text = String(answerText);
  const lowerText = text.toLowerCase();

  const hasLatex =
    /\$\$[\s\S]*?\$\$/.test(text) ||
    /\$[^$\n]+\$/.test(text) ||
    /\\\([\s\S]*?\\\)/.test(text) ||
    /\\\[[\s\S]*?\\\]/.test(text) ||
    /\\(frac|sum|sqrt|alpha|beta|gamma|theta|int|partial|begin\{(?:matrix|bmatrix|pmatrix|vmatrix)\})/.test(text);

  const hasEquationOrCalculation =
    /\b\d+(?:\.\d+)?\s*(?:\+|-|\*|x|×|\/|=|%)\s*\d+(?:\.\d+)?\b/.test(lowerText) ||
    /\b(?:therefore|hence|solve|result|computed?|calculation|substitute)\b/.test(lowerText);

  const hasMatrixSignals =
    /\b(matrix|matrices|determinant|eigenvalue|vector)\b/.test(lowerText) ||
    /\\begin\{(?:matrix|bmatrix|pmatrix|vmatrix)\}/.test(text);

  const hasIntegralOrDerivativeSignals =
    /\\int|∫/.test(text) ||
    /\b(derivative|differentiate|integration|integral|d\/dx|dy\/dx|partial derivative)\b/.test(lowerText) ||
    /\\frac\{d\}/.test(text);

  const hasCodeBlockSignals =
    /```[\s\S]*?```/.test(text) ||
    /`[^`\n]+`/.test(text) ||
    /\b(function|def|class|return|for\s*\(|while\s*\(|if\s*\(|console\.log|public\s+static|printf)\b/.test(lowerText);

  return hasLatex || hasEquationOrCalculation || hasMatrixSignals || hasIntegralOrDerivativeSignals || hasCodeBlockSignals;
}

function shouldShowAnswerWarning({ answerText, answerResult, selectedSubject }) {
  const metadataText = buildSubjectMetadataText(answerResult, selectedSubject);
  const hasMetadata = Boolean(metadataText.trim());

  if (hasMetadata) {
    if (matchesAnyKeyword(metadataText, PURE_THEORY_SUBJECT_KEYWORDS)) {
      return false;
    }

    if (matchesAnyKeyword(metadataText, WARNING_APPLICABLE_SUBJECT_KEYWORDS)) {
      return true;
    }
  }

  return answerLooksTechnical(answerText);
}

function GenerateAnswerPage() {
  const { user } = useAuth();
  const location = useLocation();
  const loadingWarningTimerRef = useRef(null);
  const [question, setQuestion] = useState(() => location.state?.question || "");
  const [subjectCode, setSubjectCode] = useState(() => location.state?.subject_code || "");
  const [answerType, setAnswerType] = useState("5_mark");
  const [formulaLatex, setFormulaLatex] = useState(() => location.state?.formula_latex || "");
  const [diagramRequired, setDiagramRequired] = useState(() => Boolean(location.state?.diagram_required));
  const [diagramReference, setDiagramReference] = useState(() => location.state?.diagram_reference || "");
  const [diagramDescription, setDiagramDescription] = useState(() => location.state?.diagram_description || "");
  const [marks, setMarks] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState(null);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState("Ask a question and generate a simple answer.");
  const [isError, setIsError] = useState(false);
  const [missingScope, setMissingScope] = useState(false);
  const [showLongLoadingWarning, setShowLongLoadingWarning] = useState(false);

  useEffect(() => {
    return () => {
      if (loadingWarningTimerRef.current) {
        clearTimeout(loadingWarningTimerRef.current);
      }
    };
  }, []);

  function clearLoadingWarningTimer() {
    if (loadingWarningTimerRef.current) {
      clearTimeout(loadingWarningTimerRef.current);
      loadingWarningTimerRef.current = null;
    }
  }

  const lastLoadedSubjectsKeyRef = useRef(null);

  // Effect A: Load subjects only when stable user academic filters change
  useEffect(() => {
    let active = true;

    const key = JSON.stringify({
      university_id: user?.university_id || null,
      department_id: user?.department_id || null,
    });

    if (lastLoadedSubjectsKeyRef.current === key) {
      // Already loaded for this key, skip
      return;
    }

    lastLoadedSubjectsKeyRef.current = key;

    const params = { status: "published" };
    if (user?.university_id) params.university_id = user.university_id;
    if (user?.department_id) params.department_id = user.department_id;

    apiEndpoints.getSubjects(params)
      .then((response) => {
        if (!active) {
          return;
        }

        const subjectList = normalizeSubjectList(response.data);
        setSubjects(subjectList);
        setMissingScope(false);
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setMissingScope(isMissingStudentScopeError(error));
          setIsError(isMissingStudentScopeError(error));
          setMessage(getErrorMessage(error, "Could not load subjects. You can still type a subject code manually."));
        }
      });

    return () => {
      active = false;
    };
  }, [user?.university_id, user?.department_id]);

  // Effect B: Set default subjectCode only after subjects are loaded and subjectCode is empty
  useEffect(() => {
    if (!subjectCode && subjects.length > 0) {
      setSubjectCode(subjects[0].subject_code);
    }
  }, [subjectCode, subjects]);

  async function handleGenerateAnswer(event) {
    event?.preventDefault?.();

    if (loading) {
      return;
    }

    setMissingScope(false);

    if (!question.trim() || !subjectCode.trim()) {
      setIsError(true);
      setMessage("Please enter both a question and a subject code.");
      return;
    }

    if (!ALLOWED_ANSWER_TYPES.includes(answerType)) {
      setIsError(true);
      setMessage("Please select a valid answer type.");
      return;
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      setIsError(true);
      setMessage(`Question is too long. Keep it under ${MAX_QUESTION_LENGTH} characters.`);
      return;
    }

    if (formulaLatex.length > MAX_FORMULA_LATEX_LENGTH) {
      setIsError(true);
      setMessage(`Formula must be ${MAX_FORMULA_LATEX_LENGTH} characters or fewer.`);
      return;
    }

    if (diagramReference.length > MAX_DIAGRAM_REFERENCE_LENGTH) {
      setIsError(true);
      setMessage(`Diagram reference must be ${MAX_DIAGRAM_REFERENCE_LENGTH} characters or fewer.`);
      return;
    }

    if (diagramDescription.length > MAX_DIAGRAM_DESCRIPTION_LENGTH) {
      setIsError(true);
      setMessage(`Diagram description must be ${MAX_DIAGRAM_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }

    const trimmedMarks = String(marks).trim();
    const requestedMarks = trimmedMarks ? Number(trimmedMarks) : null;
    if (requestedMarks !== null && (!Number.isFinite(requestedMarks) || requestedMarks <= 0)) {
      setIsError(true);
      setMessage("Marks must be a positive number.");
      return;
    }

    try {
      clearLoadingWarningTimer();
      setLoading(true);
      setShowLongLoadingWarning(false);
      setAnswer("");
      setAnswerResult(null);
      setIsError(false);
      setMessage("");

      loadingWarningTimerRef.current = setTimeout(() => {
        setShowLongLoadingWarning(true);
      }, ANSWER_BUILDING_WARNING_DELAY_MS);

      const response = await apiEndpoints.generateAnswer({
        question: question.trim(),
        subject_code: subjectCode.trim(),
        answer_type: answerType,
        marks: requestedMarks,
        formula_latex: formulaLatex.trim() || null,
        diagram_required: diagramRequired,
        diagram_reference: diagramReference.trim() || null,
        diagram_description: diagramDescription.trim() || null,
      });

      const data = response.data || {};
      setAnswerResult(data);
      setQuota(data.quota || null);
      setAnswer(data.generated_answer || data.answer || JSON.stringify(data, null, 2));
      setMissingScope(false);
      setMessage("Answer generated successfully.");
    } catch (error) {
      logAnswerGenerationError("/generate-answer", {
        question: question.trim(),
        subject_code: subjectCode.trim(),
        answer_type: answerType,
        marks: requestedMarks,
        formula_latex: formulaLatex.trim() || null,
        diagram_required: diagramRequired,
        diagram_reference: diagramReference.trim() || null,
        diagram_description: diagramDescription.trim() || null,
      }, error);
      const friendlyMessage = isMissingStudentScopeError(error)
        ? MISSING_STUDENT_SCOPE_MESSAGE
        : getAnswerGenerationErrorMessage(error, getAnswerBuilderErrorMessage(error));
      setAnswer("");
      setAnswerResult(null);
      setQuota(getQuotaFromError(error));
      setIsError(true);
      setMissingScope(isMissingStudentScopeError(error));
      setMessage(friendlyMessage);
    } finally {
      clearLoadingWarningTimer();
      setLoading(false);
      setShowLongLoadingWarning(false);
    }
  }

  const relatedQuestions = normalizeRelatedQuestions(answerResult);
  const selectedSubject = subjects.find((subject) => subject.subject_code === (answerResult?.subject_code || subjectCode));
  const retrievalSourceLabel = answerResult?.retrieval_source
    ? RETRIEVAL_SOURCE_LABELS[answerResult.retrieval_source] || answerResult.retrieval_source
    : null;
  const fallbackReasonLabel = answerResult?.fallback_reason
    ? FALLBACK_REASON_LABELS[answerResult.fallback_reason] || "Fallback context used"
    : null;
  const showAnswerWarning = shouldShowAnswerWarning({
    answerText: answer,
    answerResult,
    selectedSubject,
  });

  return (
    <ResponsiveContainer>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Answer generator"
          title="Generate exam-style answers with context"
          description="Draft a focused answer from the selected subject and related stored questions."
        />

        <Card>
          <form onSubmit={handleGenerateAnswer} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Question
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What is SEO?"
                  className="min-h-32 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Subject code
                <input
                  value={subjectCode}
                  onChange={(event) => setSubjectCode(event.target.value)}
                  placeholder="CSE-421"
                  list="subject-list"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Answer type
                <select
                  value={answerType}
                  onChange={(event) => setAnswerType(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="2_mark">2 Mark Answer</option>
                  <option value="5_mark">5 Mark Answer</option>
                  <option value="10_mark">10 Mark Answer</option>
                  <option value="15_mark">15 Mark Answer</option>
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Marks
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={marks}
                  onChange={(event) => setMarks(event.target.value)}
                  placeholder={`Optional, ${ANSWER_TYPE_MARKS[answerType]} marks selected`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Formula
                <input
                  value={formulaLatex}
                  onChange={(event) => setFormulaLatex(event.target.value)}
                  placeholder="E=mc^2"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={diagramRequired}
                  onChange={(event) => setDiagramRequired(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Diagram Required
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Diagram reference
                <input
                  value={diagramReference}
                  onChange={(event) => setDiagramReference(event.target.value)}
                  placeholder="Figure 1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Diagram description
                <textarea
                  value={diagramDescription}
                  onChange={(event) => setDiagramDescription(event.target.value)}
                  placeholder="Describe the expected labelled diagram."
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 leading-6 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate answer"}
            </Button>
          </form>

          <datalist id="subject-list">
            {subjects.map((subject) => (
              <option key={subject.id || subject.subject_code} value={subject.subject_code}>
                {formatSubjectLabel(subject)}
              </option>
            ))}
          </datalist>

          <div className="mt-4">
            {loading ? (
              <ErrorMessage tone="info">
                {showLongLoadingWarning
                  ? "Preparing your answer...\nThis is taking longer than expected due to high demand."
                  : "Preparing your answer..."}
              </ErrorMessage>
            ) : (
              <>
                <ErrorMessage tone={isError ? "error" : "info"}>{message}</ErrorMessage>
                {isError && !missingScope && (
                  <div className="mt-3">
                    <Button type="button" onClick={handleGenerateAnswer} variant="secondary">
                      Retry
                    </Button>
                  </div>
                )}
                {missingScope && (
                  <div className="mt-3">
                    <Button as={Link} to="/profile" variant="secondary">
                      Go to profile
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {quota && (
            <div className="mt-4 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:grid-cols-2">
              <span className="font-semibold text-slate-900">
                AI Answers Used: {quota.used} / {quota.limit} this month
              </span>
              <span>Remaining: {quota.remaining}</span>
            </div>
          )}

          {answer && (
            <div className="mt-6 space-y-4">
              {showAnswerWarning && <AnswerWarningBanner />}

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-950">Generated answer</h2>
                <Badge tone="indigo">{(answerResult?.answer_type || answerType).replace("_", " ")}</Badge>
              </div>

              <div className="mt-4 overflow-x-auto break-words rounded-2xl bg-white/80 px-4 py-3 text-slate-700 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-2 [&_.katex]:text-[1.04em]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}
                  components={markdownComponents}
                >
                  {answer}
                </ReactMarkdown>
              </div>

              {answerResult && (
                <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                  {answerResult.topic_used && <span className="rounded-xl bg-white px-3 py-2">Topic: {answerResult.topic_used}</span>}
                  {answerResult.marks !== undefined && answerResult.marks !== null && <span className="rounded-xl bg-white px-3 py-2">Marks: {answerResult.marks}</span>}
                  {answerResult.subject_name && <span className="rounded-xl bg-white px-3 py-2">Subject: {answerResult.subject_name}</span>}
                  {answerResult.subject_code && <span className="rounded-xl bg-white px-3 py-2">Code: {answerResult.subject_code}</span>}
                  {retrievalSourceLabel && <span className="rounded-xl bg-white px-3 py-2">Source: {retrievalSourceLabel}</span>}
                  {answerResult.fallback_used && <span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">Fallback answer used</span>}
                  {fallbackReasonLabel && <span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">{fallbackReasonLabel}</span>}
                </div>
              )}

              {Array.isArray(answerResult?.detected_answer_types) && answerResult.detected_answer_types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {answerResult.detected_answer_types.map((detectedType) => (
                    <span key={detectedType} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">
                      {detectedType}
                    </span>
                  ))}
                </div>
              )}

              {answerResult?.formula_used && (
                <QuestionExtras
                  item={{ formula_latex: answerResult.formula_used }}
                  formulaLabel="Important Formula"
                  className="rounded-2xl"
                />
              )}

              {answerResult?.diagram_required && (
                <DiagramRenderer
                  question={answerResult}
                  diagram_required={answerResult.diagram_required}
                  diagram_type={answerResult.diagram_type}
                  diagram_svg={answerResult.diagram_svg}
                  diagram_description={answerResult.diagram_description}
                  diagram_reference={answerResult.diagram_reference}
                />
              )}

              {answerResult?.mermaid_code && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Mermaid Code</p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5">
                    <code>{answerResult.mermaid_code}</code>
                  </pre>
                </div>
              )}

              {relatedQuestions.length > 0 && (
                <details className="mt-5 rounded-2xl border border-indigo-100 bg-white/70 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-950">
                    Related Previous Questions ({relatedQuestions.length})
                  </summary>
                  <div className="mt-3 space-y-3">
                    {relatedQuestions.map((relatedQuestion, index) => (
                      <article key={relatedQuestion.id || relatedQuestion.question_no || index} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-700">
                          {relatedQuestion.question_text || relatedQuestion.question || relatedQuestion.text || "Related question"}
                        </p>
                        <DiagramRenderer question={relatedQuestion} />
                        <QuestionExtras item={relatedQuestion} />
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          {relatedQuestion.topic && <span className="rounded-full bg-slate-100 px-3 py-1">{relatedQuestion.topic}</span>}
                          {relatedQuestion.marks !== undefined && relatedQuestion.marks !== null && <span className="rounded-full bg-slate-100 px-3 py-1">{relatedQuestion.marks} marks</span>}
                          {relatedQuestion.exam_year && <span className="rounded-full bg-slate-100 px-3 py-1">{relatedQuestion.exam_year}</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              )}
            </div>
            </div>
          )}
        </Card>
      </div>
    </ResponsiveContainer>
  );
}

export default GenerateAnswerPage;
