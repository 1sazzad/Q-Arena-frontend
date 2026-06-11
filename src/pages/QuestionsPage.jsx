import { useCallback, useEffect, useState } from "react";
import QuestionRenderer from "../components/ui/QuestionRenderer";
import { useAuth } from "../context/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { apiEndpoints, getAnswerGenerationErrorMessage, logAnswerGenerationError } from "../api/api";
import { Badge, Button, Card, DiagramRenderer, EmptyState, LoadingSpinner, PageHeader, PaperTypeSelector, QuestionExtras, ResponsiveContainer } from "../components/ui";
import WorkflowSteps from "../components/ui/WorkflowSteps";
import { buildSubjectScopeParams, getAcademicProfileSignature } from "../utils/academicProfile";
import { getApiErrorMessage, isMissingStudentScopeError } from "../utils/auth";
import TutorModal from "../components/ui/TutorModal";
import { getDefaultPaperType, hasPaperTypeSupport, normalizePaperType, normalizeSupportedPaperTypes } from "../utils/paperTypes";
import {
  formatSubjectMeta,
  formatSubjectLabel,
  normalizeSubjectList,
  normalizeSubjectLookupResponse,
  normalizeSubjectSearchQuery,
} from "../utils/subjectLookups";

function normalizeQuestions(payload) {
  const items = payload?.questions || payload?.items || payload?.data || payload || [];
  return Array.isArray(items) ? items : [];
}

function normalizeTopics(payload) {
  return payload?.top_topics || payload?.topics || [];
}

const QUESTIONS_PER_PAGE = 20;

function getQuestionPaperType(question, fallback = "") {
  return normalizePaperType(question?.paper_type) || fallback;
}

function getQuestionText(question) {
  return question?.question_text || question?.text || question?.question || "";
}

function getQuestionKey(question, index) {
  return question?.id ?? index;
}

function getPageLevelAcademicLevel(user, currentSubject, overview) {
  return user?.academic_level || currentSubject?.academic_level || overview?.academic_level || null;
}

function getPageLevelBoard(currentSubject, overview) {
  return currentSubject?.board_name || currentSubject?.board || overview?.board_name || overview?.board || null;
}

function getPageLevelYear(currentSubject, overview) {
  return currentSubject?.exam_year || currentSubject?.year || overview?.exam_year || overview?.year || null;
}

function getOptionalText(value) {
  return String(value ?? "").trim();
}

function getAnswerTypeForQuestion(question) {
  const existingAnswerType = getOptionalText(question?.answer_type || question?.answerType);
  if (existingAnswerType) {
    return existingAnswerType;
  }

  const marks = Number(question?.marks ?? question?.question_marks ?? question?.total_marks ?? 5);
  if (Number.isFinite(marks)) {
    if (marks <= 2) return "2_mark";
    if (marks <= 5) return "5_mark";
    if (marks <= 10) return "10_mark";
    return "15_mark";
  }

  return "5_mark";
}

function getQuestionMainText(question) {
  return getOptionalText(
    question?.description ||
      question?.passage ||
      question?.stem ||
      question?.question_text ||
      question?.text ||
      question?.question ||
      "",
  );
}

function getWordBoxWords(wordBox) {
  if (Array.isArray(wordBox)) {
    return wordBox.map((word) => getOptionalText(word)).filter(Boolean);
  }

  if (wordBox && typeof wordBox === "object" && Array.isArray(wordBox.words)) {
    return wordBox.words.map((word) => getOptionalText(word)).filter(Boolean);
  }

  return [];
}

function getTableDataText(tableData) {
  if (!tableData) {
    return "";
  }

  if (typeof tableData === "string") {
    return tableData.trim();
  }

  if (Array.isArray(tableData)) {
    return tableData
      .map((row) => (Array.isArray(row) ? row.map((cell) => getOptionalText(cell)).join(" | ") : getOptionalText(row)))
      .join("\n")
      .trim();
  }

  if (typeof tableData === "object") {
    const headers = Array.isArray(tableData.headers)
      ? tableData.headers.map((header) => getOptionalText(header)).filter(Boolean).join(" | ")
      : Array.isArray(tableData.columns)
        ? tableData.columns.map((column) => getOptionalText(column)).filter(Boolean).join(" | ")
        : "";
    const rows = Array.isArray(tableData.rows)
      ? tableData.rows
          .map((row) => (Array.isArray(row) ? row.map((cell) => getOptionalText(cell)).join(" | ") : getOptionalText(row)))
          .join("\n")
      : Array.isArray(tableData.data)
        ? tableData.data
            .map((row) => (Array.isArray(row) ? row.map((cell) => getOptionalText(cell)).join(" | ") : getOptionalText(row)))
            .join("\n")
        : "";

    return [headers, rows].filter(Boolean).join("\n").trim();
  }

  return getOptionalText(tableData);
}

function getSubQuestionPromptText(subQuestion, index) {
  if (typeof subQuestion === "string") {
    return getOptionalText(subQuestion);
  }

  const label = getOptionalText(subQuestion?.display_label || subQuestion?.label || subQuestion?.question_no || `${index + 1}`);
  const text = getOptionalText(subQuestion?.question_text || subQuestion?.text || subQuestion?.question);
  const marks = getOptionalText(subQuestion?.marks ?? subQuestion?.question_marks ?? subQuestion?.total_marks ?? "");

  return [label ? `${label}.` : "", text, marks ? `(${marks} marks)` : ""].filter(Boolean).join(" ").trim();
}

function buildQuestionTextForAnswer(question, pageContext = {}) {
  const subjectCode = getOptionalText(question?.subject_code || question?.subjectCode || pageContext.selectedSubject);
  const subjectName = getOptionalText(question?.subject_name || question?.subjectName || pageContext.currentSubject?.subject_name || pageContext.currentSubject?.name);
  const paperType = getOptionalText(question?.paper_type || question?.paperType || pageContext.selectedPaperType);
  const questionType = getOptionalText(question?.question_type || question?.questionType);
  const marks = getOptionalText(question?.marks ?? question?.question_marks ?? question?.total_marks ?? "");
  const topic = getOptionalText(question?.topic || question?.final_topic || question?.suggested_topic);
  const examYear = getOptionalText(question?.exam_year || question?.year || pageContext.selectedYear);
  const board = getOptionalText(question?.board_name || question?.board || pageContext.selectedBoard);
  const section = getOptionalText(question?.section);
  const questionNo = getOptionalText(question?.question_no || question?.questionNo);
  const description = getOptionalText(question?.description || question?.passage || question?.stem);
  const mainQuestion = getQuestionMainText(question);
  const options = Array.isArray(question?.options) ? question.options.map((option) => getOptionalText(option)).filter(Boolean) : [];
  const subQuestions = Array.isArray(question?.sub_questions) ? question.sub_questions : [];
  const wordBoxWords = getWordBoxWords(question?.word_box);
  const tableDataText = getTableDataText(question?.table_data);
  const formulaLatex = getOptionalText(question?.formula_latex);
  const formulaDisplay = getOptionalText(question?.formula_display);
  const diagramRequired = question?.diagram_required === true || question?.diagram_required === "true";
  const diagramType = getOptionalText(question?.diagram_type);
  const diagramDescription = getOptionalText(question?.diagram_description);
  const metadata = [];

  if (subjectCode) metadata.push(`Subject Code: ${subjectCode}`);
  if (subjectName) metadata.push(`Subject Name: ${subjectName}`);
  if (paperType) metadata.push(`Paper Type: ${paperType}`);
  if (questionType) metadata.push(`Question Type: ${questionType}`);
  if (marks) metadata.push(`Marks: ${marks}`);
  if (topic) metadata.push(`Topic: ${topic}`);
  if (examYear) metadata.push(`Exam Year: ${examYear}`);
  if (board) metadata.push(`Board/Institution: ${board}`);
  if (section) metadata.push(`Section: ${section}`);
  if (questionNo) metadata.push(`Question No: ${questionNo}`);

  const parts = [...metadata];

  if (description) {
    parts.push(`\nDescription:\n${description}`);
  }

  if (mainQuestion && mainQuestion !== description) {
    parts.push(`\nQuestion:\n${mainQuestion}`);
  }

  if (options.length > 0) {
    const optionBlock = options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n");
    parts.push(`\nOptions:\n${optionBlock}`);
  }

  if (subQuestions.length > 0) {
    const subQuestionBlock = subQuestions.map((subQuestion, index) => getSubQuestionPromptText(subQuestion, index)).filter(Boolean).join("\n");
    parts.push(`\nSub Questions:\n${subQuestionBlock}`);
  }

  if (wordBoxWords.length > 0) {
    parts.push(`\nWord Box:\n${wordBoxWords.join(", ")}`);
  }

  if (tableDataText) {
    parts.push(`\nTable Data:\n${tableDataText}`);
  }

  if (formulaLatex) {
    parts.push(`\nFormula LaTeX:\n${formulaLatex}`);
  }

  if (formulaDisplay) {
    parts.push(`\nFormula Display:\n${formulaDisplay}`);
  }

  if (diagramRequired) {
    parts.push(`\nDiagram Required: Yes`);
  }

  if (diagramType) {
    parts.push(`Diagram Type: ${diagramType}`);
  }

  if (diagramDescription) {
    parts.push(`Diagram Description: ${diagramDescription}`);
  }

  const prompt = parts.filter(Boolean).join("\n").trim();

  return `${prompt}\n\nNow answer this question according to the marks and question type.`.trim();
}

function getQuestionAnswerPayload(question, pageContext, selection = {}) {
  const questionText = buildQuestionTextForAnswer(question, pageContext);
  const originalQuestionSummary = {
    has_options: Array.isArray(question?.options) && question.options.length > 0,
    has_description: Boolean(getOptionalText(question?.description || question?.passage || question?.stem)),
    has_sub_questions: Array.isArray(question?.sub_questions) && question.sub_questions.length > 0,
    has_metadata: Boolean(
      getOptionalText(question?.topic || question?.exam_year || question?.board || question?.section || question?.question_no || question?.instruction || question?.diagram_description || question?.formula_latex || question?.formula_display),
    ),
  };

  const payload = {
    question_id: question?.id ?? null,
    subject_id: question?.subject_id ?? question?.subjectId ?? pageContext.currentSubjectId ?? null,
    subject_code: question?.subject_code ?? question?.subjectCode ?? pageContext.selectedSubject ?? null,
    question: questionText,
    question_text: questionText,
    paper_type: question?.paper_type ?? question?.paperType ?? pageContext.selectedPaperType ?? null,
    question_type: question?.question_type ?? question?.questionType ?? null,
    answer_type: getAnswerTypeForQuestion(question),
    marks: question?.marks ?? question?.question_marks ?? question?.total_marks ?? null,
    topic: question?.topic ?? null,
    academic_level: pageContext.selectedLevel ?? null,
    board: pageContext.selectedBoard ?? null,
    exam_year: pageContext.selectedYear ?? null,
    section: question?.section ?? null,
    question_no: question?.question_no ?? question?.questionNo ?? null,
    instruction: question?.instruction ?? null,
    description: question?.description ?? null,
    options: question?.options ?? null,
    sub_questions: question?.sub_questions ?? question?.subQuestions ?? null,
    table_data: question?.table_data ?? question?.tableData ?? null,
    word_box: question?.word_box ?? question?.wordBox ?? null,
    diagram_required: question?.diagram_required ?? question?.diagramRequired ?? null,
    diagram_type: question?.diagram_type ?? question?.diagramType ?? null,
    diagram_svg: question?.diagram_svg ?? question?.diagramSvg ?? null,
    diagram_description: question?.diagram_description ?? question?.diagramDescription ?? null,
    formula_latex: question?.formula_latex ?? question?.formulaLatex ?? null,
    formula_display: question?.formula_display ?? question?.formulaDisplay ?? null,
    math_blocks: question?.math_blocks ?? question?.mathBlocks ?? null,
    metadata: {
      source: "subject-page",
      description: getOptionalText(question?.description || question?.passage || question?.stem),
      options: Array.isArray(question?.options) ? question.options : [],
      sub_questions: Array.isArray(question?.sub_questions) ? question.sub_questions : [],
      table_data: question?.table_data ?? question?.tableData ?? null,
      word_box: question?.word_box ?? question?.wordBox ?? null,
      topic: question?.topic ?? null,
      exam_year: question?.exam_year ?? question?.year ?? pageContext.selectedYear ?? null,
      section: question?.section ?? null,
      question_no: question?.question_no ?? question?.questionNo ?? null,
      instruction: question?.instruction ?? null,
      diagram_required: question?.diagram_required ?? question?.diagramRequired ?? null,
      diagram_type: question?.diagram_type ?? question?.diagramType ?? null,
      diagram_description: question?.diagram_description ?? question?.diagramDescription ?? null,
      formula_latex: question?.formula_latex ?? question?.formulaLatex ?? null,
      formula_display: question?.formula_display ?? question?.formulaDisplay ?? null,
      original_question_object_summary: originalQuestionSummary,
    },
  };

  if (selection.sub_question_label) {
    payload.sub_question_label = selection.sub_question_label;
  }

  if (selection.answer_mode) {
    payload.answer_mode = selection.answer_mode;
  }

  return payload;
}

function getSubQuestionText(subQuestion) {
  if (typeof subQuestion === "string") {
    return subQuestion;
  }

  return subQuestion?.question_text || subQuestion?.text || subQuestion?.question || "";
}

function getSubQuestionMarks(subQuestion) {
  if (!subQuestion || typeof subQuestion === "string") {
    return null;
  }

  return subQuestion.marks ?? subQuestion.question_marks ?? subQuestion.total_marks ?? null;
}

function getSubQuestionAnswerMode(subQuestion) {
  if (!subQuestion || typeof subQuestion === "string") {
    return "";
  }

  return getOptionalText(
    subQuestion?.solver_metadata?.answer_mode ||
      subQuestion?.solverMetadata?.answer_mode ||
      subQuestion?.solverMetadata?.answerMode,
  );
}

function getSubQuestionLabel(subQuestion, index) {
  if (!subQuestion || typeof subQuestion === "string") {
    return `${index + 1}.`;
  }

  const displayLabel = getOptionalText(subQuestion.display_label);
  if (displayLabel) {
    return displayLabel;
  }

  const questionNo = getOptionalText(subQuestion.question_no);
  const match = questionNo.match(/\(([^()]+)\)/);
  if (match?.[1]) {
    return `(${match[1].trim()})`;
  }

  const label = getOptionalText(subQuestion.label);
  if (label) {
    return `${label}.`;
  }

  return `${index + 1}.`;
}

function renderStructuredData(value) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-left text-sm text-slate-700">
          <tbody>
            {value.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {(Array.isArray(row) ? row : [row]).map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-slate-200 px-3 py-2 align-top">
                    {typeof cell === "object" ? JSON.stringify(cell) : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (typeof value === "object") {
    const headers = Array.isArray(value.headers) ? value.headers : [];
    const rows = Array.isArray(value.rows) ? value.rows : [];

    if (headers.length > 0 || rows.length > 0) {
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-left text-sm text-slate-700">
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="border border-slate-200 px-3 py-2 font-semibold align-top">
                      {String(header)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {(Array.isArray(row) ? row : [row]).map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-slate-200 px-3 py-2 align-top">
                      {typeof cell === "object" ? JSON.stringify(cell) : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <pre className="overflow-x-auto rounded-xl bg-white p-3 text-xs text-slate-700">{JSON.stringify(value, null, 2)}</pre>;
  }

  return <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{String(value)}</p>;
}

function QuestionBody({ question, paperType, selectedSubQuestionLabel, onSelectSubQuestion }) {
  const resolvedPaperType = getQuestionPaperType(question, paperType);
  const questionText = getQuestionText(question);
  const subQuestions = Array.isArray(question?.sub_questions) ? question.sub_questions : [];
  const options = Array.isArray(question?.options) ? question.options : [];
  const wordBox = Array.isArray(question?.word_box) ? question.word_box : [];
  const section = getOptionalText(question?.section);
  const questionType = getOptionalText(question?.question_type);
  const instruction = getOptionalText(question?.instruction);

  return (
    <div className="mt-4 space-y-3">
      {resolvedPaperType === "WRITTEN" && (section || questionType) && (
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          {section && <span className="rounded-full bg-white px-3 py-1">Section: {section}</span>}
          {questionType && <span className="rounded-full bg-white px-3 py-1">Type: {questionType}</span>}
        </div>
      )}

      {resolvedPaperType === "WRITTEN" && instruction && (
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700">
          <span className="font-semibold text-slate-950">Instruction:</span> {instruction}
        </p>
      )}

      {question?.stem && (
        <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-700 sm:text-base">
          {question.stem}
        </p>
      )}

      {questionText && (
        <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-700 sm:text-base">
          {questionText}
        </p>
      )}

      <DiagramRenderer question={question} />

      {!question?.stem && !questionText && resolvedPaperType !== "WRITTEN" && (
        <p className="text-sm leading-7 text-slate-500 sm:text-base">No question text provided.</p>
      )}

      {resolvedPaperType === "WRITTEN" && wordBox.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Word Box</p>
          <div className="flex flex-wrap gap-2">
            {wordBox.map((word, index) => (
              <span key={`${index}-${String(word)}`} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                {String(word)}
              </span>
            ))}
          </div>
        </div>
      )}

      {resolvedPaperType === "MCQ" && options.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option, optionIndex) => (
            <div key={`${optionIndex}-${String(option)}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {String(option)}
            </div>
          ))}
        </div>
      )}

      {(resolvedPaperType === "CQ" || resolvedPaperType === "WRITTEN") && subQuestions.length > 0 && (
        <div className="space-y-2">
          {typeof onSelectSubQuestion === "function" && (
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-800">
              Select one sub-question for answer generation.
            </div>
          )}
          {subQuestions.map((subQuestion, subIndex) => {
            const subQuestionText = getSubQuestionText(subQuestion);
            const marks = getSubQuestionMarks(subQuestion);
            const subOptions = Array.isArray(subQuestion?.options) ? subQuestion.options : [];
            const subQuestionLabel = getSubQuestionLabel(subQuestion, subIndex);
            const answerMode = getSubQuestionAnswerMode(subQuestion);
            const isSelected = selectedSubQuestionLabel && selectedSubQuestionLabel === subQuestionLabel;
            return (
              <div
                key={`${subIndex}-${subQuestionText}`}
                className={`rounded-xl border px-3 py-2 text-sm leading-6 ${isSelected ? "border-cyan-300 bg-cyan-50 text-cyan-950" : "border-slate-200 bg-white text-slate-700"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-950">{subQuestionLabel}</span>{" "}
                    {subQuestionText || "No sub-question text provided."}
                    {marks !== null && marks !== undefined && marks !== "" && (
                      <span className="ml-2 text-xs font-semibold text-slate-500">— {marks} marks</span>
                    )}
                    {answerMode && (
                      <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        {answerMode}
                      </span>
                    )}
                  </div>
                  {typeof onSelectSubQuestion === "function" && (
                    <button
                      type="button"
                      onClick={() => onSelectSubQuestion(subQuestionLabel)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${isSelected ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      {isSelected ? "Selected" : "Use for answer"}
                    </button>
                  )}
                </div>
                {resolvedPaperType === "WRITTEN" && subOptions.length > 0 && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {subOptions.map((option, optionIndex) => (
                      <div key={`${optionIndex}-${String(option)}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        {String(option)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolvedPaperType === "WRITTEN" && question?.table_data && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Table Data</p>
          {renderStructuredData(question.table_data)}
        </div>
      )}
    </div>
  );
}

function QuestionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const academicProfileSignature = getAcademicProfileSignature(user);
  const [subjects, setSubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [overview, setOverview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedPaperType, setSelectedPaperType] = useState("");
  const [questionPage, setQuestionPage] = useState(1);
  const [questionLimit] = useState(QUESTIONS_PER_PAGE);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalQuestionPages, setTotalQuestionPages] = useState(0);
  const [answers, setAnswers] = useState({});
  // Tutor modal state
  const [tutorModalOpen, setTutorModalOpen] = useState(false);
  const [tutorResponse, setTutorResponse] = useState(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState(null);
  const [selectedTutorQuestion, setSelectedTutorQuestion] = useState(null);
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [selectedSubQuestionMap, setSelectedSubQuestionMap] = useState({});
  const [booting, setBooting] = useState(true);
  const [loadingSubject, setLoadingSubject] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("Search for a subject code or pick one from the list to load published data.");
  const [missingScope, setMissingScope] = useState(false);

  const loadSubjectData = useCallback(async (subjectCode, page = 1, paperType = "") => {
    if (!subjectCode) {
      setOverview(null);
      setQuestions([]);
      setQuestionPage(1);
      setTotalQuestions(0);
      setTotalQuestionPages(0);
      setAnswers({});
      setLoadingMap({});
      setErrorMap({});
      setSelectedSubQuestionMap({});
      return;
    }

    setLoadingSubject(true);
    const safePage = Math.max(1, Number(page) || 1);

    try {
      const [overviewResponse, questionsResponse] = await Promise.all([
        apiEndpoints.getSubjectOverview(subjectCode),
        apiEndpoints.getSubjectQuestions(subjectCode, {
          page: safePage,
          limit: questionLimit,
          paper_type: paperType,
        }),
      ]);

      const questionPayload = questionsResponse.data || {};
      setOverview(overviewResponse.data || null);
      setQuestions(normalizeQuestions(questionPayload));
      setQuestionPage(Number(questionPayload.current_page || questionPayload.page || safePage));
      setTotalQuestions(Number(questionPayload.total || 0));
      setTotalQuestionPages(Number(questionPayload.total_pages || 0));
      setAnswers({});
      setLoadingMap({});
      setErrorMap({});
      setSelectedSubQuestionMap({});
      setMissingScope(false);
      setMessage(`Loaded published data for ${subjectCode}${paperType ? ` (${paperType})` : ""}.`);
    } catch (error) {
      console.error(error);
      setOverview(null);
      setQuestions([]);
      setTotalQuestions(0);
      setTotalQuestionPages(0);
      setAnswers({});
      setLoadingMap({});
      setErrorMap({});
      setSelectedSubQuestionMap({});
      setMissingScope(isMissingStudentScopeError(error));
      setMessage(getApiErrorMessage(error, "Unable to load subject data right now."));
    } finally {
      setLoadingSubject(false);
    }
  }, [questionLimit]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const params = buildSubjectScopeParams(user, { status: "published" });
        const response = await apiEndpoints.getSubjects(params);

        if (!active) {
          return;
        }

        const subjectList = normalizeSubjectList(response.data);
        setSubjects(subjectList);
        setMissingScope(false);

        if (subjectList.length > 0) {
          const firstSubject = subjectList[0];
          const firstSubjectCode = firstSubject.subject_code;
          const defaultPaperType = getDefaultPaperType(firstSubject.supported_paper_types);
          setSelectedSubject(firstSubjectCode);
          setSelectedPaperType(defaultPaperType);
          await loadSubjectData(firstSubjectCode, 1, defaultPaperType);
        } else {
          setMessage("No published subjects are available yet.");
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setMissingScope(isMissingStudentScopeError(error));
          setMessage(getApiErrorMessage(error, "Unable to load published subjects right now."));
        }
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [academicProfileSignature, loadSubjectData, user]);

  async function handleSearch(event) {
    event.preventDefault();

    const cleanQuery = normalizeSubjectSearchQuery(searchQuery);

    if (!cleanQuery) {
      setMessage("Enter a subject code or subject name to search.");
      return;
    }

    setSearching(true);

    try {
      const response = await apiEndpoints.searchSubject(cleanQuery);
      const data = normalizeSubjectLookupResponse(response.data) || {};
      setSearchResult(data);

      if ((data.found || data.subject_code) && data.subject_code) {
        const defaultPaperType = getDefaultPaperType(data.supported_paper_types);
        setMissingScope(false);
        setSelectedSubject(data.subject_code);
        setSelectedPaperType(defaultPaperType);
        await loadSubjectData(data.subject_code, 1, defaultPaperType);
      } else {
        setOverview(null);
        setQuestions([]);
        setQuestionPage(1);
        setTotalQuestions(0);
        setTotalQuestionPages(0);
        setMissingScope(false);
        setMessage(data.message || `No published subject found for "${cleanQuery}".`);
      }
    } catch (error) {
      console.error(error);
      setMissingScope(isMissingStudentScopeError(error));
      setMessage(getApiErrorMessage(error, "Subject search failed."));
    } finally {
      setSearching(false);
    }
  }

  async function handleSubjectChange(event) {
    const subjectCode = event.target.value;
    setSelectedSubject(subjectCode);

    if (!subjectCode) {
      setSearchResult(null);
      setOverview(null);
      setQuestions([]);
      setQuestionPage(1);
      setTotalQuestions(0);
      setTotalQuestionPages(0);
      setMissingScope(false);
      setMessage("Pick a subject to view its overview and published questions.");
      return;
    }

    setSearchResult(null);
    const subject = subjects.find((item) => item.subject_code === subjectCode);
    const defaultPaperType = getDefaultPaperType(subject?.supported_paper_types);
    setSelectedPaperType(defaultPaperType);
    await loadSubjectData(subjectCode, 1, defaultPaperType);
  }

  async function handleQuestionPageChange(nextPage) {
    if (!selectedSubject || loadingSubject) {
      return;
    }
    const boundedPage = Math.min(Math.max(1, nextPage), Math.max(totalQuestionPages, 1));
    if (boundedPage === questionPage) {
      return;
    }
    await loadSubjectData(selectedSubject, boundedPage, selectedPaperType);
  }

  const topicEntries = normalizeTopics(overview);
  const availableYears = overview?.available_years || [];
  const currentSubject = searchResult?.subject_code === selectedSubject
    ? searchResult
    : subjects.find((subject) => subject.subject_code === selectedSubject) || overview || null;
  const selectedLevel = getPageLevelAcademicLevel(user, currentSubject, overview);
  const selectedBoard = getPageLevelBoard(currentSubject, overview);
  const selectedYear = getPageLevelYear(currentSubject, overview);
  const supportedPaperTypes = normalizeSupportedPaperTypes(currentSubject?.supported_paper_types);
  const showPaperSelector = hasPaperTypeSupport(currentSubject);

  async function handleGetAnswer(question, index) {
    const questionKey = getQuestionKey(question, index);

    if (loadingMap[questionKey]) {
      return;
    }

    setLoadingMap((prev) => ({ ...prev, [questionKey]: true }));
    setErrorMap((prev) => ({ ...prev, [questionKey]: "" }));

    const subQuestions = Array.isArray(question?.sub_questions) ? question.sub_questions : [];
    const selectedSubQuestionLabel = selectedSubQuestionMap[questionKey] || "";
    const selectedSubQuestion = selectedSubQuestionLabel
      ? subQuestions.find((subQuestion, subIndex) => getSubQuestionLabel(subQuestion, subIndex) === selectedSubQuestionLabel)
      : null;

    const payload = getQuestionAnswerPayload(question, {
      selectedLevel,
      selectedBoard,
      selectedYear,
      selectedSubject,
      selectedPaperType,
      currentSubject,
      currentSubjectId: currentSubject?.id ?? null,
    }, {
      sub_question_label: selectedSubQuestionLabel || null,
      answer_mode: getSubQuestionAnswerMode(selectedSubQuestion) || null,
    });

    console.log("Get Answer payload", {
      endpoint: "/generate-answer",
      subject_code: payload.subject_code,
      question_id: payload.question_id,
      question_type: payload.question_type,
      payload_question_preview: String(payload.question || "").slice(0, 500),
      has_options: Array.isArray(payload.metadata?.options) && payload.metadata.options.length > 0,
      has_description: Boolean(payload.metadata?.description),
      has_sub_questions: Array.isArray(payload.metadata?.sub_questions) && payload.metadata.sub_questions.length > 0,
      has_metadata: Boolean(payload.metadata),
    });

    try {
      const response = await apiEndpoints.generateQuestionAnswer(payload);
      console.log(response.data);

      const responseData = response?.data ?? {};
      const rawAnswer = responseData.answer ?? responseData.generated_answer ?? responseData;
      const normalizedAnswer = typeof rawAnswer === "string"
        ? rawAnswer
        : rawAnswer && typeof rawAnswer === "object"
          ? JSON.stringify(rawAnswer, null, 2)
          : String(rawAnswer ?? "");

      setAnswers((prev) => ({
        ...prev,
        [questionKey]: normalizedAnswer,
      }));
    } catch (error) {
      logAnswerGenerationError("/generate-answer", payload, error);
      setErrorMap((prev) => ({
        ...prev,
        [questionKey]: getAnswerGenerationErrorMessage(error, "Failed to generate answer."),
      }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [questionKey]: false }));
    }
  }

  async function handlePaperTypeChange(nextPaperType) {
    if (!selectedSubject || loadingSubject) {
      return;
    }

    setSelectedPaperType(nextPaperType);
    await loadSubjectData(selectedSubject, 1, nextPaperType);
  }

  function handleSelectSubQuestion(questionKey, subQuestionLabel) {
    setSelectedSubQuestionMap((prev) => ({
      ...prev,
      [questionKey]: subQuestionLabel,
    }));
  }

  // Tutor API handlers
  async function handleExplainWithTutor(question) {
    setSelectedTutorQuestion(question || null);
    setTutorResponse(null);
    setTutorError(null);
    setTutorModalOpen(true);

    if (!question || !question?.id) {
      setTutorError("Question ID is missing, so Tutor preview cannot be loaded.");
      return;
    }

    setTutorLoading(true);
    try {
      const payload = {
        mode: "simple_explanation",
        language: "en",
        student_level: "beginner",
        include_whiteboard: true,
        include_hints: true,
        include_practice: true,
      };
      const resp = await apiEndpoints.explainTutorQuestion(question.id, payload);
      const data = resp?.data ?? resp;
      setTutorResponse(data);
    } catch (err) {
      console.error(err);
      setTutorError(getApiErrorMessage(err, "Unable to load Tutor preview."));
    } finally {
      setTutorLoading(false);
    }
  }

  function handleRetryTutor() {
    if (selectedTutorQuestion) {
      handleExplainWithTutor(selectedTutorQuestion);
    }
  }

  if (booting) {
    return <LoadingSpinner label="Loading subjects..." />;
  }

  return (
    <ResponsiveContainer>
        <PageHeader
          eyebrow="Subjects / Overview"
          title="Subject Overview"
          description="Choose a subject, review smart predictions, find similar questions, and browse previous-year questions."
        />

        <Card as="form" onSubmit={handleSearch} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
            Search subject
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="CSE-421 or E-Commerce and Web Engineering"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            Browse published subjects
            <select
              value={selectedSubject}
              onChange={handleSubjectChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id || subject.subject_code} value={subject.subject_code}>
                  {formatSubjectLabel(subject)}{formatSubjectMeta(subject) ? ` (${formatSubjectMeta(subject)})` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
            <Button type="submit" disabled={searching}>
              {searching ? "Searching..." : "Search subject"}
            </Button>
            <span className="text-sm text-slate-500">{message}</span>
            {missingScope && (
              <Button as={Link} to="/profile" variant="secondary">
                Go to profile
              </Button>
            )}
          </div>
        </Card>

        {searchResult && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-700">Search result</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {formatSubjectLabel(searchResult) || "Subject lookup"}
                </h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${searchResult.found ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"}`}>
                {searchResult.found ? "Published" : "Not found"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Subject name</p>
                <p className="mt-1 font-semibold text-slate-950">{searchResult.subject_name || "N/A"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Total questions</p>
                <p className="mt-1 font-semibold text-slate-950">{searchResult.total_questions ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Can upload</p>
                <p className="mt-1 font-semibold text-slate-950">{searchResult.can_upload ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Available years</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {Array.isArray(searchResult.available_years) && searchResult.available_years.length > 0
                    ? searchResult.available_years.join(", ")
                    : "N/A"}
                </p>
              </div>
            </div>
            <QuestionExtras item={searchResult} />
          </Card>
        )}

        {overview ? (
          <div className="grid gap-4">
            {/* Hero / Summary */}
            <Card className="lg:flex lg:items-center lg:justify-between lg:gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-700">Overview</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{`Prepare smarter for ${overview.subject_name || overview.subject_code || selectedSubject}`}</h2>
                <p className="mt-1 text-sm text-slate-500">{`${overview.total_questions ?? questions.length} previous questions analysed across ${availableYears.length > 0 ? availableYears.join(", ") : "multiple years"}.`}</p>
                {formatSubjectMeta(currentSubject) && (
                  <p className="mt-1 text-sm font-medium text-slate-600">{formatSubjectMeta(currentSubject)}</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 lg:mt-0">
                <Button onClick={() => navigate("/predict", { state: { subject_code: selectedSubject } })}>
                  View Smart Predictions
                </Button>
                <Button onClick={() => navigate("/analysis", { state: { subject_code: selectedSubject, subjectCode: selectedSubject, selectedSubject } })} variant="secondary">
                  Topic Analysis
                </Button>
                <Button onClick={() => navigate("/search", { state: { subject_code: selectedSubject } })} variant="secondary" className="hidden sm:inline-flex">
                  Find similar questions
                </Button>
              </div>
            </Card>

            <WorkflowSteps mode="loggedin" selectedSubject={selectedSubject} />

            {/* Smart Prediction preview (primary feature) */}
              <Card className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-700">Smart Prediction</p>
                    <div className="mt-2 flex items-center gap-3">
                      <h3 className="text-2xl font-semibold text-slate-950">Smart Prediction</h3>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Recommended</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">Find likely exam topics based on previous-year questions, frequency, marks, and repeated patterns.</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-sm text-slate-500">Topics found</p>
                        <p className="mt-1 font-semibold text-slate-950">{topicEntries.length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-sm text-slate-500">Years analysed</p>
                        <p className="mt-1 font-semibold text-slate-950">{availableYears.length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-sm text-slate-500">Questions analysed</p>
                        <p className="mt-1 font-semibold text-slate-950">{overview.total_questions ?? questions.length}</p>
                      </div>
                    </div>

                    {topicEntries.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-slate-500">Top topics</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {topicEntries.slice(0, 6).map((topic, index) => (
                            <Badge key={topic.topic || topic.name || index} tone="indigo">{topic.topic || topic.name || topic}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </Card>
          </div>
        ) : (
          <EmptyState title="No published subject data loaded yet" description="Search for a subject code or choose one from the list to load details." />
        )}

        <Card data-published-questions>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-700">Published questions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Questions for the selected subject</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showPaperSelector && (
                <PaperTypeSelector
                  supportedPaperTypes={supportedPaperTypes}
                  value={selectedPaperType}
                  onChange={handlePaperTypeChange}
                />
              )}
              <Badge>
                {loadingSubject ? "Refreshing..." : `${totalQuestions || questions.length} total`}
              </Badge>
            </div>
          </div>
          {totalQuestionPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-950">{questionPage}</span> of{" "}
                <span className="font-semibold text-slate-950">{totalQuestionPages}</span>
                {" "}({questions.length} shown)
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingSubject || questionPage <= 1}
                  onClick={() => handleQuestionPageChange(questionPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingSubject || questionPage >= totalQuestionPages}
                  onClick={() => handleQuestionPageChange(questionPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4">
            {questions.length === 0 ? (
              <EmptyState
                title={selectedPaperType ? `No ${selectedPaperType} questions found for this subject.` : "No published questions"}
                description={selectedPaperType ? "Try another supported paper type if available." : "This subject is published, but no question records were returned."}
              />
            ) : (
              questions.map((question, index) => {
                const questionKey = getQuestionKey(question, index);
                const isLoadingAnswer = Boolean(loadingMap[questionKey]);
                const questionAnswer = answers[questionKey];
                const questionError = errorMap[questionKey];

                // Format question number display
                let displayQuestionNo = "";
                if (question.question_no) {
                  displayQuestionNo = `Q${question.question_no}`;
                } else {
                  displayQuestionNo = `Q${index + 1}`;
                }

                // Determine topic display
                let topicDisplay = null;
                if (question.topic && question.topic.trim() !== "") {
                  topicDisplay = question.topic;
                } else if (question.topic === "" || question.topic === null || question.topic === undefined) {
                  topicDisplay = null; // Hide topic if empty
                }

                // Determine year display
                let yearDisplay = question.exam_year ?? selectedYear ?? null;

                return (
                <article key={questionKey} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-slate-950">
                        {displayQuestionNo}
                      </h3>
                    </div>
                    <Badge>
                      {question.marks ?? "-"} marks
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {topicDisplay && <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{topicDisplay}</span>}
                    {yearDisplay && <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">{yearDisplay}</span>}
                  </div>

                  <QuestionRenderer question={question} index={index} />

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => handleGetAnswer(question, index)}
                      disabled={isLoadingAnswer}
                      className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoadingAnswer ? "Generating..." : "Get Answer"}
                    </button>

                    {isLoadingAnswer && (
                      <p className="mt-3 text-sm text-slate-500">Generating answer...</p>
                    )}

                    {questionError && (
                      <p className="mt-3 text-sm text-red-500">{questionError}</p>
                    )}

                    {questionAnswer && (
                      <div className="mt-4 overflow-hidden rounded-lg bg-gray-100 p-4 transition-all duration-300 ease-out">
                        <h4 className="mb-2 font-semibold">Answer:</h4>
                        <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                          {typeof questionAnswer === "string"
                            ? questionAnswer
                            : JSON.stringify(questionAnswer, null, 2)}
                        </p>
                      </div>
                    )}

                    {/* Explain with Tutor button (opens modal) */}
                    <button
                      type="button"
                      onClick={() => handleExplainWithTutor(question)}
                      disabled={tutorLoading && selectedTutorQuestion?.id === question?.id}
                      className="mt-4 ml-3 rounded-lg bg-amber-600 px-4 py-2 text-white transition hover:bg-amber-700 disabled:opacity-50"
                    >
                      {tutorLoading && selectedTutorQuestion?.id === question?.id ? "Loading Tutor..." : "Explain with Tutor"}
                    </button>
                  </div>
                </article>
                );
              })
            )}
          </div>
          {totalQuestionPages > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: totalQuestionPages }, (_, index) => index + 1)
                .filter((page) => (
                  page === 1 ||
                  page === totalQuestionPages ||
                  Math.abs(page - questionPage) <= 2
                ))
                .map((page, index, visiblePages) => {
                  const previousPage = visiblePages[index - 1];
                  const showGap = previousPage && page - previousPage > 1;
                  return (
                    <span key={page} className="flex items-center gap-2">
                      {showGap && <span className="text-sm text-slate-400">...</span>}
                      <Button
                        type="button"
                        variant={page === questionPage ? "primary" : "secondary"}
                        disabled={loadingSubject || page === questionPage}
                        onClick={() => handleQuestionPageChange(page)}
                      >
                        {page}
                      </Button>
                    </span>
                  );
                })}
            </div>
          )}
                </Card>
          <TutorModal
            isOpen={tutorModalOpen}
            onClose={() => setTutorModalOpen(false)}
            tutorResponse={tutorResponse}
            loading={tutorLoading}
            error={tutorError}
            onRetry={handleRetryTutor}
          />
    </ResponsiveContainer>
  );
}

export default QuestionsPage;

// question