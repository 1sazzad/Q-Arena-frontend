import { Link } from "react-router-dom";
import { useState } from "react";

import MathRenderer from "../../components/MathRenderer";
import QuestionDiagram from "../../components/ui/QuestionDiagram";
import SubQuestionRenderer from "../../components/ui/SubQuestionRenderer";
import TutorClassroomModal from "../../components/ui/TutorClassroomModal";
import { apiEndpoints } from "../../api/api";

const valueOrDash = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return value;
};

const getSafeText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const normalizeQuestionInput = (input) => {
  if (!input || typeof input !== "object") return {};

  if (input.question && typeof input.question === "object") {
    const { question, ...rest } = input;
    return {
      ...rest,
      ...question,
    };
  }

  if (input.source_question && typeof input.source_question === "object") {
    const { source_question, ...rest } = input;
    return {
      ...rest,
      ...source_question,
    };
  }

  if (input.related_question && typeof input.related_question === "object") {
    const { related_question, ...rest } = input;
    return {
      ...rest,
      ...related_question,
    };
  }

  return input;
};

function getTableData(tableData) {
  if (!tableData || typeof tableData !== "object") {
    return { columns: [], rows: [] };
  }

  const columns = Array.isArray(tableData.columns) ? tableData.columns : Array.isArray(tableData.headers) ? tableData.headers : [];
  const rows = Array.isArray(tableData.rows) ? tableData.rows : Array.isArray(tableData.data) ? tableData.data : [];

  return { columns, rows };
}

function renderTableCell(row, column, cellIndex) {
  if (Array.isArray(row)) {
    return row[cellIndex];
  }

  if (row && typeof row === "object") {
    return row[column] ?? row[String(column).trim()] ?? "";
  }

  return row;
}

export default function PredictionQuestionCard({ question }) {
  const [selectedTutorQuestion, setSelectedTutorQuestion] = useState(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState(null);
  const [tutorResponse, setTutorResponse] = useState(null);

  const q = normalizeQuestionInput(question);

  const subjectCode = q.subject_code || q.subjectCode || "";

  const questionId = q.question_id || q.id || "";

  const questionNo = q.question_no || q.questionNo || q.number || "";

  const marks = q.marks || q.total_marks || q.mark || "";

  const year = q.exam_year || q.year || "";

  const paperType = q.paper_type || q.paperType || "";

  const questionText =
    getSafeText(q.question_text_clean) ||
    getSafeText(q.question_text) ||
    getSafeText(q.description) ||
    getSafeText(q.text) ||
    getSafeText(q.question);

  const rendererQuestion = {
    ...q,

    id: questionId || q.id,
    question_id: questionId || q.id,

    question_no: questionNo,
    questionNo,

    question_text: questionText,
    question_text_clean: q.question_text_clean || questionText,
    questionText,
    questionTextClean: q.question_text_clean || questionText,

    marks,

    subject_code: subjectCode,
    subjectCode,

    subject_name: q.subject_name || q.subjectName || "",
    subjectName: q.subject_name || q.subjectName || "",

    exam_year: year,
    examYear: year,

    paper_type: paperType,
    paperType,

    topic: q.topic || "",

    diagram_svg: q.diagram_svg || q.diagramSvg || "",
    diagramSvg: q.diagram_svg || q.diagramSvg || "",

    diagram_required: q.diagram_required || q.diagramRequired || false,
    diagramRequired: q.diagram_required || q.diagramRequired || false,

    diagram_type: q.diagram_type || q.diagramType || "",
    diagramType: q.diagram_type || q.diagramType || "",

    sub_questions: q.sub_questions || q.subQuestions || [],
    subQuestions: q.sub_questions || q.subQuestions || [],

    table_data: q.table_data || q.tableData || null,
    tableData: q.table_data || q.tableData || null,
  };

  const diagramSvg = rendererQuestion.diagramSvg || rendererQuestion.diagram_svg || "";
  const diagramType = (rendererQuestion.diagramType || rendererQuestion.diagram_type || "").toLowerCase();
  const tableData = rendererQuestion.tableData || rendererQuestion.table_data || null;
  const subQuestions = Array.isArray(rendererQuestion.subQuestions) ? rendererQuestion.subQuestions : [];

  const hasDiagram = Boolean(diagramSvg);
  const hasSubQuestions = Array.isArray(subQuestions) && subQuestions.length > 0;
  const hasTableData = Array.isArray(tableData) ? tableData.length > 0 : Boolean(tableData);
  const hasExtraContent = hasDiagram || hasTableData || hasSubQuestions;

  const fetchTutorExplanation = async (qid) => {
    if (!qid) return;
    setTutorLoading(true);
    setTutorError(null);
    setTutorResponse(null);
    try {
      const resp = await apiEndpoints.explainTutorQuestion(qid);
      const data = resp?.data ?? resp;
      setTutorResponse(data);
    } catch (err) {
      console.warn("Tutor explain API failed:", err?.message || err);
      setTutorError("Q Arena AI Teacher is unavailable. Please try again.");
      setTutorResponse(null);
    } finally {
      setTutorLoading(false);
    }
  };

  const openTutor = (questionPayload) => {
    const normalized = questionPayload || null;
    setSelectedTutorQuestion(normalized);
    const qid = normalized?.id || normalized?.question_id || null;
    if (qid) fetchTutorExplanation(qid);
  };

  const closeTutorModal = () => {
    setSelectedTutorQuestion(null);
    setTutorResponse(null);
    setTutorError(null);
    setTutorLoading(false);
  };

  return (

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">Question {valueOrDash(questionNo)}</span>

            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{valueOrDash(marks)} marks</span>

            {year ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{year}</span>
            ) : null}

            {paperType ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">{paperType}</span>
            ) : null}
          </div>

          <div className="text-sm leading-6 text-slate-700 break-words">
                      {questionText ? (
                        <div className="min-w-0 max-w-full overflow-x-auto">
                          <MathRenderer value={questionText} className="prose max-w-none" />
                        </div>
                      ) : (
                        <span className="text-slate-400">Question text is unavailable.</span>
                      )}
                    </div>
        </div>

                <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:mt-0 sm:w-auto sm:grid-cols-2">
          <Link
            to={subjectCode ? `/subjects/${subjectCode}/questions` : "/subjects"}
            state={{ questionId }}
            className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 w-full justify-center text-center"
          >
            Practice
          </Link>

          <button
            type="button"
            onClick={() => openTutor(rendererQuestion)}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 w-full justify-center text-center"
          >
            Ask AI Tutor
          </button>
        </div>
      </div>

          {hasExtraContent ? (
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        {/* If there is a diagram SVG, render it */}
        {diagramSvg && diagramType === "svg" && (
          <div className="mt-4">
            <QuestionDiagram diagramType={diagramType} diagramSvg={diagramSvg} className="w-full max-w-full overflow-x-auto rounded-lg" />
          </div>
        )}

        {/* If table data present, render simple table */}
        {tableData && (() => {
          const { columns, rows } = getTableData(tableData);
          if (columns.length > 0 && rows.length > 0) {
            return (
              <div className="mt-4 qa-scroll-x max-w-full w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="min-w-full border-collapse text-left text-sm text-slate-700">
                  <thead>
                    <tr>
                      {columns.map((column, columnIndex) => (
                        <th key={`${columnIndex}-${String(column)}`} className="border border-slate-200 px-3 py-2 font-semibold align-top">
                          <MathRenderer value={String(column)} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {columns.map((column, columnIndex) => (
                          <td key={`${rowIndex}-${columnIndex}`} className="border border-slate-200 px-3 py-2 align-top">
                            <MathRenderer value={renderTableCell(row, column, columnIndex) ?? ""} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return null;
        })()}

        {/* Sub-questions */}
        {subQuestions.length > 0 && (
          <div className="mt-4 w-full max-w-full min-w-0 space-y-3">
            {subQuestions.map((subQuestion, subIndex) => (
              <SubQuestionRenderer key={`${subIndex}-${String(subQuestion?.question_no || subIndex)}`} subQuestion={subQuestion} index={subIndex} />
            ))}
          </div>
        )}
      </div>
    ) : null}

    {selectedTutorQuestion ? (
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
    ) : null}

    </div>
  );
}


