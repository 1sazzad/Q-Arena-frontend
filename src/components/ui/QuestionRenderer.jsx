import QuestionDiagram from "./QuestionDiagram";
import MathRenderer from "../MathRenderer";
import SubQuestionRenderer from "./SubQuestionRenderer";

function getOptionalText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function getQuestionText(question) {
  return question?.question_text || question?.text || question?.question || "";
}

function getQuestionStem(question) {
  return getOptionalText(question?.stem);
}

function getWordBoxWords(wordBox) {
  if (Array.isArray(wordBox)) {
    return wordBox;
  }

  if (wordBox && typeof wordBox === "object" && Array.isArray(wordBox.words)) {
    return wordBox.words;
  }

  return [];
}

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



function QuestionRenderer({ question, index }) {

  const questionNo = getOptionalText(question?.question_no);
  const marks = question?.marks ?? question?.question_marks ?? question?.total_marks ?? null;
  const section = getOptionalText(question?.section);
  const questionType = getOptionalText(question?.question_type);
  const instruction = getOptionalText(question?.instruction);
  const stem = getQuestionStem(question);
  let questionText = getQuestionText(question);

  // Normalize escaped LaTeX delimiters for proper rendering
  if (typeof questionText === "string") {
    questionText = questionText
      .replace(/\\\\\(/g, "\\(")
      .replace(/\\\\\)/g, "\\)")
      .replace(/\\\\\[/g, "\\[")
      .replace(/\\\\\]/g, "\\]");
  }
  const wordBoxWords = getWordBoxWords(question?.word_box);
  const { columns, rows } = getTableData(question?.table_data);
  const diagramSvg = getOptionalText(question?.diagram_svg);
  const diagramTypeRaw = getOptionalText(question?.diagram_type);
  const diagramType = diagramTypeRaw ? diagramTypeRaw.toLowerCase() : "";
  const diagramDescription = getOptionalText(question?.diagram_description);
  const diagramRequired = question?.diagram_required === true || question?.diagram_required === "true";
  const subQuestions = Array.isArray(question?.sub_questions) ? question.sub_questions : [];

  // diagram info
  // diagramSvg and diagramType are used by QuestionDiagram to render inline SVGs safely




  return (
    <article className="w-full max-w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 min-w-0">

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="w-full max-w-full min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">Question {questionNo || index + 1}</span>
            {section && <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Section: {section}</span>}
            {questionType && <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Type: {questionType}</span>}
          </div>

          {instruction && (
            <p className="rounded-2xl border border-cyan-100 bg-white px-3 py-2 text-sm leading-6 text-slate-700 overflow-hidden">
              <span className="font-semibold text-slate-950">Instruction:</span>{' '}<MathRenderer value={instruction} className="inline prose max-w-none" />
            </p>
          )}
        </div>

        {marks !== null && marks !== undefined && marks !== "" && (
          <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            {marks} marks
            {question.marks_breakdown && (
              <small className="ml-2 text-xs font-normal text-slate-300">Breakdown: {question.marks_breakdown}</small>
            )}
          </span>
        )}
      </div>

      {stem && (
        <div className="mt-4 w-full max-w-full min-w-0 qa-content break-words overflow-hidden text-sm leading-7 text-slate-800 sm:text-base">
          <MathRenderer value={stem} className="prose max-w-none" />
        </div>
      )}

      {questionText && questionText !== stem && (
        <div className="mt-4 w-full max-w-full min-w-0 qa-content break-words overflow-hidden text-sm leading-7 text-slate-800 sm:text-base">
          <MathRenderer value={questionText} className="prose max-w-none" />
        </div>
      )}

      <QuestionDiagram diagramType={diagramType} diagramSvg={diagramSvg} diagramDescription={diagramDescription} diagramRequired={diagramRequired} />


      {!diagramSvg && diagramRequired && diagramDescription && (

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <strong>Diagram:</strong>{' '}<MathRenderer value={diagramDescription} className="inline prose max-w-none" />
        </div>
      )}

      {!diagramSvg && diagramRequired && !diagramDescription && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Diagram required.
        </div>
      )}

      {wordBoxWords.length > 0 && (
        <div className="mt-4 w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Word Box</p>
          <div className="flex flex-wrap gap-2">
            {wordBoxWords.map((word, wordIndex) => (
              <span key={`${wordIndex}-${String(word)}`} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                <MathRenderer value={word} className="inline prose max-w-none" />
              </span>
            ))}
          </div>
        </div>
      )}

      {columns.length > 0 && rows.length > 0 && (
        <div className="mt-4 qa-scroll-x max-w-full w-full min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full border-collapse text-left text-sm text-slate-700">
            <thead>
              <tr>
                {columns.map((column, columnIndex) => (
                  <th key={`${columnIndex}-${String(column)}`} className="border border-slate-200 px-3 py-2 font-semibold align-top">
                    <MathRenderer value={column} />
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
      )}

      {subQuestions.length > 0 && (
        <div className="mt-4 w-full max-w-full min-w-0 space-y-3">
          {subQuestions.map((subQuestion, subIndex) => (
            <SubQuestionRenderer key={`${subIndex}-${getOptionalText(subQuestion?.question_no) || getOptionalText(subQuestion?.display_label) || getOptionalText(subQuestion?.label) || subIndex}`} subQuestion={subQuestion} index={subIndex} />
          ))}
        </div>
      )}
    </article>
  );
}

export default QuestionRenderer;