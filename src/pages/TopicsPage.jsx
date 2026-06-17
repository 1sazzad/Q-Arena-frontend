import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiEndpoints } from "../api/api";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card, DiagramRenderer, EmptyState, ErrorMessage, LoadingSpinner, PageHeader, PaperTypeSelector, QuestionExtras, ResponsiveContainer } from "../components/ui";
import QuestionRenderer from "../components/ui/QuestionRenderer";
import { hasRenderableQuestionText, normalizeQuestionForRenderer } from "../utils/questionRenderUtils";
import { buildSubjectScopeParams, getAcademicProfileSignature, isSecondaryAcademicProfile } from "../utils/academicProfile";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";
import { getDefaultPaperType, normalizeSupportedPaperTypes } from "../utils/paperTypes";

const PAPER_TYPE_OPTIONS = ["CQ", "MCQ", "WRITTEN"];

function isSecondarySubject(subject) {
  const academicLevel = String(subject?.academic_level || "").trim().toUpperCase();
  return academicLevel === "SSC" || academicLevel === "HSC";
}

function getPaperTypeOptions(subject, user) {
  if (!isSecondaryAcademicProfile(user) && !isSecondarySubject(subject)) {
    return [];
  }

  const supportedTypes = normalizeSupportedPaperTypes(subject?.supported_paper_types);
  return supportedTypes.length > 0 ? supportedTypes : PAPER_TYPE_OPTIONS;
}

function extractTopics(analysis) {
  return analysis?.topics || analysis?.analysis || analysis?.repeated_topics || [];
}

function getAnalysisMessage(payload, fallback) {
  if (payload?.message) {
    return payload.message;
  }

  if (payload?.pending_review_count > 0) {
    return `No approved topics yet. ${payload.pending_review_count} topic review item(s) are pending approval.`;
  }

  return fallback;
}

function getQuestionText(question) {
  if (!question) {
    return "";
  }

  if (typeof question === "string") {
    return question;
  }

  if (typeof question === "object") {
    return question.question_text || question.text || question.question || question.title || "";
  }

  return String(question);
}

function formatAppearedYears(value) {
  const rawValue = Array.isArray(value) ? value.join(", ") : String(value ?? "").trim();

  if (!rawValue) {
    return "N/A";
  }

  const compactDigits = rawValue.replace(/\s+/g, "");
  if (/^\d+$/.test(compactDigits) && compactDigits.length > 4 && compactDigits.length % 4 === 0) {
    return compactDigits.match(/.{1,4}/g).join(", ");
  }

  return rawValue
    .split(/[,|/]+/)
    .map((year) => year.trim())
    .filter(Boolean)
    .join(", ");
}

function TopicsPage() {
  const [subjects, setSubjects] = useState([]);
  const { user } = useAuth();
  const location = useLocation();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [selectedPaperType, setSelectedPaperType] = useState("CQ");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const initialSubjectCode = String(location.state?.subject_code || "").trim();
  const academicProfileSignature = getAcademicProfileSignature(user);

  const loadAnalysisData = useCallback(async (subjectCode, paperType, subjectOverride = null) => {
    const subject = subjectOverride || subjects.find((item) => item.subject_code === subjectCode) || null;
    const paperTypeOptions = getPaperTypeOptions(subject, user);

    if (paperTypeOptions.length > 0) {
      const selectedType = paperTypeOptions.includes(paperType) ? paperType : getDefaultPaperType(paperTypeOptions);

      if (!selectedType) {
        throw new Error("Please select CQ, MCQ, or WRITTEN before loading.");
      }

      return apiEndpoints.getSubjectAnalysis(subjectCode, { paperType: selectedType });
    }

    return apiEndpoints.getSubjectAnalysis(subjectCode);
  }, [subjects, user]);

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

        const subjectCode = initialSubjectCode || subjectList[0]?.subject_code || "";

        if (!subjectCode) {
          setMessage("Subject list is unavailable. Enter a subject code manually to load analysis.");
          return;
        }

        setSelectedSubject(subjectCode);

        try {
          const nextSubject = subjectList.find((subject) => subject.subject_code === subjectCode) || null;
          const nextPaperType = getDefaultPaperType(getPaperTypeOptions(nextSubject, user));
          setSelectedPaperType(nextPaperType || "CQ");
          const analysisResponse = await loadAnalysisData(subjectCode, nextPaperType, nextSubject);
          if (active) {
            setAnalysis(analysisResponse.data);
            setMessage(extractTopics(analysisResponse.data).length === 0 ? getAnalysisMessage(analysisResponse.data, "") : "");
          }
        } catch (error) {
          console.error(error);
          if (active) {
            setAnalysis(null);
            setMessage(error.response?.data?.detail || "Subjects loaded, but analysis data could not be loaded for the selected subject.");
          }
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setSubjects([]);
          setMessage("Subject list could not be loaded. Enter a subject code manually.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [academicProfileSignature, initialSubjectCode, loadAnalysisData, user]);

  async function handleSubjectChange(event) {
    const subjectCode = event.target.value;
    setSelectedSubject(subjectCode);

    if (!subjectCode) {
      setAnalysis(null);
      return;
    }

    const nextSubject = subjects.find((subject) => subject.subject_code === subjectCode) || null;
    const nextPaperType = getDefaultPaperType(getPaperTypeOptions(nextSubject, user));
    setSelectedPaperType(nextPaperType || "CQ");

    setLoading(true);
    setMessage("");

    try {
      const response = await loadAnalysisData(subjectCode, nextPaperType, nextSubject);
      setAnalysis(response.data);
      setMessage(extractTopics(response.data).length === 0 ? getAnalysisMessage(response.data, "") : "");
    } catch (error) {
      console.error(error);
      setAnalysis(null);
      setMessage(error.response?.data?.detail || "Unable to load analysis for this subject.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubjectInputChange(event) {
    setSelectedSubject(event.target.value);
    setMessage("");
  }

  async function handleLoadAnalysis() {
    if (!selectedSubject.trim()) {
      setMessage("Enter a subject code first.");
      return;
    }

    const currentSubject = subjects.find((subject) => subject.subject_code === selectedSubject) || null;
    const paperTypeOptions = getPaperTypeOptions(currentSubject, user);
    const resolvedPaperType = paperTypeOptions.length > 0
      ? (paperTypeOptions.includes(selectedPaperType) ? selectedPaperType : getDefaultPaperType(paperTypeOptions))
      : "";

    if (paperTypeOptions.length > 0 && !resolvedPaperType) {
      setMessage("Please select CQ, MCQ, or WRITTEN before loading.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await loadAnalysisData(selectedSubject.trim(), resolvedPaperType, currentSubject);
      setAnalysis(response.data);
      setMessage(extractTopics(response.data).length === 0 ? getAnalysisMessage(response.data, "") : "");
    } catch (error) {
      console.error(error);
      setAnalysis(null);
      setMessage(error.response?.data?.detail || "Unable to load analysis for this subject.");
    } finally {
      setLoading(false);
    }
  }

  function handlePaperTypeChange(nextPaperType) {
    setSelectedPaperType(nextPaperType);
    setMessage("");
  }

  const topicEntries = extractTopics(analysis);
  const currentSubject = subjects.find((subject) => subject.subject_code === selectedSubject) || null;
  const paperTypeOptions = getPaperTypeOptions(currentSubject, user);
  const showPaperSelector = paperTypeOptions.length > 0;

  if (loading) {
    return <LoadingSpinner label="Loading analysis..." />;
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        eyebrow="Subject analysis"
        title="Understand repeated topics and exam patterns"
        description="View frequency, marks, appeared years, and sample questions for one subject."
        actions={<Button onClick={() => navigate("/predictions", { state: { subject_code: selectedSubject } })}>View predictions</Button>}
      />

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Choose a subject</h2>
              <p className="mt-1 text-sm text-slate-500">Select a subject code to load the analysis response.</p>
            </div>

            <div className="w-full lg:max-w-md">
              <label className="block text-sm font-medium text-slate-700">Subject code</label>
              {subjects.length > 0 ? (
                <select
                  value={selectedSubject}
                  onChange={handleSubjectChange}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id || subject.subject_code} value={subject.subject_code}>
                      {formatSubjectLabel(subject)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={selectedSubject}
                  onChange={handleSubjectInputChange}
                  placeholder="Enter subject code, e.g. CSE-421"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              )}
              {showPaperSelector && (
                <div className="mt-3">
                  <PaperTypeSelector
                    availableTypes={paperTypeOptions}
                    value={selectedPaperType}
                    onChange={handlePaperTypeChange}
                    disabled={loading}
                  />
                </div>
              )}
              <Button type="button" onClick={handleLoadAnalysis} className="mt-3 w-full">
                Load analysis
              </Button>
            </div>
          </div>
        </Card>

        <ErrorMessage>{message}</ErrorMessage>

        {analysis ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Topic frequency</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Most repeated topics</h2>
                </div>
                <Badge>{selectedSubject}</Badge>
              </div>

              <div className="mt-5 space-y-3">
                {topicEntries.length > 0 ? (
                  topicEntries.map((topic, index) => (
                    <article key={topic.topic || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="break-words font-semibold text-slate-950">{topic.topic || topic.name || `Topic ${index + 1}`}</h3>
                        <Badge tone="indigo">{topic.frequency ?? topic.count ?? topic.score ?? "-"}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Appeared years: {formatAppearedYears(topic.appeared_years ?? topic.years)}
                      </p>
                      <p className="text-sm text-slate-600">Total marks: {topic.total_marks ?? topic.marks ?? "N/A"}</p>
                      {topic.probability && <p className="text-sm text-slate-600">Probability: {topic.probability}</p>}
                      {Array.isArray(topic.important_questions) && topic.important_questions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-900">Important questions</p>
                                                    {topic.important_questions.slice(0, 3).map((question, questionIndex) => (
                            hasRenderableQuestionText(question) ? (
                              <QuestionRenderer key={question.id || questionIndex} question={normalizeQuestionForRenderer(question, { index: questionIndex })} index={questionIndex} />
                            ) : (
                              <div key={question.id || questionIndex} className="rounded-2xl bg-white px-3 py-2 text-sm leading-6 text-slate-700">
                                <p className="whitespace-pre-line break-words">{getQuestionText(question)}</p>
                                <DiagramRenderer question={question} />
                                <QuestionExtras item={question} />
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <EmptyState title="No topic summary returned" description="This subject may need approved topic analysis before a frequency summary is available." />
                )}
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Analysis snapshot</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Subject summary</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Subject code</p>
                  <p className="mt-1 font-semibold text-slate-950">{analysis.subject_code || selectedSubject}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Subject name</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {analysis.subject_name || subjects.find((subject) => subject.subject_code === selectedSubject)?.subject_name || "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total questions</p>
                  <p className="mt-1 font-semibold text-slate-950">{analysis.total_questions ?? analysis.question_count ?? "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Repeated topics</p>
                  <p className="mt-1 font-semibold text-slate-950">{topicEntries.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Pending review</p>
                  <p className="mt-1 font-semibold text-slate-950">{analysis.pending_review_count ?? 0}</p>
                </div>
              </div>

              {analysis.message && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {analysis.message}
                </p>
              )}

              {Array.isArray(analysis.sample_questions) && analysis.sample_questions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Sample questions</h3>
                  <div className="mt-3 space-y-2">
                                        {analysis.sample_questions.map((question, index) => (
                      hasRenderableQuestionText(question) ? (
                        <QuestionRenderer key={index} question={normalizeQuestionForRenderer(question, { index })} index={index} />
                      ) : (
                        <div key={index} className="break-words rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                          {getQuestionText(question)}
                          <DiagramRenderer question={question} />
                          <QuestionExtras item={question} />
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <EmptyState title="No analysis data available yet" description="Choose a subject and load analysis to review repeated topics." />
        )}
    </ResponsiveContainer>
  );
}

export default TopicsPage;

// topics page