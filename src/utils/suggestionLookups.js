export const MAX_SUGGESTION_QUERY_LENGTH = 160;
export const MAX_SUGGESTION_TOP_K = 50;

const SUGGESTION_ITEM_KEYS = [
  "question_text",
  "question",
  "questionText",
  "text",
  "title",
  "prompt",
  "suggestion",
  "suggestionText",
  "predicted_question",
  "predictedQuestion",
  "predicted_topic",
];

const SUGGESTION_TOPIC_KEYS = ["topic", "final_topic", "suggested_topic", "predicted_topic", "predictedTopic", "name"];
const SUGGESTION_MARK_KEYS = ["marks", "total_marks", "expected_marks", "question_marks"];
const SUGGESTION_SCORE_KEYS = [
  "prediction_score",
  "predictionScore",
  "confidence_score",
  "confidenceScore",
  "confidence",
  "score",
  "matchPercent",
  "importance_score",
  "importance",
  "probability_score",
  "probability",
  "frequency",
];

function toTrimmedString(value) {
  return String(value ?? "").trim();
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function pickFirstText(item, keys, fallback = "") {
  for (const key of keys) {
    const value = item?.[key];
    const text = toTrimmedString(value);
    if (text) {
      return text;
    }
  }

  return fallback;
}

function pickFirstValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function getArrayCandidate(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return null;
}

function getSuggestionEntries(payload, preferredKeys = ["suggestions", "items", "probable_questions"]) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of preferredKeys) {
    const directArray = getArrayCandidate(payload[key]);
    if (directArray) {
      return directArray;
    }
  }

  const nestedCandidates = [
    payload.data,
    payload.results,
    payload.questions,
    payload.data?.suggestions,
    payload.data?.items,
    payload.data?.probable_questions,
    payload.data?.retrieved_context,
    payload.data?.most_repeated_topics,
    payload.data?.evidence,
    payload.data?.warnings,
    payload.data?.warning,
    payload.data?.note,
    payload.data?.prediction_data_available,
    payload.data?.exam_years_analyzed,
    payload.data?.total_questions_analyzed,
  ];

  for (const candidate of nestedCandidates) {
    const arrayValue = getArrayCandidate(candidate);
    if (arrayValue) {
      return arrayValue;
    }
  }

  return [];
}

export function normalizeSuggestionQuery(query, maxLength = MAX_SUGGESTION_QUERY_LENGTH) {
  const safeMaxLength = Number.isFinite(Number(maxLength)) && Number(maxLength) > 0
    ? Number(maxLength)
    : MAX_SUGGESTION_QUERY_LENGTH;

  return toTrimmedString(query).replace(/\s+/g, " ").slice(0, safeMaxLength);
}

export function normalizeSuggestionTopK(value, maxTopK = MAX_SUGGESTION_TOP_K, fallback = 10) {
  const safeMaxTopK = Number.isFinite(Number(maxTopK)) && Number(maxTopK) > 0
    ? Number(maxTopK)
    : MAX_SUGGESTION_TOP_K;
  const safeFallback = Number.isFinite(Number(fallback)) && Number(fallback) > 0
    ? Math.floor(Number(fallback))
    : 10;
  const numericValue = Math.floor(Number(value));

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return Math.min(safeFallback, safeMaxTopK);
  }

  return Math.min(numericValue, safeMaxTopK);
}

export function normalizeSuggestionScore(value) {
  const numericValue = toFiniteNumber(value);

  if (numericValue === null) {
    return null;
  }

  return numericValue <= 1 ? numericValue * 100 : numericValue;
}

export function normalizeSuggestionYear(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toTrimmedString(item)).filter(Boolean).join(", ") || null;
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const numericValue = toFiniteNumber(value);
  if (numericValue !== null) {
    return numericValue;
  }

  const text = toTrimmedString(value);
  return text || null;
}

export function normalizeSuggestionItem(item = {}) {
  const questionText = pickFirstText(item, SUGGESTION_ITEM_KEYS, "Suggested question");
  const topic = pickFirstText(item, SUGGESTION_TOPIC_KEYS, "");
  const questionId = pickFirstValue(item, ["question_id", "questionId", "id"]);
  const marks = pickFirstValue(item, SUGGESTION_MARK_KEYS);
  const year = normalizeSuggestionYear(pickFirstValue(item, ["year", "exam_year", "source_years", "years"]));
  const predictionScore = normalizeSuggestionScore(pickFirstValue(item, SUGGESTION_SCORE_KEYS));

  return {
    ...item,
    question_id: questionId,
    question_text: questionText,
    topic,
    marks: marks === null ? null : marks,
    year,
    prediction_score: predictionScore,
  };
}

function flattenImportantQuestionsFromTopics(topics) {
  if (!Array.isArray(topics)) return [];

  return topics.flatMap((topicItem) => {
    const importantQuestions = Array.isArray(topicItem?.important_questions)
      ? topicItem.important_questions
      : [];

    return importantQuestions.map((question) => ({
      ...question,
      topic: question.topic || topicItem.topic || "",
      frequency: question.frequency ?? topicItem.frequency,
      total_marks: question.total_marks ?? topicItem.total_marks,
      years_appeared: question.years_appeared || topicItem.appeared_years || topicItem.years || [],
      probability: question.probability || topicItem.probability,
      importance: question.importance || topicItem.importance,
      source: "most_repeated_topics",
    }));
  });
}

export function normalizeSuggestionResponse(payload) {
  // Prefer richer question sources when available: probable_questions, retrieved_context, items, suggestions
  const suggestions = getSuggestionEntries(payload, ["probable_questions", "retrieved_context", "items", "suggestions"]);
  if (Array.isArray(suggestions) && suggestions.length > 0) {
    return suggestions.map(normalizeSuggestionItem);
  }

  // fallback to important_questions inside most_repeated_topics
  const mostRepeatedTopics = payload?.most_repeated_topics || payload?.data?.most_repeated_topics || [];
  const fallbackQuestions = flattenImportantQuestionsFromTopics(mostRepeatedTopics);
  if (fallbackQuestions.length > 0) {
    return fallbackQuestions.map(normalizeSuggestionItem);
  }

  return [];
}

export function normalizePredictionResponse(payload) {
  return getSuggestionEntries(payload, ["items", "predictions", "suggestions"]).map(normalizeSuggestionItem);
}

export function formatSuggestionScore(value) {
  const normalizedScore = normalizeSuggestionScore(value);
  return normalizedScore === null ? "-" : `${normalizedScore.toFixed(1)}%`;
}
