import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../context/useAuth";
import QuestionRenderer from "../components/ui/QuestionRenderer";

import { apiEndpoints } from "../api/api";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge, Button, Card, DiagramRenderer, EmptyState, ErrorMessage, LoadingSpinner, PageHeader, PaperTypeSelector, QuestionExtras, ResponsiveContainer } from "../components/ui";
import { getApiErrorMessage } from "../utils/auth";
import { buildSubjectScopeParams, getAcademicProfileSignature, isSecondaryAcademicProfile } from "../utils/academicProfile";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";
import { getDefaultPaperType, normalizeSupportedPaperTypes } from "../utils/paperTypes";
import { formatSuggestionScore, normalizePredictionResponse, normalizeSuggestionScore } from "../utils/suggestionLookups";

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

function normalizePredictions(payload) {
  return normalizePredictionResponse(payload);
}

function getPredictionMessage(payload, fallback) {
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

function getQuestionMeta(question) {
  if (!question || typeof question !== "object") {
    return "";
  }

  const parts = [];

  if (question.question_no) {
    parts.push(`Q${question.question_no}`);
  }

  if (question.exam_year) {
    parts.push(String(question.exam_year));
  }

  if (question.marks) {
    parts.push(`${question.marks} marks`);
  }

  if (question.paper_type) {
    parts.push(question.paper_type);
  }

  return parts.join(" · ");
}

function PredictionsPage() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const location = useLocation();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPaperType, setSelectedPaperType] = useState("CQ");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();
  const initialSubjectCode = String(location.state?.subject_code || "").trim();
  const academicProfileSignature = getAcademicProfileSignature(user);

  const loadPredictionData = useRef(null);
const userRef = useRef(user);

  // ... inside PredictionsPage component ...

    const stableUser = useMemo(() => user, [user?.id, user?.academic_level, user?.institution_id]);

useEffect(() => {
  userRef.current = user;
}, [user]);

    const subjectsLoadedRef = useRef(false);

    useEffect(() => {
        let active = true;

        const params = buildSubjectScopeParams(stableUser, { status: "published" });

        async function initialize() {
          if (subjectsLoadedRef.current) {
            return;
          }

          try {
            const response = await apiEndpoints.getSubjects(params);

            if (!active) {
              return;
            }

            const subjectList = normalizeSubjectList(response.data);
            setSubjects(subjectList);

            const subjectCode = initialSubjectCode || subjectList[0]?.subject_code || "";

            if (!subjectCode) {
              setMessage("Subject list is unavailable. Enter a subject code manually to load predictions.");
              return;
            }

            setSelectedSubject(subjectCode);
            const nextSubject = subjectList.find((subject) => subject.subject_code === subjectCode) || null;
            const nextPaperType = getDefaultPaperType(getPaperTypeOptions(nextSubject, stableUser));
            setSelectedPaperType(nextPaperType || "CQ");

            try {
              const predictionResponse = await loadPredictionData.current(subjectCode, nextPaperType, nextSubject);
              if (active) {
                const nextPredictions = normalizePredictions(predictionResponse.data);
                setPredictions(nextPredictions);
                setMessage(nextPredictions.length === 0 ? getPredictionMessage(predictionResponse.data, "No predictions returned for this subject.") : "");
              }
            } catch (error) {
              console.error(error);
              if (active) {
                setPredictions([]);
                setMessage(getApiErrorMessage(error, "Subjects loaded, but prediction data could not be loaded for the selected subject."));
              }
            }

            subjectsLoadedRef.current = true;
          } catch (error) {
            console.error(error);
            if (active) {
              setSubjects([]);
              setMessage(getApiErrorMessage(error, "Subject list could not be loaded. Enter a subject code manually."));
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
      }, [academicProfileSignature, initialSubjectCode]);

    loadPredictionData.current = async (subjectCode, paperType, subjectOverride = null) => {
      const subject = subjectOverride || subjects.find((item) => item.subject_code === subjectCode) || null;
      const paperTypeOptions = getPaperTypeOptions(subject, stableUser);

      if (paperTypeOptions.length > 0) {
        const selectedType = paperTypeOptions.includes(paperType) ? paperType : getDefaultPaperType(paperTypeOptions);

        if (!selectedType) {
          throw new Error("Please select CQ, MCQ, or WRITTEN before loading.");
        }

        return apiEndpoints.getPredictions(subjectCode, { paperType: selectedType });
      }

      return apiEndpoints.getPredictions(subjectCode);
    };


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
          setMessage("Subject list is unavailable. Enter a subject code manually to load predictions.");
          return;
        }

        setSelectedSubject(subjectCode);
        const nextSubject = subjectList.find((subject) => subject.subject_code === subjectCode) || null;
        const nextPaperType = getDefaultPaperType(getPaperTypeOptions(nextSubject, user));
        setSelectedPaperType(nextPaperType || "CQ");

        try {
          const predictionResponse = await loadPredictionData.current(subjectCode, nextPaperType, nextSubject);
          if (active) {
            const nextPredictions = normalizePredictions(predictionResponse.data);
            setPredictions(nextPredictions);
            setMessage(nextPredictions.length === 0 ? getPredictionMessage(predictionResponse.data, "No predictions returned for this subject.") : "");
          }
        } catch (error) {
          console.error(error);
          if (active) {
            setPredictions([]);
            setMessage(getApiErrorMessage(error, "Subjects loaded, but prediction data could not be loaded for the selected subject."));
          }
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setSubjects([]);
          setMessage(getApiErrorMessage(error, "Subject list could not be loaded. Enter a subject code manually."));
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
  }, [academicProfileSignature, initialSubjectCode, loadPredictionData, user]);

  async function handleSubjectChange(event) {
    const subjectCode = event.target.value;
    setSelectedSubject(subjectCode);

    if (!subjectCode) {
      setPredictions([]);
      return;
    }

    const nextSubject = subjects.find((subject) => subject.subject_code === subjectCode) || null;
    const nextPaperType = getDefaultPaperType(getPaperTypeOptions(nextSubject, user));
    setSelectedPaperType(nextPaperType || "CQ");

    setLoading(true);
    setMessage("");

    try {
      const response = await loadPredictionData.current(subjectCode, nextPaperType, nextSubject);
      const nextPredictions = normalizePredictions(response.data);
      setPredictions(nextPredictions);
      setMessage(nextPredictions.length === 0 ? getPredictionMessage(response.data, "No predictions returned for this subject.") : "");
    } catch (error) {
      console.error(error);
      setPredictions([]);
      setMessage(getApiErrorMessage(error, "Prediction lookup failed for this subject."));
    } finally {
      setLoading(false);
    }
  }

  function handleSubjectInputChange(event) {
    setSelectedSubject(event.target.value);
    setMessage("");
  }

  function handlePaperTypeChange(nextPaperType) {
    setSelectedPaperType(nextPaperType);
    setMessage("");
  }

  async function handleLoadPredictions() {
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
      const response = await loadPredictionData(selectedSubject.trim(), resolvedPaperType, currentSubject);
      const nextPredictions = normalizePredictions(response.data);
      setPredictions(nextPredictions);
      setMessage(nextPredictions.length === 0 ? getPredictionMessage(response.data, "No predictions returned for this subject.") : "");
    } catch (error) {
      console.error(error);
      setPredictions([]);
      setMessage(getApiErrorMessage(error, "Prediction lookup failed for this subject."));
    } finally {
      setLoading(false);
    }
  }

  function getImportanceLabel(score) {
    if (score === null) return "Low Priority";
    if (score >= 80) return "Very Important";
    if (score >= 60) return "Important";
    if (score >= 40) return "Medium";
    return "Low Priority";
  }

  const currentSubject = subjects.find((subject) => subject.subject_code === selectedSubject) || null;
  const paperTypeOptions = getPaperTypeOptions(currentSubject, user);
  const showPaperSelector = paperTypeOptions.length > 0;

  if (loading) {
    return <LoadingSpinner label="Loading predictions..." />;
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        eyebrow="Prediction engine"
        title="Rank likely future questions by confidence"
        description="View dynamic confidence scores from approved analysis and jump straight into answer practice."
        actions={<Button onClick={() => navigate("/answers", { state: { subject_code: selectedSubject } })}>Open answer builder</Button>}
      />

        <Card>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Select a subject</h2>
              <p className="mt-1 text-sm text-slate-500">Pick a subject to load predicted questions and confidence scores.</p>
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
              <Button type="button" onClick={handleLoadPredictions} className="mt-3 w-full">
                Load predictions
              </Button>
            </div>
          </div>
        </Card>

        <ErrorMessage>{message}</ErrorMessage>

        <div className="grid gap-4">
          {predictions.length === 0 ? (
            <EmptyState title="No predictions found" description="The selected subject may need published questions and approved topic analysis before predictions are available." />
          ) : (
            predictions.map((item, index) => {
              const normalizedScore = normalizeSuggestionScore(item.prediction_score);
              const scoreText = formatSuggestionScore(item.prediction_score);
              const importanceLabel = getImportanceLabel(normalizedScore);

              return (
                <Card as="article" key={item.id || index} className="transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Prediction {index + 1}</p>
                      <h2 className="mt-2 whitespace-pre-line break-words text-lg font-semibold leading-7 text-slate-950 sm:text-xl">
                        {item.topic || item.question_text || "Predicted topic"}
                      </h2>
                    </div>
                    <Badge tone="indigo">{scoreText}</Badge>
                  </div>

                  <DiagramRenderer question={item} />

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${Math.min(Math.max(normalizedScore || 0, 0), 100)}%` }}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-slate-400">Importance</p>
                      <p className="font-semibold text-slate-950">{importanceLabel}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-slate-400">Topic</p>
                      <p className="font-semibold text-slate-950">{item.topic || "N/A"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-slate-400">Subject</p>
                      <p className="font-semibold text-slate-950">{item.subject_code || selectedSubject}</p>
                    </div>
                  </div>

                  {item.reason && (
                    <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      <span className="font-semibold text-slate-950">Reason:</span> {item.reason}
                    </p>
                  )}
                  <QuestionExtras item={item} />

                  {Array.isArray(item.related_questions) && item.related_questions.length > 0 && (
                                                        <div className="mt-4 space-y-4">
                                                          <p className="text-sm font-semibold text-slate-950">Related Previous Questions</p>
                                                          {item.related_questions.slice(0, 4).map((related, questionIndex) => {
                                                            const safeQuestion = {
                                                              id: related.id || related.question_id || `related-${questionIndex}`,
                                                              question_no: related.question_no || "",
                                                              question_text: related.question_text || related.text || "",
                                                              marks: related.marks || null,
                                                              topic: related.topic || item.topic || "",
                                                              exam_year: related.exam_year || null,
                                                              paper_type: related.paper_type || "",
                                                              table_data: related.table_data || null,
                                                              sub_questions: related.sub_questions || null,
                                                              diagram_svg: related.diagram_svg || null,
                                                              diagram_type: related.diagram_type || null,
                                                              word_box: related.word_box || null,
                                                              diagram_required: related.diagram_required || false,
                                                              diagram_description: related.diagram_description || "",
                                                              instruction: related.instruction || "",
                                                              section: related.section || "",
                                                              question_type: related.question_type || "",
                                                              options: related.options || [],
                                                            };

                                                            return <QuestionRenderer key={safeQuestion.id} question={safeQuestion} index={questionIndex} />;
                                                          })}
                                                        </div>
                                                      )}

                  <Button
                    type="button"
                    onClick={() => navigate("/answers", { state: {
                      question: item.question_text || item.topic || "",
                      subject_code: item.subject_code || selectedSubject,
                      formula_latex: item.formula_latex || "",
                      diagram_required: Boolean(item.diagram_required),
                      diagram_type: item.diagram_type || "",
                      diagram_svg: item.diagram_svg || "",
                      diagram_reference: item.diagram_reference || "",
                      diagram_description: item.diagram_description || "",
                    } })}
                    className="mt-5"
                  >
                    Generate answer
                  </Button>
                </Card>
              );
            })
          )}
        </div>
    </ResponsiveContainer>
  );
}

export default PredictionsPage;

//prediscions page