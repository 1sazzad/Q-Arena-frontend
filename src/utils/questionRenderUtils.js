export function hasRenderableQuestionText(item) {
  return Boolean(
    item && (
      item?.question_text ||
      item?.text ||
      item?.question ||
      item?.stem ||
      (Array.isArray(item?.sub_questions) && item.sub_questions.length > 0)
    )
  );
}

export function normalizeQuestionForRenderer(item, fallback = {}) {
  if (!item || typeof item !== "object") {
    return { question_text: String(item ?? "") };
  }

  return {
    ...item,
    question_no:
      item?.question_no ??
      item?.question_number ??
      item?.number ??
      fallback.question_no ??
      fallback.index,
    question_text:
      item?.question_text ??
      item?.text ??
      item?.question ??
      fallback.question_text ??
      "",
    marks:
      item?.marks ??
      item?.question_marks ??
      item?.total_marks ??
      fallback.marks ??
      null,
    exam_year:
      item?.exam_year ??
      item?.year ??
      fallback.exam_year ??
      fallback.year ??
      null,
    year:
      item?.year ??
      item?.exam_year ??
      fallback.year ??
      fallback.exam_year ??
      null,
    topic:
      item?.topic ?? fallback.topic ?? "",
    paper_type:
      item?.paper_type ?? fallback.paper_type ?? null,
    diagram_svg:
      item?.diagram_svg ?? item?.diagramSvg ?? fallback.diagram_svg ?? "",
    diagram_type:
      item?.diagram_type ?? fallback.diagram_type ?? "",
    diagram_description:
      item?.diagram_description ?? fallback.diagram_description ?? "",
    diagram_required:
      item?.diagram_required ?? fallback.diagram_required ?? false,
    table_data:
      item?.table_data ?? item?.tableData ?? fallback.table_data ?? null,
    sub_questions:
      item?.sub_questions ?? item?.subQuestions ?? fallback.sub_questions ?? [],
  };
}
