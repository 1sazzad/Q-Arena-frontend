import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiEndpoints } from "../api/api";
import { Badge, Button, Card, EmptyState, ErrorMessage, LoadingSpinner, PageHeader, ResponsiveContainer } from "../components/ui";
import QuestionRenderer from "../components/ui/QuestionRenderer";
import { hasRenderableQuestionText, normalizeQuestionForRenderer } from "../utils/questionRenderUtils";

function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [subjectCode, setSubjectCode] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Try to get subject_code from navigation state or query string
    let code = "";
    if (location.state && location.state.subject_code) {
      code = location.state.subject_code;
    } else if (location.state && location.state.subjectCode) {
      code = location.state.subjectCode;
    } else {
      const params = new URLSearchParams(location.search);
      code = params.get("subject_code") || params.get("subjectCode") || "";
    }

    if (!code) {
      setError("Please select a subject first.");
      setData(null);
      setSubjectCode("");
      return;
    }

    setSubjectCode(code);
    setLoading(true);
    setError("");

    apiEndpoints.getSubjectAnalysis(code)
      .then((response) => {
        setData(response.data || null);
        setError("");
      })
      .catch((err) => {
        setError(err?.message || "Failed to load analysis data.");
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [location.state, location.search]);

  if (loading) {
    return <LoadingSpinner label="Loading topic analysis..." />;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!data) {
    return <EmptyState title="No analysis data" description="Please select a subject to view topic analysis." />;
  }

  const {
    subject,
    summary,
    topics,
    topic_frequency,
    chapter_frequency,
    marks_distribution,
    year_wise_topic_trend,
    repeated_patterns,
  } = data;

  // Helper: filter out useless metadata
  const usefulMetadata = {};
  if (subject) {
    const keys = [
      "academic_level",
      "institution_name",
      "university_name",
      "board_name",
      "department_name",
      "program",
      "curriculum",
      "paper_type",
    ];
    keys.forEach((key) => {
      const val = subject[key];
      if (val && val !== "N/A" && val !== "" && val !== null && val !== undefined) {
        usefulMetadata[key] = val;
      }
    });
  }

  // Format year range
  function formatYearRange(range) {
    if (!range) return "N/A";
    // Example: 20172023 => 2017–2023
    if (/^\d{8}$/.test(range)) {
      return range.slice(0, 4) + "–" + range.slice(4);
    }
    return range;
  }

  // Priority label and reason
  function getPriorityLabel(freq, marks) {
    if (freq >= 5 || marks >= 30) return "Very High";
    if (freq >= 3) return "High";
    return "Medium";
  }

  function getPriorityReason(freq, yearsCount, marks) {
    return `Repeated ${freq} times across ${yearsCount} year${yearsCount > 1 ? "s" : ""} with ${marks} total marks.`;
  }

  // Friendly question type labels
  const questionTypeLabels = {
    calculation: "Calculation",
    definition: "Definition",
    proof: "Proof",
    difference: "Difference",
    graph_or_table: "Graph/Table",
    estimation: "Estimation",
    general: "General",
  };

  // Render subject header
  function renderHeader() {
    const code = subject?.subject_code || subjectCode;
    const name = subject?.subject_name;
    return (
      <PageHeader
        eyebrow="Question Pattern Analysis"
        title={`Question Pattern Analysis`}
        description={`Find repeated chapters, common question types, and study priorities.`}
        extra={
          <div className="mt-2 text-sm text-slate-600">
            {code} {name && name !== "N/A" && name !== "" ? `- ${name}` : ""}
          </div>
        }
      />
    );
  }

  // Render useful metadata
  function renderSubjectMetadata() {
    if (!subject) return null;
    if (Object.keys(usefulMetadata).length === 0) return null;

    return (
      <Card>
        <h2 className="text-xl font-semibold mb-2">Subject Metadata</h2>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {usefulMetadata.academic_level && (
            <div>
              <dt className="font-semibold">Academic Level</dt>
              <dd>{usefulMetadata.academic_level}</dd>
            </div>
          )}
          {(usefulMetadata.institution_name || usefulMetadata.university_name || usefulMetadata.board_name) && (
            <div>
              <dt className="font-semibold">Institution</dt>
              <dd>{usefulMetadata.institution_name || usefulMetadata.university_name || usefulMetadata.board_name}</dd>
            </div>
          )}
          {usefulMetadata.department_name && (
            <div>
              <dt className="font-semibold">Department</dt>
              <dd>{usefulMetadata.department_name}</dd>
            </div>
          )}
          {usefulMetadata.program && (
            <div>
              <dt className="font-semibold">Program</dt>
              <dd>{usefulMetadata.program}</dd>
            </div>
          )}
          {usefulMetadata.curriculum && (
            <div>
              <dt className="font-semibold">Curriculum</dt>
              <dd>{usefulMetadata.curriculum}</dd>
            </div>
          )}
          {usefulMetadata.paper_type && (
            <div>
              <dt className="font-semibold">Paper Type</dt>
              <dd>{usefulMetadata.paper_type}</dd>
            </div>
          )}
        </dl>
      </Card>
    );
  }

  // Render summary cards
  function renderSummaryCards() {
    if (!summary) return null;

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-6">
        <Card>
          <p className="text-sm text-slate-500">Total Questions</p>
          <p className="text-2xl font-semibold">{summary.total_questions ?? "N/A"}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Years Analyzed</p>
          <p className="text-2xl font-semibold">
            {Array.isArray(summary.available_years) && summary.available_years.length > 0
              ? summary.available_years.join(", ")
              : "N/A"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Most Repeated Topic</p>
          <p className="text-2xl font-semibold">{summary.most_repeated_topic ?? "N/A"}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Highest Marks Topic</p>
          <p className="text-2xl font-semibold">{summary.highest_marks_topic ?? "N/A"}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Most Common Question Type</p>
          <p className="text-2xl font-semibold">{summary.most_common_question_type ?? "N/A"}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total Marks</p>
          <p className="text-2xl font-semibold">{summary.total_marks ?? "N/A"}</p>
        </Card>
      </div>
    );
  }

  // Recommended Study Priority section
  function renderRecommendedStudyPriority() {
    // Use chapter_frequency first, fallback to topic_frequency, fallback to topics
    let freqData = [];
    if (Array.isArray(chapter_frequency) && chapter_frequency.length > 0) {
      freqData = chapter_frequency;
    } else if (Array.isArray(topic_frequency) && topic_frequency.length > 0) {
      freqData = topic_frequency;
    } else if (Array.isArray(topics) && topics.length > 0) {
      freqData = topics;
    }

    if (!freqData || freqData.length === 0) {
      return <EmptyState title="No topic frequency data available yet." />;
    }

    // Sort by frequency desc
    freqData.sort((a, b) => (b.frequency ?? b.count ?? 0) - (a.frequency ?? a.count ?? 0));

    const topItems = freqData.slice(0, 8);

    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">Recommended Study Priority</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-1 text-left">Rank</th>
              <th className="border border-slate-300 px-3 py-1 text-left">Topic / Chapter</th>
              <th className="border border-slate-300 px-3 py-1 text-right">Frequency</th>
              <th className="border border-slate-300 px-3 py-1 text-right">Total Marks</th>
              <th className="border border-slate-300 px-3 py-1 text-right">Years Appeared</th>
              <th className="border border-slate-300 px-3 py-1 text-left">Priority</th>
              <th className="border border-slate-300 px-3 py-1 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {topItems.map((item, idx) => {
              const freq = item.frequency ?? item.count ?? 0;
              const marks = item.total_marks ?? item.marks ?? 0;
              const yearsCount = Array.isArray(item.years) ? item.years.length : 0;
              const priority = getPriorityLabel(freq, marks);
              const reason = getPriorityReason(freq, yearsCount, marks);
              const name = item.chapter || item.topic || item.name || "-";

              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="border border-slate-300 px-3 py-1">{idx + 1}</td>
                  <td className="border border-slate-300 px-3 py-1">{name}</td>
                  <td className="border border-slate-300 px-3 py-1 text-right">{freq}</td>
                  <td className="border border-slate-300 px-3 py-1 text-right">{marks}</td>
                  <td className="border border-slate-300 px-3 py-1 text-right">{yearsCount}</td>
                  <td className="border border-slate-300 px-3 py-1">
                    <Badge variant={priority === "Very High" ? "danger" : priority === "High" ? "warning" : "secondary"}>
                      {priority}
                    </Badge>
                  </td>
                  <td className="border border-slate-300 px-3 py-1 text-sm italic">{reason}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </Card>
    );
  }

  // Repeated Question Patterns cards
  function renderRepeatedPatterns() {
    if (!repeated_patterns || repeated_patterns.length === 0) {
      return <EmptyState title="No repeated patterns found yet." />;
    }

    // Sort by frequency desc
    const sortedPatterns = [...repeated_patterns].sort((a, b) => (b.frequency ?? b.count ?? 0) - (a.frequency ?? a.count ?? 0));
    const topPatterns = sortedPatterns.slice(0, 10);

    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">Repeated Question Patterns</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {topPatterns.map((item, idx) => {
            const qType = questionTypeLabels[item.question_type] || item.question_type || "-";
            const examples = Array.isArray(item.example_questions) && item.example_questions.length > 0 ? item.example_questions : null;

            return (
              <Card key={idx} className="p-4">
                <h3 className="font-semibold mb-1">{item.pattern_label || "-"}</h3>
                <p><strong>Topic:</strong> {item.topic || "-"}</p>
                <p><strong>Question Type:</strong> {qType}</p>
                <p><strong>Frequency:</strong> {item.frequency ?? item.count ?? "-"}</p>
                <p><strong>Years:</strong> {Array.isArray(item.years) ? item.years.join(", ") : "-"}</p>
                {examples && (
                  <>
                    <p><strong>Examples:</strong></p>
                    <ul className="list-disc list-inside text-sm">
                      {examples.map((ex, i) => (
                        <li key={i}>{typeof ex === "object" ? (
                          hasRenderableQuestionText(ex) ? (
                            <QuestionRenderer question={normalizeQuestionForRenderer(ex)} index={i} />
                          ) : (
                            String(ex)
                          )
                        ) : (
                          ex
                        )}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      </Card>
    );
  }

  // Marks Distribution compact
  function renderMarksDistribution() {
    if (!marks_distribution || marks_distribution.length === 0) {
      return <EmptyState title="No marks distribution available yet." />;
    }

    // Sort descending by question_count
    const sortedMarks = [...marks_distribution].sort((a, b) => (b.question_count ?? b.count ?? 0) - (a.question_count ?? a.count ?? 0));
    const topMarks = sortedMarks.slice(0, 5);

    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">Marks Distribution</h2>
        <ul>
          {topMarks.map((item, idx) => (
            <li key={idx} className="mb-1">
              <strong>{item.marks ?? "-"} marks</strong> — {item.question_count ?? item.count ?? "-"} questions
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  // Year-wise Trend compact groups
  function renderYearWiseTopicTrend() {
    if (!Array.isArray(year_wise_topic_trend) || year_wise_topic_trend.length === 0) {
      return <EmptyState title="No year-wise trend data available yet." />;
    }
    const topicMap = {};
    year_wise_topic_trend.forEach((item) => {
      const topic = item.topic || "Unknown";
      const year = item.year;
      if (!topicMap[topic]) {
        topicMap[topic] = {
          topic,
          years: new Set(),
          totalMarks: 0,
          frequency: 0,
        };
      }
      if (year) {
        topicMap[topic].years.add(year);
      }
      topicMap[topic].totalMarks += Number(item.total_marks || 0);
      topicMap[topic].frequency += Number(item.frequency || 0);
    });
    const groupedTopics = Object.values(topicMap)
      .map((item) => ({
        ...item,
        years: Array.from(item.years).sort(),
        yearCount: item.years.size,
      }))
      .sort((a, b) => b.yearCount - a.yearCount || b.frequency - a.frequency);
    const appearsManyYears = groupedTopics.slice(0, 5);
    const latestYear = Math.max(
      ...year_wise_topic_trend
        .map((item) => Number(item.year))
        .filter(Boolean)
    );
    const recentTopics = year_wise_topic_trend
      .filter((item) => Number(item.year) === latestYear)
      .slice(0, 5);
    const oneTimeTopics = groupedTopics
      .filter((item) => item.yearCount === 1)
      .slice(0, 5);

    return (
      <Card>
        <h2 className="mb-4 text-xl font-semibold text-slate-950">Year-wise Topic Trend</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-slate-900">Appears in many years</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {appearsManyYears.map((item) => (
                <li key={item.topic}>
                  <span className="font-medium text-slate-900">{item.topic}</span>
                  <br />
                  {item.yearCount} year(s): {item.years.join(", ")}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Recent topics {latestYear ? `(${latestYear})` : ""}</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {recentTopics.map((item, index) => (
                <li key={`${item.topic}-${index}`}>  
                  <span className="font-medium text-slate-900">{item.topic}</span>
                  <br />
                  Frequency: {item.frequency || 0}, Marks: {item.total_marks || 0}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">One-time topics</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {oneTimeTopics.map((item) => (
                <li key={item.topic}>
                  <span className="font-medium text-slate-900">{item.topic}</span>
                  <br />
                  Year: {item.years.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <ResponsiveContainer>
      {renderHeader()}
      {renderSubjectMetadata()}
      {renderSummaryCards()}
      {renderRecommendedStudyPriority()}
      {renderRepeatedPatterns()}
      {renderMarksDistribution()}
      {renderYearWiseTopicTrend()}
    </ResponsiveContainer>
  );
}

export default AnalysisPage;

