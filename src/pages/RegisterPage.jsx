import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Building2, GraduationCap, LockKeyhole, Mail, Phone, School, UserRound } from "lucide-react";

import { getUniversities, getUniversityDepartments } from "../api/authApi";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/useAuth";
import { ErrorMessage, PasswordInput } from "../components/ui";
import {
  getLookupId,
  getLookupLabel,
  normalizeDepartments,
  normalizeUniversities,
} from "../utils/academicLookups";
import {
  buildAcademicProfilePayload,
  CLASS_LEVEL_OPTIONS,
  CURRICULUM_OPTIONS,
  normalizeAcademicLevel,
  STREAM_GROUP_OPTIONS,
  VISIBLE_ACADEMIC_LEVEL_OPTIONS,
} from "../utils/academicProfile";
import {
  getApiErrorMessage,
  PASSWORD_PATTERN,
  PASSWORD_VALIDATION_MESSAGE,
  PHONE_PATTERN,
  PHONE_VALIDATION_MESSAGE,
} from "../utils/auth";

const SUPPORT_EMAIL = "[support@qarena.me](mailto:support@qarena.me)";

const inputClassName =
"mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const selectClassName =
"mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const levelIconMap = {
  university: GraduationCap,
  ssc: School,
  hsc: BookOpen,
};

const levelDescriptionMap = {
  university: "Higher education",
  ssc: "Secondary level",
  hsc: "Higher secondary",
};

function FormSectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
    </div>
  );
}

function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    academic_level: "university",
    institution_type: "university",
    curriculum: "university_specific",
    stream_group: "",
    class_level: "",
    university_id: "",
    department_id: "",
    program: "",
    batch_session: "",
    institution_name: "",
    password: "",
    confirm_password: "",
    terms_accepted: false,
  });
  const [universities, setUniversities] = useState([]);
  const [universitiesLoading, setUniversitiesLoading] = useState(true);
  const [universitiesError, setUniversitiesError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const academicLevel = normalizeAcademicLevel(form.academic_level) || "university";
  const isUniversityLevel = academicLevel === "university";
  const isSecondaryLevel = academicLevel === "ssc" || academicLevel === "hsc";
  const isAcademicScopeReady =
    (isUniversityLevel && Boolean(form.university_id && form.department_id)) ||
    (isSecondaryLevel && Boolean(form.curriculum && form.stream_group));

  const academicLevelOptions = VISIBLE_ACADEMIC_LEVEL_OPTIONS;
  const classLevelOptions = academicLevel === "ssc" ? CLASS_LEVEL_OPTIONS.ssc : CLASS_LEVEL_OPTIONS.hsc;

  useEffect(() => {
    let isMounted = true;

    async function loadUniversities() {
      if (!isUniversityLevel) {
        setUniversities([]);
        setUniversitiesError("");
        setUniversitiesLoading(false);
        return;
      }

      setUniversitiesLoading(true);
      setUniversitiesError("");

      try {
        const response = await getUniversities();
        if (isMounted) {
          setUniversities(normalizeUniversities(response.data));
        }
      } catch (err) {
        if (isMounted) {
          setUniversitiesError(getApiErrorMessage(err, "Unable to load universities."));
          setUniversities([]);
        }
      } finally {
        if (isMounted) {
          setUniversitiesLoading(false);
        }
      }
    }

    loadUniversities();
    return () => {
      isMounted = false;
    };
  }, [isUniversityLevel]);

  useEffect(() => {
    let isMounted = true;

    async function loadDepartments() {
      if (!isUniversityLevel || !form.university_id) {
        setDepartments([]);
        setDepartmentsError("");
        setDepartmentsLoading(false);
        return;
      }

      setDepartments([]);
      setDepartmentsError("");
      setDepartmentsLoading(true);

      try {
        const response = await getUniversityDepartments(form.university_id);

        if (isMounted) {
          setDepartments(normalizeDepartments(response.data));
        }
      } catch (err) {
        if (isMounted) {
          setDepartmentsError(getApiErrorMessage(err, "Could not load departments. Please try again."));
          setDepartments([]);
        }
      } finally {
        if (isMounted) {
          setDepartmentsLoading(false);
        }
      }
    }

    loadDepartments();
    return () => {
      isMounted = false;
    };
  }, [form.university_id, isUniversityLevel]);

  function updateField(field, value) {
    if (field === "academic_level") {
      const nextLevel = normalizeAcademicLevel(value) || "university";

      setForm((current) => ({
        ...current,
        academic_level: nextLevel,
        institution_type: nextLevel === "university" ? "university" : nextLevel === "ssc" ? "school" : "college",
        curriculum: nextLevel === "university" ? "university_specific" : "national",
        stream_group: "",
        class_level: "",
        university_id: "",
        department_id: "",
        program: "",
        batch_session: "",
        institution_name: "",
      }));
      setDepartments([]);
      setDepartmentsError("");
      return;
    }

    if (field === "university_id") {
      setForm((current) => ({
        ...current,
        university_id: value,
        department_id: "",
      }));
      setDepartments([]);
      setDepartmentsError("");
      return;
    }

    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleUniversityChange(value) {
    updateField("university_id", value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.phone_number.trim() ||
      !academicLevel ||
      !form.password ||
      !form.confirm_password
    ) {
      if (!academicLevel) {
        setError("Academic level is required.");
      } else if (isUniversityLevel && !form.university_id) {
        setError("University is required.");
      } else if (isUniversityLevel && !form.department_id) {
        setError("Department is required.");
      } else if (isSecondaryLevel && !form.curriculum) {
        setError("Curriculum is required.");
      } else if (isSecondaryLevel && !form.stream_group) {
        setError("Group is required.");
      } else {
        setError("All fields are required.");
      }
      setLoading(false);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!PHONE_PATTERN.test(form.phone_number.trim())) {
      setError(PHONE_VALIDATION_MESSAGE);
      setLoading(false);
      return;
    }

    if (!PASSWORD_PATTERN.test(form.password)) {
      setError(PASSWORD_VALIDATION_MESSAGE);
      setLoading(false);
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Password and confirm password do not match.");
      setLoading(false);
      return;
    }

    if (!form.terms_accepted) {
      setError("You must accept the terms before creating an account.");
      setLoading(false);
      return;
    }

    try {
      const academicPayload = buildAcademicProfilePayload({
        academic_level: academicLevel,
        institution_type: form.institution_type,
        curriculum: form.curriculum,
        stream_group: form.stream_group,
        class_level: form.class_level,
        university_id: form.university_id,
        department_id: form.department_id,
        program: form.program,
        batch_session: form.batch_session,
      });

      if (isUniversityLevel && (!form.university_id || !form.department_id)) {
        setError(!form.university_id ? "University is required." : "Department is required.");
        setLoading(false);
        return;
      }

      if (isSecondaryLevel && (!form.curriculum || !form.stream_group)) {
        if (!form.curriculum) {
          setError("Curriculum is required.");
        } else {
          setError("Group is required.");
        }
        setLoading(false);
        return;
      }

      const data = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        password: form.password,
        terms_accepted: true,
        ...academicPayload,
      });
      setSuccess(data?.message || "Account created successfully. Please verify your email.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed. Email or phone number may already be used."));
    } finally {
      setLoading(false);
    }
  }

return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-white py-6 flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-[820px]">
        <div className="mx-auto rounded-3xl bg-white border border-slate-100 shadow-md p-4 sm:p-6">

          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center">
              <BrandLogo
                imageClassName="h-10 w-10"
                textClassName="text-lg font-black tracking-tight text-slate-950"
              />
            </Link>

            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-blue-700 hover:text-blue-800">
                Login
              </Link>
            </p>
          </div>

          <div className="mt-4">
            <p className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">CREATE YOUR ACCOUNT</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Create your account</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Set up your learning profile to personalize Q Arena for your studies.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <section>
              <label className="text-sm font-bold text-slate-800">Academic level</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {academicLevelOptions.map((option) => {
                  const Icon = levelIconMap[option.value] || GraduationCap;
                  const active = academicLevel === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("academic_level", option.value)}
                      className={`flex h-12 items-center justify-center gap-3 rounded-xl border px-3 text-sm font-bold transition ${
                        active
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm shadow-blue-100"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"
                      }`}
                      aria-pressed={active}
                    >
                      <Icon className="h-5 w-5" />
                      <span>
                        {option.label}
                        <span className="sr-only">{levelDescriptionMap[option.value] || "Student profile"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="pt-3">
              <FormSectionHeader icon={UserRound} title="Account details" />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
                  Full name
                  <input
                    value={form.full_name}
                    onChange={(event) => updateField("full_name", event.target.value)}
                    required
                    className={inputClassName}
                    placeholder="Your full name"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Email address
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-[calc(50%+4px)] h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      required
                      className={`${inputClassName} pl-11`}
                      placeholder="you@example.com"
                    />
                  </div>
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Phone number
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-[calc(50%+4px)] h-4 w-4 text-slate-400" />
                    <input
                      value={form.phone_number}
                      onChange={(event) => updateField("phone_number", event.target.value)}
                      required
                      className={`${inputClassName} pl-11`}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="pt-3">
              <FormSectionHeader icon={Building2} title="Academic profile" />

              {isUniversityLevel ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">
                    University
                    <select
                      value={form.university_id}
                      onChange={(event) => handleUniversityChange(event.target.value)}
                      required
                      disabled={universitiesLoading}
                      className={selectClassName}
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

                  <label className="block text-sm font-bold text-slate-700">
                    Department
                    <select
                      value={form.department_id}
                      onChange={(event) => updateField("department_id", event.target.value)}
                      required
                      disabled={!form.university_id || departmentsLoading || departments.length === 0}
                      className={selectClassName}
                    >
                      <option value="">
                        {!form.university_id
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

                  <label className="block text-sm font-bold text-slate-700">
                    Program / degree <span className="font-medium text-slate-400">(optional)</span>
                    <input
                      value={form.program}
                      onChange={(event) => updateField("program", event.target.value)}
                      className={inputClassName}
                      placeholder="e.g. BSc in Computer Science"
                    />
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Batch / session <span className="font-medium text-slate-400">(optional)</span>
                    <input
                      value={form.batch_session}
                      onChange={(event) => updateField("batch_session", event.target.value)}
                      className={inputClassName}
                      placeholder="e.g. 2023-24"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">
                    Curriculum
                    <select
                      value={form.curriculum}
                      onChange={(event) => updateField("curriculum", event.target.value)}
                      required
                      className={selectClassName}
                    >
                      {CURRICULUM_OPTIONS.filter((option) => option.value !== "university_specific").map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Group / Stream
                    <select
                      value={form.stream_group}
                      onChange={(event) => updateField("stream_group", event.target.value)}
                      required
                      className={selectClassName}
                    >
                      <option value="">Select group</option>
                      {STREAM_GROUP_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Class level <span className="font-medium text-slate-400">(optional)</span>
                    <select
                      value={form.class_level}
                      onChange={(event) => updateField("class_level", event.target.value)}
                      className={selectClassName}
                    >
                      <option value="">No class level</option>
                      {classLevelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Institution / school name <span className="font-medium text-slate-400">(optional)</span>
                    <input
                      value={form.institution_name}
                      onChange={(event) => updateField("institution_name", event.target.value)}
                      className={inputClassName}
                      placeholder="Optional, not used for subject scoping"
                    />
                  </label>
                </div>
              )}

              <div className="mt-2 space-y-2">
                {universitiesError && <ErrorMessage tone="warning">{universitiesError}</ErrorMessage>}
                {departmentsError && <ErrorMessage tone="warning">{departmentsError}</ErrorMessage>}
                {isUniversityLevel && form.university_id && !departmentsLoading && !departmentsError && departments.length === 0 && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    If you can't find your department, please contact{' '}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-blue-700">
                      {SUPPORT_EMAIL}
                    </a>
                    .
                  </div>
                )}
              </div>
            </section>

            <section className="pt-3">
              <FormSectionHeader icon={LockKeyhole} title="Security" />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-700">
                  Password
                  <PasswordInput
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    required
                    minLength={8}
                    placeholder="Choose a password"
                    className={`${inputClassName} pr-11`}
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Confirm password
                  <PasswordInput
                    value={form.confirm_password}
                    onChange={(event) => updateField("confirm_password", event.target.value)}
                    required
                    placeholder="Repeat your password"
                    className={`${inputClassName} pr-11`}
                  />
                </label>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.terms_accepted}
                  onChange={(event) => updateField("terms_accepted", event.target.checked)}
                  required
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  I accept the{' '}
                  <Link to="/terms-of-service" className="font-bold text-blue-700 hover:text-blue-800">
                    terms of service
                  </Link>
                  .
                </span>
              </label>
            </section>

            {(error || success) && (
              <div>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                {success && <ErrorMessage tone="success">{success}</ErrorMessage>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isAcademicScopeReady}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-700 hover:text-blue-800">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default RegisterPage;
