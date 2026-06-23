const toArray = (value) => {
if (Array.isArray(value)) return value;
return [];
};

const cleanText = (value) => {
if (value === null || value === undefined) return "";
return String(value).trim();
};

const firstValue = (...values) => {
for (const value of values) {
if (value !== null && value !== undefined && value !== "") {
return value;
}
}

return "";
};

const toNumber = (value, fallback = 0) => {
const number = Number(value);
return Number.isFinite(number) ? number : fallback;
};

const normalizePercent = (value) => {
const number = toNumber(value, 0);

if (number > 0 && number <= 1) {
return Math.round(number * 100);
}

return Math.max(0, Math.min(100, Math.round(number)));
};

const normalizePriority = (value, confidence = 0) => {
const label = cleanText(value).toLowerCase();

if (label.includes("high")) return "High";
if (label.includes("medium")) return "Medium";
if (label.includes("moderate")) return "Medium";
if (label.includes("low")) return "Low";

if (confidence >= 70) return "High";
if (confidence >= 40) return "Medium";

return "Low";
};

const unwrapQuestion = (item) => {
if (!item || typeof item !== "object") return {};

if (item.question && typeof item.question === "object") {
return {
...item,
...item.question,
};
}

if (item.source_question && typeof item.source_question === "object") {
return {
...item,
...item.source_question,
};
}

if (item.related_question && typeof item.related_question === "object") {
return {
...item,
...item.related_question,
};
}

return item;
};

const normalizeQuestion = (item, index = 0) => {
const question = unwrapQuestion(item);

const questionText = firstValue(
question.question_text_clean,
question.question_text,
question.description,
question.text,
typeof question.question === "string" ? question.question : "",
);

return {
...question,
id: firstValue(question.id, question.question_id, `evidence-${index}`),
question_id: firstValue(question.question_id, question.id, `evidence-${index}`),
question_no: firstValue(
question.question_no,
question.questionNo,
question.question_number,
question.number,
question.no,
),
question_text: questionText,
question_text_clean: firstValue(question.question_text_clean, questionText),
marks: firstValue(question.marks, question.total_marks, question.mark),
exam_year: firstValue(question.exam_year, question.year),
paper_type: firstValue(question.paper_type, question.paperType),
subject_code: firstValue(question.subject_code, question.subjectCode),
subject_name: firstValue(question.subject_name, question.subjectName),
topic: firstValue(question.topic, question.predicted_topic),
sub_questions: toArray(question.sub_questions),
table_data: question.table_data || null,
diagram_svg: question.diagram_svg || "",
diagram_type: question.diagram_type || "",
diagram_description: question.diagram_description || "",
};
};

const getPredictionItems = (payload) => {
if (Array.isArray(payload)) return payload;

return toArray(
payload?.items?.length
? payload.items
: payload?.predictions?.length
? payload.predictions
: payload?.data?.items?.length
? payload.data.items
: payload?.data?.predictions,
);
};

const normalizeTopic = (item, index = 0) => {
const confidence = normalizePercent(
firstValue(
item.confidence_score,
item.confidence,
item.score,
item.prediction_score,
),
);

const evidenceSource = toArray(
item.related_questions?.length
? item.related_questions
: item.relatedQuestions?.length
? item.relatedQuestions
: item.evidence?.length
? item.evidence
: item.questions?.length
? item.questions
: item.previous_questions,
);

const evidence = evidenceSource
.map((question, questionIndex) => normalizeQuestion(question, questionIndex))
.filter((question) => {
return (
question.question_text ||
question.question_text_clean ||
question.id ||
question.question_no
);
});

const topicName = cleanText(
firstValue(
item.predicted_topic,
item.topic,
item.name,
item.title,
`Predicted Topic ${index + 1}`,
),
);

const priority = normalizePriority(
firstValue(item.chance_label, item.priority, item.level),
confidence,
);

return {
id: firstValue(item.id, item.topic_id, `${topicName}-${index}`),
topic: topicName,
predictedTopic: topicName,
confidence,
priority,
reason: cleanText(firstValue(item.reason, item.explanation, item.summary)),
chanceLabel: cleanText(firstValue(item.chance_label, priority)),
scoreBreakdown: item.score_breakdown || {},
recommendedPracticeTypes: toArray(item.recommended_practice_types),
evidence,
relatedQuestions: evidence,
};
};

const getPastExamYears = (topics) => {
const years = new Set();

topics.forEach((topic) => {
topic.evidence.forEach((question) => {
const year = cleanText(firstValue(question.exam_year, question.year));
if (year) years.add(year);
});
});

return years.size;
};

export const normalizePredictionResponse = (payload) => {
const items = getPredictionItems(payload);
const topics = items.map((item, index) => normalizeTopic(item, index));

const allQuestions = topics.flatMap((topic) => topic.evidence);
const confidence =
topics.length > 0
? Math.round(
topics.reduce((sum, topic) => sum + toNumber(topic.confidence, 0), 0) /
topics.length,
)
: 0;

return {
success: Boolean(payload?.success ?? topics.length),
subjectCode: cleanText(firstValue(payload?.subject_code, payload?.subjectCode)),
subjectId: firstValue(payload?.subject_id, payload?.subjectId, null),
subjectName: cleanText(firstValue(payload?.subject_name, payload?.subjectName, "Selected Subject")),
message: cleanText(payload?.message),
pendingReviewCount: toNumber(payload?.pending_review_count, 0),
topics,
allQuestions,
summary: {
confidence,
predictedTopics: topics.length,
predictedQuestions: allQuestions.length,
highPriorityTopics: topics.filter((topic) => topic.priority === "High").length,
pastExamsUsed: getPastExamYears(topics),
},
};
};

export const filterPredictionTopics = (topics, filters = {}) => {
const search = cleanText(filters.search).toLowerCase();
const priority = cleanText(filters.priority);
const evidenceRange = cleanText(filters.evidenceRange);

return toArray(topics).filter((topic) => {
if (priority && priority !== "all" && topic.priority !== priority) {
return false;
}


if (search) {
  const searchableText = [
    topic.topic,
    topic.reason,
    ...topic.evidence.map((question) =>
      [
        question.question_text,
        question.question_text_clean,
        question.topic,
        question.exam_year,
        question.question_no,
      ].join(" "),
    ),
  ]
    .join(" ")
    .toLowerCase();

  if (!searchableText.includes(search)) {
    return false;
  }
}

if (evidenceRange && evidenceRange !== "all") {
  const years = topic.evidence
    .map((question) => Number(question.exam_year || question.year))
    .filter(Number.isFinite);

  if (years.length === 0) return true;

  const latestYear = Math.max(...years);

  if (evidenceRange === "recent") {
    return years.some((year) => year === latestYear);
  }

  if (evidenceRange === "previous") {
    return years.some((year) => year < latestYear);
  }
}

return true;


});
};
