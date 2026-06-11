import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export const RATE_LIMIT_MESSAGE = "Too many requests. Please try again later.";

export function getApiStatus(error) {
  return error?.response?.status ?? error?.status ?? null;
}

export function isApiTimeoutError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "ECONNABORTED" || message.includes("timeout");
}

export function isApiNetworkError(error) {
  return error?.code === "ERR_NETWORK" || (!error?.response && !isApiTimeoutError(error));
}

export function getAnswerBuilderErrorKind(error) {
  const status = getApiStatus(error);

  if (isApiTimeoutError(error) || status === 504) {
    return "timeout";
  }

  if (isApiNetworkError(error)) {
    return "network";
  }

  if (status === 429 || status === 503) {
    return "rate-limit";
  }

  if (status === 500 || status === 502) {
    return "server";
  }

  return "unknown";
}

function getErrorDetailText(error) {
  const detail = error?.response?.data?.detail ?? error?.response?.data?.message ?? error?.data?.detail ?? error?.data?.message;

  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail || "").trim();
}

export function getAnswerGenerationErrorMessage(error, fallback = "Unable to generate answer.") {
  const status = getApiStatus(error);
  const detailText = getErrorDetailText(error);

  if (status === 401) {
    return detailText || "Your session has expired. Please login again.";
  }

  if (status === 403) {
    return detailText || "You do not have permission to generate this answer.";
  }

  if (status === 404) {
    return detailText || "Subject or endpoint not found.";
  }

  if (status === 422) {
    return detailText || "Request format problem. Please check question payload.";
  }

  if (status === 429) {
    return detailText || RATE_LIMIT_MESSAGE;
  }

  if (status === 500) {
    return detailText || "Backend/AI answer generation failed.";
  }

  return detailText || error?.message || fallback;
}

export function logAnswerGenerationError(endpoint, payload, error) {
  const safePayload = payload && typeof payload === "object" ? { ...payload } : payload;

  console.error("Answer generation request failed", {
    endpoint,
    status: getApiStatus(error),
    responseData: error?.response?.data ?? error?.data ?? null,
    payload: safePayload,
  });
}

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      const responseData = error.response.data || {};
      const retryAfter = formatRetryAfter(error.response.headers?.["retry-after"]);
      const message = responseData.quota
        ? responseData.detail || "Monthly AI answer quota exceeded."
        : retryAfter
          ? `${RATE_LIMIT_MESSAGE} Wait ${retryAfter}.`
          : RATE_LIMIT_MESSAGE;
      error.message = message;
      error.response.data = responseData.quota
        ? responseData
        : {
          ...responseData,
          detail: message,
        };
      window.dispatchEvent(new CustomEvent("api:rate-limit", { detail: { message } }));
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:logout"));

      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }

    if (
      error.response?.status === 403 &&
      error.response.data?.detail !== "Please verify your email before logging in." &&
      error.response.data?.message !== "Please verify your email before logging in."
    ) {
      window.dispatchEvent(new Event("auth:forbidden"));
    }

    return Promise.reject(error);
  },
);

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token");
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth:logout"));
    window.location.assign("/login");
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (
    response.status === 403 &&
    data?.detail !== "Please verify your email before logging in." &&
    data?.message !== "Please verify your email before logging in."
  ) {
    window.dispatchEvent(new Event("auth:forbidden"));
  }

  if (!response.ok) {
    const quotaMessage = response.status === 429 && data?.quota ? data.detail || "Monthly AI answer quota exceeded." : "";
    const rateLimitMessage = response.status === 429 && !data?.quota ? getRateLimitMessage(response.headers.get("Retry-After")) : "";
    const error = new Error(rateLimitMessage || data?.detail || data?.message || "Request failed.");
    error.status = response.status;
    error.data = rateLimitMessage ? { ...(data || {}), detail: rateLimitMessage } : data;

    if (response.status === 429) {
      window.dispatchEvent(new CustomEvent("api:rate-limit", { detail: { message: quotaMessage || rateLimitMessage } }));
    }

    throw error;
  }

  return data;
}

function formatRetryAfter(value) {
  if (!value) {
    return "";
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    if (seconds <= 0) {
      return "a moment";
    }

    if (seconds < 60) {
      return `${Math.ceil(seconds)} second${Math.ceil(seconds) === 1 ? "" : "s"}`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const retryDate = Date.parse(value);
  if (Number.isNaN(retryDate)) {
    return "";
  }

  const secondsUntilRetry = Math.ceil((retryDate - Date.now()) / 1000);
  return formatRetryAfter(String(secondsUntilRetry));
}

function getRateLimitMessage(retryAfter) {
  const waitTime = formatRetryAfter(retryAfter);
  return waitTime ? `${RATE_LIMIT_MESSAGE} Wait ${waitTime}.` : RATE_LIMIT_MESSAGE;
}

function encodePath(value) {
  return encodeURIComponent(String(value).trim());
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function normalizePaperTypeParam(value) {
  const paperType = String(value ?? "").trim().toUpperCase();
  return paperType === "CQ" || paperType === "MCQ" || paperType === "WRITTEN" ? paperType : undefined;
}

function buildPaperTypeParams(params = {}) {
  const paperType = normalizePaperTypeParam(params.paper_type ?? params.paperType);
  return {
    ...params,
    paperType: undefined,
    paper_type: paperType,
  };
}

function normalizeBoardPaperTypeParam(value) {
  const paperType = String(value ?? "").trim().toUpperCase();
  return paperType === "CQ" || paperType === "MCQ" || paperType === "WRITTEN" ? paperType : undefined;
}

function buildBoardPaperParams(params = {}) {
  const academicLevel = String(params.academic_level ?? params.academicLevel ?? "").trim().toUpperCase();

  if (!academicLevel) {
    throw new Error("academic_level is required to load board papers.");
  }

  const paperType = normalizeBoardPaperTypeParam(params.paper_type ?? params.paperType);
  const normalizedParams = new URLSearchParams();

  normalizedParams.set("academic_level", academicLevel);

  if (params.subject_code) normalizedParams.set("subject_code", String(params.subject_code).trim());
  if (params.board_name) normalizedParams.set("board_name", String(params.board_name).trim());
  if (params.exam_year) normalizedParams.set("exam_year", String(params.exam_year).trim());
  if (paperType) normalizedParams.set("paper_type", paperType);
  if (params.group) normalizedParams.set("group", String(params.group).trim());

  return normalizedParams.toString();
}

const TUTOR_EXPLAIN_PATH = (id) => {
  const base = String(API_BASE_URL || "");
  return base.includes("/api/v1")
    ? `/tutor/questions/${encodePath(id)}/explain`
    : `/v1/tutor/questions/${encodePath(id)}/explain`;
};

export const apiEndpoints = {
  register: (payload) => API.post("/auth/register", payload),
  login: (payload) =>
    API.post("/auth/login", {
      email: payload?.email?.trim() || "",
      password: payload?.password || "",
    }),
  getCurrentUser: () => API.get("/auth/me"),
  updateCurrentUserProfile: (payload) => API.patch("/auth/me/profile", payload),
  verifyEmail: (payload) => API.post("/auth/verify-email", payload),
  resendVerificationEmail: (payload) => API.post("/auth/resend-verification-email", payload),
  forgotPassword: (payload) => API.post("/auth/forgot-password", payload),
  resetPassword: (payload) => API.post("/auth/reset-password", payload),
  getUniversities: () => API.get("/universities"),
  getUniversityDepartments: (universityId) => API.get(`/universities/${encodePath(universityId)}/departments`),
  health: () => API.get("/health"),
  searchSubject: (query) => API.get("/subjects/search", { params: { query } }),
  getSubjectOverview: (subjectCode) => API.get(`/subjects/${encodePath(subjectCode)}/overview`),
  getSubjects: (params) => API.get("/subjects", { params }),
  getSubjectQuestions: (subjectCode, params) =>
    API.get(`/subjects/${encodePath(subjectCode)}/questions`, { params: buildPaperTypeParams(params) }),
  listBoardPapers: (filters = {}) => API.get(`/papers/board?${buildBoardPaperParams(filters)}`).then((response) => response.data),
  getBoardPaperById: (examId) => API.get(`/papers/board/${encodePath(examId)}`),
  searchQuestions: (payload) => API.post("/search", payload),
  getSubjectAnalysis: (subjectCode, params = {}) =>
    API.get(`/subjects/${encodePath(subjectCode)}/analysis`, { params: buildPaperTypeParams(params) }),
  getPredictions: (subjectCode, params = {}) =>
    API.get(`/subjects/${encodePath(subjectCode)}/predictions`, { params: buildPaperTypeParams(params) }),
  getSubjectPrediction: (subjectCode, params = {}) =>
    API.get(`/subjects/${encodePath(subjectCode)}/predictions`, { params: buildPaperTypeParams(params) }),
  getSubjectSuggestions: (subjectCode, params) =>
    API.get(`/subjects/${encodePath(subjectCode)}/suggestions`, { params: buildPaperTypeParams(params) }),
  getSuggestions: ({ subject_code, query, top_k, paper_type }) =>
    API.get(`/subjects/${encodePath(subject_code)}/suggestions`, {
      params: buildPaperTypeParams({ query, top_k, paper_type }),
    }),
  generateAnswer: (payload) => API.post("/generate-answer", payload),
  generateQuestionAnswer: (payload) => API.post("/generate-answer", payload),
  // Tutor metadata-only explanation endpoint
  explainTutorQuestion: (questionId, payload) =>
    API.post(TUTOR_EXPLAIN_PATH(questionId), payload),
  submitFeedback: (payload) => API.post("/feedback", payload),
  getPublicFeedback: (params) => API.get("/feedback/public", { params }),
  getDonationInfo: () => API.get("/donation-info"),
  trackVisit: (payload) => API.post("/analytics/visit", payload),
  getAdminFeedback: (params) => API.get("/admin/feedback", { params }),
  updateAdminFeedbackStatus: (feedbackId, status) =>
    API.patch(`/admin/feedback/${encodePath(feedbackId)}/status`, { status }),
  getAdminAnalyticsSummary: () => API.get("/admin/analytics/summary"),
  listAdminUniversities: () => API.get("/admin/universities"),
  createUniversity: (payload) => API.post("/admin/universities", payload),
  updateUniversity: (universityId, payload) => API.patch(`/admin/universities/${encodePath(universityId)}`, payload),
  deleteUniversity: (universityId) => API.delete(`/admin/universities/${encodePath(universityId)}`),
  listAdminDepartments: () => API.get("/admin/departments"),
  createDepartment: (payload) => API.post("/admin/departments", payload),
  updateDepartment: (departmentId, payload) => API.patch(`/admin/departments/${encodePath(departmentId)}`, payload),
  deleteDepartment: (departmentId) => API.delete(`/admin/departments/${encodePath(departmentId)}`),
  importAdminExams: (payload) => API.post("/admin/exams/import", payload, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  }),
  getJobStatus: (jobId) => API.get(`/jobs/${encodePath(jobId)}`),
  importAdminExamFile: (file, scope = {}) => {
    const formData = new FormData();
    if (scope.university_id !== undefined && scope.university_id !== null && scope.university_id !== "") {
      formData.append("university_id", scope.university_id);
    }
    if (scope.department_id !== undefined && scope.department_id !== null && scope.department_id !== "") {
      formData.append("department_id", scope.department_id);
    }
    formData.append("file", file);
    return API.post("/admin/exams/import", formData);
  },
  publishSubject: (subjectId) => API.post(`/admin/subjects/id/${encodePath(subjectId)}/publish`),
  deleteSubject: (subjectId) => API.delete(`/admin/subjects/id/${encodePath(subjectId)}`),
  deleteSubjectTopic: (subjectCode, topicName) => API.delete(`/admin/subjects/${encodePath(subjectCode)}/topics/${encodePath(topicName)}`),
  getSystemStatus: () => API.get("/debug/system-status"),
};

export function listAdminUniversities() {
  return API.get("/admin/universities");
}

export function createUniversity(payload) {
  return API.post("/admin/universities", payload);
}

export function updateUniversity(universityId, payload) {
  return API.patch(`/admin/universities/${encodePath(universityId)}`, payload);
}

export function deleteUniversity(universityId) {
  return API.delete(`/admin/universities/${encodePath(universityId)}`);
}

export function listAdminDepartments() {
  return API.get("/admin/departments");
}

export function createDepartment(payload) {
  return API.post("/admin/departments", payload);
}

export function updateDepartment(departmentId, payload) {
  return API.patch(`/admin/departments/${encodePath(departmentId)}`, payload);
}

export function deleteDepartment(departmentId) {
  return API.delete(`/admin/departments/${encodePath(departmentId)}`);
}

export function listBoardPapers(filters = {}) {
  return API.get(`/papers/board?${buildBoardPaperParams(filters)}`).then((response) => response.data);
}

export function getBoardPaperById(examId) {
  if (!examId) {
    throw new Error("examId is required");
  }

  return API.get(`/papers/board/${encodePath(examId)}`).then((response) => response.data);
}

export async function downloadPredictionPdf(subjectCode, params = {}) {
  if (!subjectCode) {
    throw new Error("subjectCode is required");
  }

  const response = await API.get(`/subjects/${encodePath(subjectCode)}/predictions/export/pdf`, {
    params: buildPaperTypeParams(params),
    responseType: "blob",
  });

  // Try to read filename from Content-Disposition header
  const contentDisposition = response.headers && (response.headers["content-disposition"] || response.headers["Content-Disposition"] || "");
  let filename = `q-arena-predictions-${String(subjectCode).trim()}.pdf`;

  if (contentDisposition) {
    // Common patterns: filename="name.pdf" or filename*=UTF-8''name.pdf
    const filenameRegex = /filename\*=UTF-8''([^;\n\r]+)|filename="([^";\n\r]+)"|filename=([^;\n\r]+)/i;
    const matches = filenameRegex.exec(contentDisposition);
    if (matches) {
      const raw = matches[1] || matches[2] || matches[3] || "";
      try {
        filename = decodeURIComponent(raw.replace(/^["']|["']$/g, ""));
      } catch (e) {
        filename = raw.replace(/^["']|["']$/g, "");
      }
    }
  }

  return {
    data: response.data,
    filename,
  };
}

export { buildQuery };

export default API;
