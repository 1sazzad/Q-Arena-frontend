import { useEffect, useMemo, useState, useRef } from "react";
import { apiEndpoints } from "../api/api";
import API from "../api/api";
import {
  getLookupId,
  getLookupLabel,
  normalizeDepartments,
  normalizeUniversities,
} from "../utils/academicLookups";
import { formatSubjectLabel, normalizeSubjectList } from "../utils/subjectLookups";

const DEFAULT_MAX_JSON_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_JSON_IMPORT_BYTES = Number(import.meta.env.VITE_MAX_JSON_IMPORT_BYTES) || DEFAULT_MAX_JSON_IMPORT_BYTES;
const SCOPE_TYPES = {
  UNIVERSITY: "UNIVERSITY",
  BOARD: "BOARD",
};
const ACADEMIC_LEVELS = ["SSC", "HSC"];
const BOARD_GROUPS = ["Science", "Business Studies", "Humanities", "Common"];
const PAPER_TYPES = ["CQ", "MCQ", "WRITTEN"];

const UNIVERSITY_JSON_TEMPLATE = {
  exam_name: "Final Examination",
  exam_year: 2025,
  subject_name: "E-Commerce and Web Engineering",
  subject_code: "CSE-421",
  time: "3 hours",
  total_marks: 60,
  status: "draft",
  source_type: "admin_uploaded",
  questions: [
    {
      question_no: "1(a)",
      question_text: "Prove the parallelogram law.",
      marks: 5,
      topic: "Inner Product Spaces",
      formula_latex: "\\|u+v\\|^2+\\|u-v\\|^2=2(\\|u\\|^2+\\|v\\|^2)",
      diagram_required: true,
      diagram_type: "svg",
      diagram_svg: "",
      diagram_reference: "Vector diagram",
      diagram_description: "Show u, v, u+v, and u-v as directed vectors.",
    },
  ],
};

const BOARD_MCQ_JSON_TEMPLATE = {
  exam_name: "SSC Mathematics MCQ Board Question",
  exam_year: 2025,
  subject_name: "Mathematics",
  subject_code: "SSC-MATH",
  academic_level: "SSC",
  group: "Common",
  paper_type: "MCQ",
  time: "30 minutes",
  total_marks: 30,
  status: "published",
  source_type: "admin_uploaded",
  questions: [
    {
      question_no: "1",
      question_text: "What is the value of log_5 125?",
      options: ["3", "5", "6", "8"],
      correct_answer: "3",
      marks: 1,
      topic: "Logarithm",
      diagram_type: "",
      diagram_svg: "",
    },
  ],
};

const BOARD_CQ_JSON_TEMPLATE = {
  exam_name: "SSC Mathematics CQ Board Question",
  exam_year: 2025,
  subject_name: "Mathematics",
  subject_code: "SSC-MATH",
  academic_level: "SSC",
  group: "Common",
  paper_type: "CQ",
  time: "2 hours 30 minutes",
  total_marks: 70,
  status: "published",
  source_type: "admin_uploaded",
  questions: [
    {
      question_no: "1",
      section: "ক বিভাগ — বীজগণিত",
      stem: "A = {x : x ∈ N : x² > 7 and x³ < 190}. B = {x : x ∈ N : x² ≤ 4}.",
      topic: "Set and Relation",
      formula_latex: "A = \\\\{x : x \\\\in \\\\mathbb{N}, x^2 > 7, x^3 < 190\\\\}",
      diagram_required: false,
      sub_questions: [
        {
          label: "ক",
          question_text: "C = {y ∈ N : y² + 3y + 2 = 0} সেটটি তালিকা পদ্ধতিতে প্রকাশ কর।",
          marks: 2,
        },
        {
          label: "খ",
          question_text: "P(A) নির্ণয় কর।",
          marks: 4,
        },
        {
          label: "গ",
          question_text: "S অন্বয়টিকে তালিকা পদ্ধতিতে প্রকাশ করে ডোমেন নির্ণয় কর।",
          marks: 4,
        },
      ],
    },
  ],
};

const BOARD_ENGLISH_FIRST_WRITTEN_JSON_TEMPLATE = {
  exam_name: "HSC English First Paper Written Board Question",
  exam_year: 2025,
  subject_name: "English First Paper",
  subject_code: "HSC-ENG-1ST",
  academic_level: "HSC",
  group: "Common",
  paper_type: "WRITTEN",
  time: "3 hours",
  total_marks: 100,
  status: "published",
  source_type: "admin_uploaded",
  questions: [
    {
      question_no: "1",
      section: "Reading Test",
      question_type: "Comprehension",
      instruction: "Read the passage and answer the questions that follow.",
      stem: "Education gives us knowledge and helps us become responsible citizens.",
      question_text: "Answer the following questions in your own words.",
      marks: 10,
      topic: "Reading comprehension",
      sub_questions: [
        {
          label: "a",
          question_text: "What is the main purpose of education?",
          marks: 2,
        },
        {
          label: "b",
          question_text: "How does education help a citizen?",
          marks: 2,
        },
      ],
      word_box: ["responsible", "knowledge", "citizens"],
      table_data: {
        headers: ["Word", "Meaning"],
        rows: [
          ["responsible", "accountable"],
          ["citizen", "member of a country"],
        ],
      },
      diagram_required: false,
      diagram_type: "",
      diagram_svg: "",
      diagram_reference: "",
      diagram_description: "",
      math_blocks: [],
    },
  ],
};

const BOARD_ENGLISH_SECOND_WRITTEN_JSON_TEMPLATE = {
  exam_name: "HSC English Second Paper Written Board Question",
  exam_year: 2025,
  subject_name: "English Second Paper",
  subject_code: "HSC-ENG-2ND",
  academic_level: "HSC",
  group: "Common",
  paper_type: "WRITTEN",
  time: "3 hours",
  total_marks: 100,
  status: "published",
  source_type: "admin_uploaded",
  questions: [
    {
      question_no: "1",
      section: "Grammar",
      question_type: "Transformation of Sentences",
      instruction: "Change the sentences as directed in brackets.",
      question_text: "Complete the transformations without changing the meaning.",
      marks: 10,
      topic: "Sentence transformation",
      sub_questions: [
        {
          label: "a",
          question_text: "He is too weak to walk. (Make it complex)",
          marks: 1,
        },
        {
          label: "b",
          question_text: "No other city in Bangladesh is as busy as Dhaka. (Make it superlative)",
          marks: 1,
        },
      ],
      options: [],
      correct_answer: "",
      diagram_required: false,
      diagram_type: "",
      diagram_svg: "",
      diagram_reference: "",
      diagram_description: "",
      math_blocks: [],
    },
  ],
};

function getDefaultBoardTime(paperType) {
  if (paperType === "MCQ") {
    return "30 minutes";
  }

  if (paperType === "CQ") {
    return "2 hours 30 minutes";
  }

  return "3 hours";
}

function getDefaultBoardMarks(paperType) {
  if (paperType === "MCQ") {
    return 30;
  }

  if (paperType === "CQ") {
    return 70;
  }

  return 100;
}

function getBoardJsonTemplate(paperType) {
  if (paperType === "MCQ") {
    return BOARD_MCQ_JSON_TEMPLATE;
  }

  if (paperType === "WRITTEN") {
    return {
      exams: [
        BOARD_ENGLISH_FIRST_WRITTEN_JSON_TEMPLATE,
        BOARD_ENGLISH_SECOND_WRITTEN_JSON_TEMPLATE,
      ],
    };
  }

  return BOARD_CQ_JSON_TEMPLATE;
}

function stringifyTemplate(template) {
  return JSON.stringify(template, null, 2);
}

function createQuestion() {
  return {
    question_no: "",
    question_text: "",
    marks: "",
    topic: "",
    formula_latex: "",
    diagram_required: false,
    diagram_type: "",
    diagram_svg: "",
    diagram_reference: "",
    diagram_description: "",
  };
}

function normalizeQuestion(question = {}) {
  return {
    ...question,
    question_no: String(question.question_no ?? "").trim(),
    question_text: String(question.question_text ?? question.text ?? question.question ?? "").trim(),
    marks: question.marks ?? "",
    topic: String(question.topic || "Uncategorized").trim(),
    stem: question.stem ?? "",
    section: question.section ?? "",
    question_type: question.question_type ?? "",
    instruction: question.instruction ?? "",
    word_box: question.word_box ?? undefined,
    options: Array.isArray(question.options) ? question.options : question.options,
    correct_answer: question.correct_answer,
    formula_latex: question.formula_latex ?? "",
    formula_display: question.formula_display ?? "",
    diagram_required: question.diagram_required ?? false,
    diagram_type: question.diagram_type ?? "",
    diagram_svg: question.diagram_svg ?? "",
    diagram_reference: question.diagram_reference ?? "",
    diagram_description: question.diagram_description ?? "",
    sub_questions: Array.isArray(question.sub_questions) ? question.sub_questions : question.sub_questions,
    math_blocks: Array.isArray(question.math_blocks) ? question.math_blocks : question.math_blocks,
    table_data: question.table_data ?? undefined,
    graph_required: question.graph_required ?? undefined,
    construction_required: question.construction_required ?? undefined,
  };
}

function normalizeOptionalText(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be text when provided.`);
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function normalizeDiagramRequired(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (typeof value !== "boolean") {
    throw new Error("diagram_required must be a boolean.");
  }

  return value;
}

function expandImportedPayload(rawPayload) {
  if (Array.isArray(rawPayload)) {
    return rawPayload;
  }

  if (Array.isArray(rawPayload?.exams)) {
    return rawPayload.exams.map((exam) => ({
      ...exam,
      academic_level: exam?.academic_level || rawPayload.academic_level,
      group: exam?.group || exam?.stream_group || rawPayload.group || rawPayload.stream_group,
      paper_type: exam?.paper_type || rawPayload.paper_type,
    }));
  }

  if (Array.isArray(rawPayload?.all_years_questions)) {
    return rawPayload.all_years_questions.map((yearExam) => ({
      exam_name: rawPayload.exam_name || yearExam.exam_name || "Final Examination",
      exam_year: yearExam.exam_year ?? rawPayload.exam_year ?? new Date().getFullYear(),
      subject_name: rawPayload.subject_name || yearExam.subject_name || "",
      subject_code: rawPayload.subject_code || yearExam.subject_code || "",
      academic_level: yearExam.academic_level || rawPayload.academic_level || "",
      group: yearExam.group || yearExam.stream_group || rawPayload.group || rawPayload.stream_group || "",
      paper_type: yearExam.paper_type || rawPayload.paper_type || "",
      time: rawPayload.time || yearExam.time || "3 hours",
      total_marks: rawPayload.total_marks ?? yearExam.total_marks ?? 80,
      questions: yearExam.questions || [],
      status: rawPayload.status || yearExam.status || "draft",
      source_type: rawPayload.source_type || yearExam.source_type || "admin_uploaded",
    }));
  }

  return rawPayload;
}

function normalizeImportedExam(rawPayload) {
  const payload = rawPayload?.exam ?? rawPayload;
  const questions = Array.isArray(payload?.questions) ? payload.questions.map(normalizeQuestion) : [createQuestion()];

  return {
    ...payload,
    exam_name: String(payload?.exam_name ?? "Final Examination").trim(),
    exam_year: payload?.exam_year ?? new Date().getFullYear(),
    subject_name: String(payload?.subject_name ?? "").trim(),
    subject_code: String(payload?.subject_code ?? "").trim(),
    academic_level: String(payload?.academic_level ?? "").trim(),
    group: String(payload?.group ?? payload?.stream_group ?? "").trim(),
    paper_type: String(payload?.paper_type ?? "").trim().toUpperCase(),
    time: String(payload?.time || "3 hours").trim(),
    total_marks: payload?.total_marks ?? 80,
    status: payload?.status || "draft",
    source_type: payload?.source_type || "admin_uploaded",
    questions: questions.length > 0 ? questions : [createQuestion()],
  };
}

function buildSubjectCodeLookup(exams) {
  return exams.reduce((lookup, rawExam) => {
    const subjectName = String(rawExam?.subject_name ?? "").trim().toLowerCase();
    const subjectCode = String(rawExam?.subject_code ?? "").trim();

    if (subjectName && subjectCode) {
      lookup.set(subjectName, subjectCode);
    }

    return lookup;
  }, new Map());
}

function normalizeSingleExamPayload(rawExam, options = {}) {
  const scopeType = options.scopeType || SCOPE_TYPES.UNIVERSITY;
  const normalizedExam = normalizeImportedExam(rawExam);
  const totalMarks = Number(normalizedExam.total_marks);
  const questions = normalizedExam.questions
    .map((question) => {
      const normalizedQuestion = {
        ...question,
        question_no: String(question.question_no).trim(),
        question_text: String(question.question_text).trim(),
        marks: question.marks === "" || question.marks === undefined || question.marks === null ? "" : Number(question.marks),
        topic: String(question.topic || "Uncategorized").trim(),
        stem: question.stem ?? "",
        section: question.section ?? "",
        question_type: question.question_type ?? "",
        instruction: question.instruction ?? "",
        word_box: question.word_box,
        options: question.options,
        correct_answer: question.correct_answer,
        formula_latex: normalizeOptionalText(question.formula_latex, "formula_latex"),
        formula_display: question.formula_display ?? undefined,
        diagram_required: normalizeDiagramRequired(question.diagram_required),
        diagram_type: normalizeOptionalText(question.diagram_type, "diagram_type"),
        diagram_svg: normalizeOptionalText(question.diagram_svg, "diagram_svg"),
        diagram_reference: normalizeOptionalText(question.diagram_reference, "diagram_reference"),
        diagram_description: normalizeOptionalText(question.diagram_description, "diagram_description"),
        sub_questions: question.sub_questions,
        math_blocks: question.math_blocks,
        table_data: question.table_data,
        graph_required: question.graph_required,
        construction_required: question.construction_required,
      };

      if (scopeType === SCOPE_TYPES.BOARD && normalizedExam.paper_type === "MCQ" && normalizedQuestion.marks === "") {
        normalizedQuestion.marks = 1;
      }

      return normalizedQuestion;
    })
    .filter((question) => {
      if (!question.question_no) {
        return false;
      }

      if (scopeType === SCOPE_TYPES.BOARD && normalizedExam.paper_type === "CQ") {
        return Boolean(question.question_text || question.stem || (Array.isArray(question.sub_questions) && question.sub_questions.length > 0));
      }

      if (scopeType === SCOPE_TYPES.BOARD && normalizedExam.paper_type === "WRITTEN") {
        return Boolean(
          question.question_text ||
          question.instruction ||
          question.stem ||
          (Array.isArray(question.sub_questions) && question.sub_questions.length > 0)
        );
      }

      return question.question_text && Number.isFinite(question.marks);
    });

  if (!normalizedExam.exam_name || !normalizedExam.subject_name || !normalizedExam.subject_code) {
    throw new Error("Exam name, subject name, and subject code are required.");
  }

  if (scopeType === SCOPE_TYPES.BOARD) {
    if (!normalizedExam.academic_level || !normalizedExam.group || !normalizedExam.paper_type) {
      throw new Error("Academic level, group, and paper type are required for SSC/HSC uploads.");
    }

    if (!PAPER_TYPES.includes(normalizedExam.paper_type)) {
      throw new Error("Paper type must be CQ, MCQ, or WRITTEN.");
    }

    if (normalizedExam.paper_type === "MCQ") {
      const invalidQuestionIndex = questions.findIndex(
        (question) => !Array.isArray(question.options) || question.options.length === 0,
      );

      if (invalidQuestionIndex >= 0) {
        throw new Error(`MCQ question #${invalidQuestionIndex + 1} must include options.`);
      }
    }

    if (normalizedExam.paper_type === "WRITTEN") {
      const invalidQuestionIndex = questions.findIndex(
        (question) => !question.question_text &&
          !question.instruction &&
          !question.stem &&
          (!Array.isArray(question.sub_questions) || question.sub_questions.length === 0),
      );

      if (invalidQuestionIndex >= 0) {
        throw new Error(`WRITTEN question #${invalidQuestionIndex + 1} must include question_text, instruction, stem, or sub_questions.`);
      }
    }
  }

  if (questions.length === 0) {
    throw new Error("Add at least one valid question before saving.");
  }

  return {
    ...rawExam,
    exam_name: normalizedExam.exam_name,
    exam_year: Number(normalizedExam.exam_year) || new Date().getFullYear(),
    subject_name: normalizedExam.subject_name,
    subject_code: normalizedExam.subject_code,
    academic_level: normalizedExam.academic_level || undefined,
    group: normalizedExam.group || undefined,
    paper_type: normalizedExam.paper_type || undefined,
    time: normalizedExam.time || getDefaultBoardTime(normalizedExam.paper_type),
    total_marks: Number.isFinite(totalMarks) && totalMarks > 0 ? totalMarks : normalizedExam.paper_type ? getDefaultBoardMarks(normalizedExam.paper_type) : 80,
    questions,
    status: normalizedExam.status || "draft",
    source_type: normalizedExam.source_type || "admin_uploaded",
  };
}

function normalizeBatchPayload(rawPayload, options = {}) {
  const expandedPayload = expandImportedPayload(rawPayload);

  if (!Array.isArray(expandedPayload)) {
    throw new Error("Batch upload must be a JSON array of exams.");
  }

  const subjectCodeLookup = buildSubjectCodeLookup(expandedPayload);

  return expandedPayload.map((rawExam, examIndex) => {
    const normalizedExam = normalizeImportedExam(rawExam);
    const subjectCode = normalizedExam.subject_code || subjectCodeLookup.get(normalizedExam.subject_name.toLowerCase()) || "";

    if (!subjectCode) {
      throw new Error(`Exam #${examIndex + 1} is missing subject_name or subject_code.`);
    }

    return normalizeSingleExamPayload({
      ...rawExam,
      subject_code: subjectCode,
    }, options);
  });
}

function formatValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(", ");
  }

  if (typeof value === "object") {
    if (value.msg || value.message || value.error || value.detail) {
      return formatValue(value.msg || value.message || value.error || value.detail);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return String(value);
}

function getErrorMessage(errorData, fallback) {
  return formatValue(errorData?.detail || errorData?.message || errorData?.error, fallback);
}

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

function validateJsonFile(file) {
  if (!file.name.toLowerCase().endsWith(".json")) {
    return "Only .json files are supported for admin import.";
  }

  if (file.size > MAX_JSON_IMPORT_BYTES) {
    return `JSON file must be ${formatFileSize(MAX_JSON_IMPORT_BYTES)} or smaller.`;
  }

  return "";
}

function UploadPage() {
  const [exam, setExam] = useState(() => ({
    exam_name: "Final Examination",
    exam_year: new Date().getFullYear(),
    subject_name: "",
    subject_code: "",
    time: "3 hours",
    total_marks: 60,
    questions: [createQuestion()],
  }));
  const [subjects, setSubjects] = useState([]);
  const [healthStatus, setHealthStatus] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jsonImport, setJsonImport] = useState("");
  const [jsonFile, setJsonFile] = useState(null);
  const [jsonError, setJsonError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishSubjectCode, setPublishSubjectCode] = useState("");
  const [publishSubjectId, setPublishSubjectId] = useState("");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishResult, setPublishResult] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [importJob, setImportJob] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const jobPollRef = useRef({ active: false, timeoutId: null });
  const [isBatchMode, setIsBatchMode] = useState(false);

  useEffect(() => {
    return () => {
      if (jobPollRef.current?.timeoutId) {
        clearTimeout(jobPollRef.current.timeoutId);
      }

      jobPollRef.current = { active: false, timeoutId: null };
    };
  }, []);
  const [universities, setUniversities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [universitiesLoading, setUniversitiesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [scopeError, setScopeError] = useState("");
  const [scopeType, setScopeType] = useState(SCOPE_TYPES.UNIVERSITY);
  const [boardScope, setBoardScope] = useState({
    academic_level: "SSC",
    group: "Common",
    paper_type: "CQ",
  });

  useEffect(() => {
    async function loadBootData() {
      try {
        setUniversitiesLoading(true);
        const [healthResponse, subjectsResponse, universitiesResponse] = await Promise.all([
          apiEndpoints.health(),
          apiEndpoints.getSubjects(),
          apiEndpoints.getUniversities(),
        ]);
        setHealthStatus(healthResponse.data?.status === "ok" ? "online" : "degraded");
        setSubjects(normalizeSubjectList(subjectsResponse.data));
        setUniversities(normalizeUniversities(universitiesResponse.data));
      } catch (error) {
        console.error(error);
        setSubjects([]);
        setUniversities([]);
        setHealthStatus("offline");
        setScopeError(getErrorMessage(error.response?.data || {}, "Unable to load universities."));
      } finally {
        setUniversitiesLoading(false);
      }
    }

    loadBootData();
  }, []);

  useEffect(() => {
    if (!selectedUniversity) {
      return;
    }

    let active = true;

    Promise.resolve()
      .then(() => {
        if (!active) {
          return null;
        }

        setDepartmentsLoading(true);
        setScopeError("");
        return apiEndpoints.getUniversityDepartments(selectedUniversity);
      })
      .then((response) => {
        if (active && response) {
          setDepartments(normalizeDepartments(response.data));
        }
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setDepartments([]);
          setScopeError(getErrorMessage(error.response?.data || {}, "Unable to load departments."));
        }
      })
      .finally(() => {
        if (active) {
          setDepartmentsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedUniversity]);

  function getImportScope() {
    if (scopeType === SCOPE_TYPES.BOARD) {
      return {
        academic_level: boardScope.academic_level,
        group: boardScope.group,
        paper_type: boardScope.paper_type,
      };
    }

    return {
      university_id: Number(selectedUniversity),
      department_id: Number(selectedDepartment),
    };
  }

  function validateImportScope() {
    if (scopeType === SCOPE_TYPES.BOARD) {
      if (!boardScope.academic_level || !boardScope.group || !boardScope.paper_type) {
        setScopeError("Please select academic level, group, and paper type.");
        return false;
      }

      setScopeError("");
      return true;
    }

    if (!selectedUniversity) {
      setScopeError("Please select a university first.");
      return false;
    }

    if (!selectedDepartment) {
      setScopeError("Please select a department first.");
      return false;
    }

    const scope = getImportScope();
    if (!Number.isFinite(scope.university_id)) {
      setScopeError("Please select a university first.");
      return false;
    }

    if (!Number.isFinite(scope.department_id)) {
      setScopeError("Please select a department first.");
      return false;
    }

    setScopeError("");
    return true;
  }

  function parseJsonImportPayload(source) {
    let parsedJson;

    try {
      parsedJson = JSON.parse(source);
    } catch {
      throw new Error("Invalid JSON. Paste or upload valid JSON before importing.");
    }

    const expandedPayload = expandImportedPayload(parsedJson);
    const exams = Array.isArray(expandedPayload) ? expandedPayload : [expandedPayload];
    const hasOnlyExamObjects = exams.length > 0 && exams.every(
      (item) => item && typeof item === "object" && !Array.isArray(item),
    );

    if (!hasOnlyExamObjects) {
      throw new Error("JSON must contain one exam object or an array of exam objects.");
    }

    return { parsedJson, exams };
  }

  function applyBoardScopeToExam(rawExam) {
    if (scopeType !== SCOPE_TYPES.BOARD) {
      return rawExam;
    }

    const paperType = String(rawExam?.paper_type || boardScope.paper_type || "").trim().toUpperCase();
    return {
      ...rawExam,
      academic_level: rawExam?.academic_level || boardScope.academic_level,
      group: rawExam?.group || rawExam?.stream_group || boardScope.group,
      paper_type: paperType,
      time: rawExam?.time || getDefaultBoardTime(paperType),
      total_marks: rawExam?.total_marks ?? getDefaultBoardMarks(paperType),
      questions: Array.isArray(rawExam?.questions)
        ? rawExam.questions.map((question) => ({
            ...question,
            marks: paperType === "MCQ" && (question.marks === undefined || question.marks === null || question.marks === "") ? 1 : question.marks,
          }))
        : rawExam?.questions,
    };
  }

  function normalizeExamsForScope(exams) {
    const scopedExams = exams.map(applyBoardScopeToExam);
    return normalizeBatchPayload(scopedExams, { scopeType });
  }

  function buildImportPayload(exams) {
    if (!validateImportScope()) {
      return null;
    }

    const normalizedExams = scopeType === SCOPE_TYPES.BOARD ? normalizeExamsForScope(exams) : exams;
    const payload = scopeType === SCOPE_TYPES.BOARD
      ? { exams: normalizedExams }
      : {
          university_id: Number(selectedUniversity),
          department_id: Number(selectedDepartment),
          exams: normalizedExams,
        };

    console.log("Import payload:", {
      scope_type: scopeType,
      university_id: payload.university_id,
      department_id: payload.department_id,
      examsCount: normalizedExams.length,
      firstExamKeys: Object.keys(normalizedExams[0] || {}),
    });

    return payload;
  }

  function updateExam(field, value) {
    setExam((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "subject_code") {
        setPublishSubjectCode(String(value).trim());
        setPublishSubjectId("");
      }

      return next;
    });
  }

  function updateQuestion(index, field, value) {
    setExam((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [field]: value } : question,
      ),
    }));
  }

  function addQuestion() {
    setExam((current) => ({
      ...current,
      questions: [...current.questions, createQuestion()],
    }));
  }

  function removeQuestion(index) {
    setExam((current) => ({
      ...current,
      questions: current.questions.length === 1 ? [createQuestion()] : current.questions.filter((_, questionIndex) => questionIndex !== index),
    }));
  }

  function applyImportedExam(rawPayload) {
    // Support nested JSON with subject and exams array
    if (rawPayload && rawPayload.subject && Array.isArray(rawPayload.exams)) {
      // Merge subject fields into each exam with normalization
      const mergedExams = rawPayload.exams.map((exam) => ({
        subject_name: exam.subject_name || rawPayload.subject.subject_name || "",
        subject_code: exam.subject_code || rawPayload.subject.subject_code || "",
        academic_level: exam.academic_level || rawPayload.subject.academic_level || "",
        program: exam.program || rawPayload.subject.program || "",
        year: exam.year || rawPayload.subject.year || "",
        semester: exam.semester || rawPayload.subject.semester || "",
        curriculum: exam.curriculum || rawPayload.subject.curriculum || "",
        ...exam,
      }));

      try {
        if (scopeType === SCOPE_TYPES.BOARD) {
          normalizeExamsForScope(mergedExams);
        } else {
          normalizeBatchPayload(mergedExams);
        }
        setIsBatchMode(true);
        setMessage(`Batch mode detected: ${mergedExams.length} exam(s) ready to upload.`);
        setJsonError("");
      } catch (error) {
        console.error(error);
        setIsBatchMode(false);
        setJsonError(error.message || "Batch JSON is missing required exam fields.");
      }
      return;
    }

    // Fallback to existing logic
    const expandedPayload = expandImportedPayload(rawPayload);

    if (Array.isArray(expandedPayload)) {
      try {
        if (scopeType === SCOPE_TYPES.BOARD) {
          normalizeExamsForScope(expandedPayload);
        } else {
          normalizeBatchPayload(expandedPayload);
        }
        setIsBatchMode(true);
        setMessage(`Batch mode detected: ${expandedPayload.length} exam(s) ready to upload.`);
        setJsonError("");
      } catch (error) {
        console.error(error);
        setIsBatchMode(false);
        setJsonError(error.message || "Batch JSON is missing required exam fields.");
      }
    } else {
      setIsBatchMode(false);
      const importedExam = normalizeImportedExam(applyBoardScopeToExam(expandedPayload));
      setExam(importedExam);
      setPublishSubjectCode(importedExam.subject_code);
      setPublishSubjectId("");
      setMessage("JSON loaded into the form. Review the fields, then submit to the admin API.");
      setJsonError("");
    }
  }

  async function handleJsonFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = validateJsonFile(file);
    if (validationError) {
      setJsonError(validationError);
      setJsonFile(null);
      event.target.value = "";
      return;
    }

    try {
      const fileText = await file.text();
      setJsonFile(file);
      setJsonImport(fileText);
      applyImportedExam(JSON.parse(fileText));
    } catch (error) {
      console.error(error);
      setJsonError("Invalid JSON file. Make sure it contains exam metadata and questions.");
      setJsonFile(null);
    }

    event.target.value = "";
  }

  function handleLoadJsonText() {
    try {
      setJsonFile(null);
      applyImportedExam(JSON.parse(jsonImport));
    } catch (error) {
      console.error(error);
      setJsonError("Invalid JSON. Paste a valid exam payload before loading it.");
    }
  }

  async function handleSaveImportedJson() {
    if (!jsonFile && !jsonImport.trim()) {
      setJsonError("Paste or upload JSON before saving.");
      return;
    }

    if (!validateImportScope()) {
      return;
    }

    setLoading(true);
    setJsonError("");
    setMessage("Saving imported JSON as draft data...");
    setUploadResponse(null);

    try {
      const { parsedJson, exams } = parseJsonImportPayload(jsonImport);

      // If nested subject and exams, merge subject fields into each exam before building payload
      let normalizedExams = exams;
      if (parsedJson && parsedJson.subject && Array.isArray(parsedJson.exams)) {
        normalizedExams = parsedJson.exams.map((exam) => ({
          subject_name: exam.subject_name || parsedJson.subject.subject_name || "",
          subject_code: exam.subject_code || parsedJson.subject.subject_code || "",
          academic_level: exam.academic_level || parsedJson.subject.academic_level || "",
          program: exam.program || parsedJson.subject.program || "",
          year: exam.year || parsedJson.subject.year || "",
          semester: exam.semester || parsedJson.subject.semester || "",
          curriculum: exam.curriculum || parsedJson.subject.curriculum || "",
          ...exam,
        }));
      }

      const payload = buildImportPayload(normalizedExams);
      if (!payload) {
        return;
      }

      const response = await apiEndpoints.importAdminExams(payload);
      const result = response.data || {};

      setUploadResponse({
        mode: normalizedExams.length > 1 ? "batch" : "single",
        ...result,
      });
      setMessage(formatValue(result.message, normalizedExams.length > 1 ? "Batch drafts saved." : "Draft exam saved."));
      if (result.job_id || result.status_url) {
        const statusUrl = result.status_url || `/jobs/${encodeURIComponent(result.job_id)}`;
        setImportJob({ job_id: result.job_id, status_url: statusUrl });
        startJobPolling(statusUrl);
      }
      applyImportedExam(parsedJson);
    } catch (error) {
      console.error(error);
      const errorData = error.response?.data || {};
      // Simplify error message for UI display
      let errorMessage = "Upload failed.";
      if (errorData && typeof errorData === "object") {
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          // Show first error only
          const firstError = errorData.errors[0];
          if (firstError.loc && firstError.msg) {
            // Strip large object details from error message
            let msg = firstError.msg;
            const receivedIndex = msg.indexOf("Received");
            if (receivedIndex >= 0) {
              msg = msg.substring(0, receivedIndex).trim();
            }
            errorMessage = `Upload failed: ${firstError.loc.join(".")}: ${msg}`;
          } else if (firstError.msg) {
            let msg = firstError.msg;
            const receivedIndex = msg.indexOf("Received");
            if (receivedIndex >= 0) {
              msg = msg.substring(0, receivedIndex).trim();
            }
            errorMessage = `Upload failed: ${msg}`;
          }
        } else if (errorData.detail) {
          let msg = errorData.detail;
          const receivedIndex = msg.indexOf("Received");
          if (receivedIndex >= 0) {
            msg = msg.substring(0, receivedIndex).trim();
          }
          errorMessage = `Upload failed: ${msg}`;
        } else if (errorData.message) {
          let msg = errorData.message;
          const receivedIndex = msg.indexOf("Received");
          if (receivedIndex >= 0) {
            msg = msg.substring(0, receivedIndex).trim();
          }
          errorMessage = `Upload failed: ${msg}`;
        }
      } else if (error.message) {
        errorMessage = `Upload failed: ${error.message}`;
      }

      setUploadResponse({
        mode: "import",
        error: true,
        message: errorMessage,
      });
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const questionProgress = useMemo(() => {
    const completeQuestions = exam.questions.filter((question) => question.question_no && question.question_text && question.marks !== "").length;

    return {
      total: exam.questions.length,
      complete: completeQuestions,
    };
  }, [exam.questions]);

  const jsonTemplate = useMemo(() => {
    if (scopeType === SCOPE_TYPES.UNIVERSITY) {
      return stringifyTemplate(UNIVERSITY_JSON_TEMPLATE);
    }

    return stringifyTemplate(getBoardJsonTemplate(boardScope.paper_type));
  }, [boardScope.paper_type, scopeType]);

  function updateBoardScope(field, value) {
    setBoardScope((current) => {
      const next = { ...current, [field]: value };
      if (field === "paper_type") {
        setExam((currentExam) => ({
          ...currentExam,
          time: getDefaultBoardTime(value),
          total_marks: getDefaultBoardMarks(value),
        }));
      }
      return next;
    });
    setScopeError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateImportScope()) {
      return;
    }

    if (!isBatchMode) {
      // Single exam validation
      if (!exam.exam_name.trim() || !exam.subject_name.trim() || !exam.subject_code.trim()) {
        setMessage("Please fill the exam name, subject name, and subject code.");
        return;
      }

      setLoading(true);
      setMessage("Submitting exam and generating embeddings...");
      setUploadResponse(null);

      try {
        const normalizedExam = normalizeSingleExamPayload(applyBoardScopeToExam(exam), { scopeType });
        const payload = buildImportPayload([normalizedExam]);
        if (!payload) {
          return;
        }

        const response = await apiEndpoints.importAdminExams(payload);

        const result = response.data || {};
        setUploadResponse({
          mode: "single",
          ...result,
        });
        if (result.job_id || result.status_url) {
          const statusUrl = result.status_url || `/jobs/${encodeURIComponent(result.job_id)}`;
          setImportJob({ job_id: result.job_id, status_url: statusUrl });
          startJobPolling(statusUrl);
        }
        setMessage("Draft exam saved successfully. Use the publish section below when the subject is ready for students.");
        setExam({
          exam_name: "Final Examination",
          exam_year: new Date().getFullYear(),
          subject_name: "",
          subject_code: "",
          time: scopeType === SCOPE_TYPES.BOARD ? getDefaultBoardTime(boardScope.paper_type) : "3 hours",
          total_marks: scopeType === SCOPE_TYPES.BOARD ? getDefaultBoardMarks(boardScope.paper_type) : 60,
          questions: [createQuestion()],
        });
        setPublishSubjectCode("");
        setPublishSubjectId("");
      } catch (error) {
        console.error(error);
        const errorData = error.response?.data || {};
        // Strip large object details from error message
        let errorMessage = getErrorMessage(errorData, "Submission failed. Check the backend and payload format.");
        const receivedIndex = errorMessage.indexOf("Received");
        if (receivedIndex >= 0) {
          errorMessage = errorMessage.substring(0, receivedIndex).trim();
        }
        setUploadResponse({
          mode: "single",
          error: true,
          message: errorMessage,
        });
        setMessage(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      // Batch mode: POST array of exams
      setLoading(true);
      setMessage("Submitting batch of exams and generating embeddings...");
      setUploadResponse(null);

      try {
        const { exams } = parseJsonImportPayload(jsonImport);
        const payload = buildImportPayload(exams);
        if (!payload) {
          return;
        }

        const response = await apiEndpoints.importAdminExams(payload);
        const result = response.data || {};
        setUploadResponse({
          mode: "batch",
          ...result,
        });
        if (result.job_id || result.status_url) {
          const statusUrl = result.status_url || `/jobs/${encodeURIComponent(result.job_id)}`;
          setImportJob({ job_id: result.job_id, status_url: statusUrl });
          startJobPolling(statusUrl);
        }
        setMessage(formatValue(result.message, "Batch draft upload completed."));
        setJsonImport("");
        setJsonFile(null);
        setExam({
          exam_name: "Final Examination",
          exam_year: new Date().getFullYear(),
          subject_name: "",
          subject_code: "",
          time: scopeType === SCOPE_TYPES.BOARD ? getDefaultBoardTime(boardScope.paper_type) : "3 hours",
          total_marks: scopeType === SCOPE_TYPES.BOARD ? getDefaultBoardMarks(boardScope.paper_type) : 60,
          questions: [createQuestion()],
        });
      } catch (error) {
        console.error(error);
        const errorData = error.response?.data || {};
        let errorMessage = getErrorMessage(errorData, "Batch submission failed. Check JSON format and backend response.");
        const receivedIndex = errorMessage.indexOf("Received");
        if (receivedIndex >= 0) {
          errorMessage = errorMessage.substring(0, receivedIndex).trim();
        }
        setUploadResponse({
          mode: "batch",
          error: true,
          message: errorMessage,
        });
        setMessage(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handlePublishSubject() {
    const selectedSubject = subjects.find((subject) => String(subject.id) === String(publishSubjectId));

    if (!selectedSubject) {
      setPublishMessage("Select a subject to publish.");
      return;
    }

    setPublishing(true);
    setPublishResult(null);
    setPublishMessage(`Publishing subject data for ${selectedSubject.subject_code}...`);

    try {
      const response = await apiEndpoints.publishSubject(selectedSubject.id);
      const data = response.data || {};
      setPublishResult(data);
      setPublishMessage(formatValue(data.message, `Subject ${selectedSubject.subject_code} published successfully.`));
    } catch (error) {
      console.error(error);
      setPublishMessage(getErrorMessage(error.response?.data || {}, "Publish failed. Check the selected subject and backend response."));
    } finally {
      setPublishing(false);
    }
  }

  function stopJobPolling() {
    jobPollRef.current.active = false;
    if (jobPollRef.current.timeoutId) {
      clearTimeout(jobPollRef.current.timeoutId);
      jobPollRef.current.timeoutId = null;
    }
  }

  async function fetchJobStatus(statusUrl) {
    try {
      const isAbsolute = String(statusUrl).startsWith("http");
      let response;
      if (isAbsolute) {
        const token = localStorage.getItem("access_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(statusUrl, { headers });
        response = { data: await res.json(), status: res.status };
      } else {
        response = await API.get(statusUrl);
      }

      return response.data || null;
    } catch {
      return null;
    }
  }

  function startJobPolling(statusUrl, intervalMs = 2000, maxAttempts = 180) {
    stopJobPolling();
    jobPollRef.current.active = true;
    let attempts = 0;

    const poll = async () => {
      if (!jobPollRef.current.active) return;
      attempts += 1;
      const statusData = await fetchJobStatus(statusUrl);
      if (statusData) {
        setJobStatus(statusData);
      }

      const rawStatus = String(statusData?.status || statusData?.state || "").toLowerCase();
      const isPending = !rawStatus || rawStatus === "pending";
      const isProcessing = rawStatus === "in_progress" || rawStatus === "processing" || rawStatus === "running";
      const isCompleted = rawStatus === "completed" || rawStatus === "success" || rawStatus === "done";
      const isFailed = rawStatus === "failed" || rawStatus === "error" || rawStatus === "failed_with_errors";

      if (isPending || isProcessing) {
        if (attempts >= maxAttempts) {
          stopJobPolling();
          setMessage("Import job timed out. Check backend job status separately.");
          return;
        }

        // keep polling
        jobPollRef.current.timeoutId = setTimeout(poll, intervalMs);
        return;
      }

      // terminal
      stopJobPolling();
      if (isCompleted) {
        setMessage(statusData?.message || "Import job completed successfully.");
      } else if (isFailed) {
        const reason = statusData?.error || statusData?.error_detail || statusData?.failure_reason || statusData?.message;
        setMessage(reason || "Import job failed. See details.");
      } else {
        setMessage(statusData?.message || "Import job completed.");
      }
    };

    poll();
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#e2e8f0_45%,_#f8fafc_100%)] px-4 py-6 text-slate-900 sm:px-6 md:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid min-w-0 gap-6 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 p-5 text-white shadow-2xl shadow-slate-950/30 sm:p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div className="min-w-0 space-y-4">
            <span className="inline-flex max-w-full rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200">
              Admin JSON ingest
            </span>
            <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Import a JSON exam, index it once, publish it when ready.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Paste or upload the admin exam JSON, review the generated form, submit it to the backend, then publish the subject for student access.
            </p>

            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3 lg:flex lg:flex-wrap">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">API status</p>
                <p className="mt-1 font-medium text-white">
                  {healthStatus === "online" ? "Online" : healthStatus === "offline" ? "Offline" : "Checking..."}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Known subjects</p>
                <p className="mt-1 font-medium text-white">{subjects.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Questions in form</p>
                <p className="mt-1 font-medium text-white">{questionProgress.total}</p>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">Workflow</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              <li className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">1. Import a JSON payload or edit the form manually.</li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">2. Submit the exam to create embeddings and store the data.</li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">3. Publish the subject when student access should be enabled.</li>
            </ol>
          </div>
        </section>

        {uploadResponse && (
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
            {uploadResponse.error ? (
              <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4">
                <h3 className="text-lg font-semibold text-rose-900">Upload failed</h3>
                <p className="mt-2 text-sm text-rose-800">{formatValue(uploadResponse.message)}</p>
              </div>
            ) : uploadResponse.mode === "single" ? (
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-green-200 bg-green-50 p-4">
                  <h3 className="text-lg font-semibold text-green-900">Exam saved successfully</h3>
                  <p className="mt-1 text-sm text-green-800">{formatValue(uploadResponse.message)}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Exam ID</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.exam_id)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Question count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.question_count ?? uploadResponse.total_question_count)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Embedded count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.embedded_count ?? uploadResponse.total_embedded_count)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Duplicate count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.duplicate_count)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Topic review count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.topic_review_count ?? uploadResponse.total_topic_review_count)}</p>
                  </div>
                </div>
                {Array.isArray(uploadResponse.auto_filled_fields) && uploadResponse.auto_filled_fields.length > 0 && (
                  <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">Backend auto-filled fields:</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {uploadResponse.auto_filled_fields.map((field) => (
                        <li key={formatValue(field)} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                          {formatValue(field)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[1.25rem] border border-green-200 bg-green-50 p-4">
                  <h3 className="text-lg font-semibold text-green-900">Batch upload completed</h3>
                  <p className="mt-1 text-sm text-green-800">{formatValue(uploadResponse.message)}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Received</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.received)}</p>
                  </div>
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-green-700">Saved</p>
                    <p className="mt-2 text-2xl font-semibold text-green-900">{formatValue(uploadResponse.saved)}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${uploadResponse.failed > 0 ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`text-xs uppercase tracking-[0.24em] ${uploadResponse.failed > 0 ? "text-rose-700" : "text-slate-500"}`}>Failed</p>
                    <p className={`mt-2 text-2xl font-semibold ${uploadResponse.failed > 0 ? "text-rose-900" : "text-slate-900"}`}>{formatValue(uploadResponse.failed)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Question count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.question_count ?? uploadResponse.total_question_count)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Embedded count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.embedded_count ?? uploadResponse.total_embedded_count)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Duplicate count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.duplicate_count)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Topic review count</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue(uploadResponse.topic_review_count ?? uploadResponse.total_topic_review_count)}</p>
                  </div>
                </div>

                {Array.isArray(uploadResponse.saved_items) && uploadResponse.saved_items.length > 0 && (
                  <div className="rounded-[1.25rem] border border-green-100 bg-green-50 p-5">
                    <h4 className="text-lg font-semibold text-green-900">Successfully uploaded ({formatValue(uploadResponse.saved)})</h4>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[760px] w-full text-left text-sm">
                        <thead className="border-b border-green-200">
                          <tr>
                            <th className="py-2 px-3 font-semibold text-green-800">Index</th>
                            <th className="py-2 px-3 font-semibold text-green-800">Exam ID</th>
                            <th className="py-2 px-3 font-semibold text-green-800">Subject Code</th>
                            <th className="py-2 px-3 font-semibold text-green-800">Questions</th>
                            <th className="py-2 px-3 font-semibold text-green-800">Status</th>
                            <th className="py-2 px-3 font-semibold text-green-800">Auto-filled</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                          {uploadResponse.saved_items.map((item) => (
                            <tr key={formatValue(item.index)} className="hover:bg-green-100/50">
                              <td className="py-3 px-3">{formatValue(item.index)}</td>
                              <td className="py-3 px-3 break-words font-mono text-xs">{formatValue(item.exam_id)}</td>
                              <td className="py-3 px-3 font-medium">{formatValue(item.subject_code)}</td>
                              <td className="py-3 px-3">{formatValue(item.question_count)}</td>
                              <td className="py-3 px-3">
                                <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                  {formatValue(item.status)}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {Array.isArray(item.auto_filled_fields) && item.auto_filled_fields.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {item.auto_filled_fields.map((field) => (
                                      <span key={formatValue(field)} className="inline-block rounded bg-green-200/70 px-2 py-0.5 text-xs text-green-800">
                                        {formatValue(field)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {Array.isArray(uploadResponse.failed_items) && uploadResponse.failed_items.length > 0 && (
                  <div className="rounded-[1.25rem] border border-rose-100 bg-rose-50 p-5">
                    <h4 className="text-lg font-semibold text-rose-900">Failed uploads ({formatValue(uploadResponse.failed)})</h4>
                    <div className="mt-4 space-y-3">
                      {uploadResponse.failed_items.map((item) => (
                        <div key={formatValue(item.index)} className="rounded-2xl border border-rose-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-semibold text-rose-900">Exam #{formatValue(item.index)}</p>
                              <p className="mt-1 break-words text-sm text-rose-800">{formatValue(item.error)}</p>
                              {Array.isArray(item.details) && item.details.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {item.details.map((detail, idx) => (
                                    <li key={idx} className="text-xs text-rose-700">
                                      - {formatValue(detail)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
            {(importJob || jobStatus) && (
              <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/40 sm:p-4">
                <h3 className="text-lg font-semibold text-slate-900">Import job status</h3>
                <div className="mt-2 text-sm text-slate-700">
                  {importJob?.job_id && <p>Job ID: <span className="font-mono text-xs">{String(importJob.job_id)}</span></p>}
                  {importJob?.status_url && (
                    <p>
                      Status URL: <a className="text-cyan-700" href={importJob.status_url} target="_blank" rel="noreferrer">Open status</a>
                    </p>
                  )}
                  {jobStatus && (
                    <div className="mt-2">
                      {(() => {
                        const raw = String(jobStatus.status || jobStatus.state || "").toLowerCase();
                        const display = raw === "pending" || raw === "" ? "Pending" : raw === "in_progress" || raw === "processing" || raw === "running" ? "Processing" : raw === "completed" || raw === "success" || raw === "done" ? "Completed" : raw === "failed" || raw === "error" || raw === "failed_with_errors" ? "Failed" : (jobStatus.status || jobStatus.state || "Unknown");

                        return (
                          <div>
                            <p className="font-medium">Status: <span className={
                              display === "Completed" ? "text-green-700" : display === "Failed" ? "text-rose-700" : "text-amber-700"
                            }>{display}</span></p>

                            {typeof jobStatus.progress === "number" && (
                              <div className="mt-2 w-full rounded-full bg-white/10 h-2">
                                <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.max(0, Math.min(100, jobStatus.progress))}%` }} />
                              </div>
                            )}

                            {(() => {
                              const reason = jobStatus.error || jobStatus.error_detail || jobStatus.failure_reason || jobStatus.message;
                              return reason ? <p className="mt-2 text-sm text-rose-700">{String(reason)}</p> : null;
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </section>
            )}
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} noValidate className="min-w-0 space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="break-words text-2xl font-semibold text-slate-950">
                  {isBatchMode ? "Batch upload" : "Exam details"}
                </h2>
                <p className="text-sm text-slate-500">
                  {isBatchMode ? "Submit multiple exams at once from JSON." : "These fields are sent directly to POST /admin/exams/import."}
                </p>
              </div>
              {!isBatchMode && (
                <div className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-medium text-cyan-700">
                  {questionProgress.complete}/{questionProgress.total} questions complete
                </div>
              )}
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                Upload scope
                <select
                  value={scopeType}
                  onChange={(event) => {
                    const nextScopeType = event.target.value;
                    setScopeType(nextScopeType);
                    setScopeError("");
                    setIsBatchMode(false);
                    setExam((currentExam) => ({
                      ...currentExam,
                      time: nextScopeType === SCOPE_TYPES.BOARD ? getDefaultBoardTime(boardScope.paper_type) : "3 hours",
                      total_marks: nextScopeType === SCOPE_TYPES.BOARD ? getDefaultBoardMarks(boardScope.paper_type) : 60,
                    }));
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                >
                  <option value={SCOPE_TYPES.UNIVERSITY}>University / College</option>
                  <option value={SCOPE_TYPES.BOARD}>SSC / HSC Board</option>
                </select>
              </label>

              {scopeType === SCOPE_TYPES.UNIVERSITY ? (
                <>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    University
                    <select
                      value={selectedUniversity}
                      onChange={(event) => {
                        setSelectedUniversity(event.target.value);
                        setSelectedDepartment("");
                        setDepartments([]);
                        setScopeError("");
                      }}
                      disabled={universitiesLoading}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                    >
                      <option value="">{universitiesLoading ? "Loading universities..." : "Select university"}</option>
                      {universities.map((university) => {
                        const id = getLookupId(university);
                        return (
                          <option key={id || getLookupLabel(university)} value={id}>
                            {getLookupLabel(university)}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Department
                    <select
                      value={selectedDepartment}
                      onChange={(event) => {
                        setSelectedDepartment(event.target.value);
                        setScopeError("");
                      }}
                      disabled={!selectedUniversity || departmentsLoading || departments.length === 0}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                    >
                      <option value="">
                        {!selectedUniversity
                          ? "Select university first"
                          : departmentsLoading
                            ? "Loading departments..."
                            : "Select department"}
                      </option>
                      {departments.map((department) => {
                        const id = getLookupId(department);
                        return (
                          <option key={id || getLookupLabel(department)} value={id}>
                            {getLookupLabel(department)}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {selectedUniversity && !departmentsLoading && departments.length === 0 && !scopeError && (
                    <p className="text-sm text-amber-700 sm:col-span-2">No departments found for this university.</p>
                  )}
                </>
              ) : (
                <>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Academic level
                    <select
                      value={boardScope.academic_level}
                      onChange={(event) => updateBoardScope("academic_level", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                    >
                      {ACADEMIC_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Group
                    <select
                      value={boardScope.group}
                      onChange={(event) => updateBoardScope("group", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                    >
                      {BOARD_GROUPS.map((group) => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Paper type
                    <select
                      value={boardScope.paper_type}
                      onChange={(event) => updateBoardScope("paper_type", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                    >
                      {PAPER_TYPES.map((paperType) => (
                        <option key={paperType} value={paperType}>{paperType}</option>
                      ))}
                    </select>
                  </label>

                  <div className="space-y-2 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm text-slate-600">
                    <p>Upload CQ, MCQ, and WRITTEN separately. Example: SSC Math 2025 MCQ and SSC Math 2025 CQ are two separate uploads.</p>
                    <p>
                      {boardScope.paper_type === "MCQ"
                        ? "MCQ paper usually has 30 marks and each question should include options. correct_answer is optional."
                        : boardScope.paper_type === "WRITTEN"
                          ? "WRITTEN papers can use section, question_type, instruction, stem, word_box, table_data, and sub_questions. correct_answer is optional."
                          : "CQ paper usually has 70 marks and can use stem and sub_questions."}
                    </p>
                  </div>
                </>
              )}

              {scopeError && <p className="text-sm text-rose-600 sm:col-span-2">{scopeError}</p>}
            </div>

            {isBatchMode ? (
              <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50 p-5">
                <p className="text-sm font-semibold text-cyan-900">Batch mode active</p>
                <p className="mt-2 text-sm text-cyan-800">The JSON import textarea contains a batch of exams. Use the save button below or the import panel button to save all drafts.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Exam name
                    <input
                      value={exam.exam_name}
                      onChange={(event) => updateExam("exam_name", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                      placeholder="Final Examination"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Exam year
                    <input
                      type="number"
                      value={exam.exam_year}
                      onChange={(event) => updateExam("exam_year", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Time
                    <input
                      value={exam.time}
                      onChange={(event) => updateExam("time", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                      placeholder="3 hours"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Subject code
                    <input
                      value={exam.subject_code}
                      onChange={(event) => updateExam("subject_code", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                      placeholder="CSE-421"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    Subject name
                    <input
                      value={exam.subject_name}
                      onChange={(event) => updateExam("subject_name", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                      placeholder="E-Commerce and Web Engineering"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                    Total marks
                    <input
                      type="number"
                      value={exam.total_marks}
                      onChange={(event) => updateExam("total_marks", event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-cyan-400 focus:bg-white"
                    />
                  </label>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Questions</h3>
                      <p className="text-sm text-slate-500">Each question needs a number, text, marks, and topic.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
                    >
                      Add question
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {exam.questions.map((question, index) => (
                      <div key={index} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <h4 className="font-semibold text-slate-900">Question {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>

                        {Array.isArray(question.review_flags) && question.review_flags.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Review flags:</span>
                            {question.review_flags.map((flag, index) => (
                              <span key={`${index}-${String(flag)}`} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                                {String(flag)}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            value={question.question_no}
                            onChange={(event) => updateQuestion(index, "question_no", event.target.value)}
                            placeholder="1(a)"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:bg-white"
                          />
                          <input
                            type="number"
                            value={question.marks}
                            onChange={(event) => updateQuestion(index, "marks", event.target.value)}
                            placeholder="5"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:bg-white"
                          />
                          <input
                            value={question.topic}
                            onChange={(event) => updateQuestion(index, "topic", event.target.value)}
                            placeholder="SEO"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:bg-white sm:col-span-2"
                          />
                          <textarea
                            value={question.question_text}
                            onChange={(event) => updateQuestion(index, "question_text", event.target.value)}
                            placeholder="What is SEO? Explain its importance in E-Commerce."
                            className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:bg-white sm:col-span-2"
                          />
                          <input
                            value={question.formula_latex}
                            onChange={(event) => updateQuestion(index, "formula_latex", event.target.value)}
                            placeholder="Formula (optional)"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:bg-white sm:col-span-2"
                          />
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(question.diagram_required)}
                              onChange={(event) => updateQuestion(index, "diagram_required", event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Diagram Required
                          </label>
                          <input
                            value={question.diagram_reference}
                            onChange={(event) => updateQuestion(index, "diagram_reference", event.target.value)}
                            placeholder="Diagram reference (optional)"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:bg-white"
                          />
                          <textarea
                            value={question.diagram_description}
                            onChange={(event) => updateQuestion(index, "diagram_description", event.target.value)}
                            placeholder="Drawing instruction (optional)"
                            className="min-h-20 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-400 focus:bg-white sm:col-span-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (isBatchMode && !jsonImport.trim())}
              className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? (isBatchMode ? "Saving batch drafts..." : "Saving draft...") : isBatchMode ? "Save batch as drafts" : "Save draft exam"}
            </button>

            {message && (
              <div className={`rounded-[1.25rem] border p-4 text-sm ${
                uploadResponse?.error 
                  ? "border-rose-200 bg-rose-50 text-rose-700" 
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}>
                {formatValue(message)}
              </div>
            )}
          </form>

          <aside className="min-w-0 space-y-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Import JSON</h2>
              <p className="mt-1 text-sm text-slate-500">Paste the admin exam JSON (single or batch) or upload a .json file.</p>
            </div>

            <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <input type="file" accept="application/json,.json" onChange={handleJsonFileChange} className="block w-full text-sm text-slate-700 file:mb-2 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800 sm:file:mb-0" />
              <textarea
                value={jsonImport}
                onChange={(event) => {
                  setJsonFile(null);
                  setJsonImport(event.target.value);
                }}
                placeholder={jsonTemplate}
                className="min-h-48 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleLoadJsonText}
                className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {isBatchMode ? "✓ Batch detected" : "Load JSON"}
              </button>
              <button
                type="button"
                onClick={handleSaveImportedJson}
                disabled={loading || (!jsonFile && !jsonImport.trim())}
                className="w-full rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Saving imported JSON..." : "Save imported JSON as drafts"}
              </button>
              {jsonError && <p className="text-sm text-rose-600">{jsonError}</p>}
              {isBatchMode && (
                <p className="text-xs text-cyan-700 bg-cyan-100 rounded-lg px-3 py-2">
                  ✓ Array of exams detected. Use "Save batch as drafts" or "Save imported JSON as drafts".
                </p>
              )}
            </div>

            {!isBatchMode && (
              <div className="grid gap-3 rounded-[1.5rem] bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Questions ready</span>
                  <span className="font-semibold text-white">
                    {questionProgress.complete}/{questionProgress.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{ width: `${Math.max(12, (questionProgress.complete / Math.max(questionProgress.total, 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-sm text-slate-300">
                  Use the analysis, predictions, and answer pages after submission to explore the stored exam.
                </p>
              </div>
            )}

            <div className="space-y-3 rounded-[1.5rem] border border-cyan-100 bg-cyan-50 p-5 text-sm text-cyan-900">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Publish subject</h3>
                <p className="mt-1 text-sm text-slate-600">Save exams as drafts from the form first, then publish the subject when students should see it.</p>
              </div>
              <select
                value={publishSubjectId}
                onChange={(event) => {
                  const subjectId = event.target.value;
                  const subject = subjects.find((item) => String(item.id) === String(subjectId));
                  setPublishSubjectId(subjectId);
                  setPublishSubjectCode(subject?.subject_code || "");
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-400"
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id || subject.subject_code} value={subject.id}>
                    {formatSubjectLabel(subject)}
                  </option>
                ))}
              </select>
              {publishSubjectCode && <p className="text-xs text-cyan-800/80">Selected code: {formatValue(publishSubjectCode)}</p>}
              <button
                type="button"
                onClick={handlePublishSubject}
                disabled={publishing}
                className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
              >
                {publishing ? "Publishing..." : "Publish subject"}
              </button>
              {publishMessage && <p>{formatValue(publishMessage)}</p>}
              {publishResult && (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Exams published</p>
                    <p className="font-semibold text-slate-950">{formatValue(publishResult.exams_published)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Questions published</p>
                    <p className="font-semibold text-slate-950">{formatValue(publishResult.questions_published)}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2">
                    <p className="text-xs text-slate-500">Embedded</p>
                    <p className="font-semibold text-slate-950">{formatValue(publishResult.embedded_count)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50 p-5 text-sm text-cyan-900">
              <p className="font-semibold">Example subjects loaded</p>
              <div className="mt-3 space-y-2">
                {subjects.slice(0, 4).map((subject, index) => (
                  <div key={formatValue(subject.id, index)} className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="break-words font-medium text-slate-900">{formatSubjectLabel(subject)}</span>
                    <span className="break-words text-slate-500 sm:text-right">{formatValue(subject.id)}</span>
                  </div>
                ))}
                {subjects.length === 0 && <p className="text-cyan-800/80">No subjects loaded yet.</p>}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
