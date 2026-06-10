export const demoSubjectOverview = {
  subjectCode: "DEMO-101",
  subjectName: "Sample Exam Subject",
  department: "Computer Science",
  program: "Demo Preview",
  stats: [
    { label: "Topics found", value: "24" },
    { label: "Years analysed", value: "5" },
    { label: "Question matches", value: "86" },
  ],
  topTopics: ["Repeated topic patterns", "High-mark chapters", "Short question trends"],
};

export const demoPatternAnalysis = {
  stats: [
    { label: "Total questions", value: "86" },
    { label: "Years analysed", value: "2020–2024" },
    { label: "Most repeated topic", value: "Core topic patterns" },
    { label: "Total marks tracked", value: "448" },
  ],
  priorityRows: [
    { rank: 1, topic: "Topic Pattern A", frequency: 6, marks: 38, priority: "Very High" },
    { rank: 2, topic: "Topic Pattern B", frequency: 5, marks: 32, priority: "High" },
    { rank: 3, topic: "Topic Pattern C", frequency: 4, marks: 25, priority: "High" },
  ],
  repeatedPatterns: [
    { title: "Repeated definition-style questions", frequency: 5, years: "Appears across multiple years" },
    { title: "Calculation-style questions", frequency: 4, years: "Common in recent exams" },
  ],
};

export const demoPredictions = [
  {
    rank: 1,
    topic: "High-priority repeated topic",
    confidence: 92,
    importance: "Very important",
    reason: "Repeated across multiple years with strong marks weight.",
  },
  {
    rank: 2,
    topic: "Frequently tested chapter",
    confidence: 84,
    importance: "Important",
    reason: "Appears often in previous-year question patterns.",
  },
  {
    rank: 3,
    topic: "Common short-question area",
    confidence: 76,
    importance: "Important",
    reason: "Useful for focused revision and quick marks.",
  },
];

export const unlockBenefits = [
  "Full subject dashboard",
  "Smart prediction report",
  "Previous question list",
  "PDF export",
  "AI answer support",
  "Saved profile and subjects",
];

export default {
  demoSubjectOverview,
  demoPatternAnalysis,
  demoPredictions,
  unlockBenefits,
};
