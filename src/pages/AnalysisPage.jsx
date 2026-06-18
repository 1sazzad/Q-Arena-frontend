import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate, NavLink } from "react-router-dom";
import { apiEndpoints } from "../api/api";
import { Badge, Card, EmptyState, LoadingSpinner } from "../components/ui";

import PublicSidebar from "../components/PublicSidebar";
import { Search as SearchIcon, Bell, Menu, X } from "lucide-react";

// Sample fallback data used only when API fails
const SAMPLE = {
  subject: { subject_code: "510225", subject_name: "Linear Algebra" },
  summary: { total_questions: 1240, repeated_topics: 18, high_weightage_topics: 7, exam_coverage: 87, available_years: [2019,2020,2021,2022,2023,2024] },
  topic_frequency: [
    { topic: "Eigenvalues & Eigenvectors", count: 152, marks: 420 },
    { topic: "Determinants", count: 110, marks: 300 },
    { topic: "Matrix Inverse", count: 86, marks: 210 },
    { topic: "Linear Transformations", count: 72, marks: 190 },
    { topic: "Vector Spaces", count: 61, marks: 160 },
    { topic: "Orthogonality", count: 48, marks: 130 },
    { topic: "Rank of Matrix", count: 36, marks: 90 },
  ],
  year_wise_topic_trend: [
    { year: 2019, count: 120 }, { year: 2020, count: 140 }, { year: 2021, count: 180 }, { year: 2022, count: 260 }, { year: 2023, count: 320 }, { year: 2024, count: 420 }
  ],
  question_type_distribution: [
    { type: "Proof / Theory", percent: 34 }, { type: "Conceptual", percent: 28 }, { type: "Application / Numerical", percent: 26 }, { type: "Short Answer", percent: 12 }
  ],
  repeated_patterns: [
    { label: "Find eigenvalues and eigenvectors of matrix A.", count: 5 },
    { label: "Compute determinant of given matrix.", count: 4 },
    { label: "Show whether given set is basis of R^n.", count: 3 },
  ],
  recommended_focus: [
    { topic: "Eigenvalues & Eigenvectors", priority: "High" },
    { topic: "Determinants", priority: "High" },
    { topic: "Matrix Inverse", priority: "Medium" },
    { topic: "Linear Transformations", priority: "Medium" },
    { topic: "Orthogonality", priority: "Low" },
  ],
  insights: [
    "Eigenvalues & Eigenvectors is the most frequent topic.",
    "Determinants and Matrix Inverse repeat consistently and carry high marks.",
    "Question count has steadily increased, peaking in 2024.",
  ],
};

function HorizontalBar({ value = 0, color = "bg-indigo-500" }) {
  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function SimpleSparkline({ points = [] }) {
  if (!points || points.length === 0) return null;
  const w = 220;
  const h = 60;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = w / Math.max(1, points.length - 1);
  const pts = points.map((p, i) => `${i * step},${h - ((p - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ data = [], size = 120 }) {
  const total = data.reduce((s, d) => s + (d.percent || 0), 0) || 100;
  const reduced = data.reduce((accObj, d) => {
    const start = accObj.total;
    const end = accObj.total + (d.percent || 0);
    const startPct = (start / total) * 100;
    const endPct = (end / total) * 100;
    accObj.stops.push(`${d.color || "#6366f1"} ${startPct}% ${endPct}%`);
    accObj.total = end;
    return accObj;
  }, { stops: [], total: 0 });
  const stops = reduced.stops.join(", ");
  const style = { width: size, height: size, borderRadius: "50%", background: `conic-gradient(${stops})` };
  return (
    <div className="flex items-center gap-4">
      <div style={style} className="relative flex items-center justify-center">
        <div style={{ width: size * 0.6, height: size * 0.6, borderRadius: "50%" }} className="bg-white" />
      </div>
      <div className="text-sm">
        {data.map((d) => (
          <div key={d.type} className="flex items-center gap-2">
            <span style={{ background: d.color || '#6366f1' }} className="inline-block h-2 w-2 rounded-full" />
            <span className="text-slate-700">{d.type}</span>
            <span className="ml-2 font-semibold text-slate-900">{d.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectCode: routeSubjectCode } = useParams();
  const resolvedFromLocation = (() => {
    if (location.state && (location.state.subject_code || location.state.subjectCode)) return location.state.subject_code || location.state.subjectCode;
    const params = new URLSearchParams(location.search);
    return params.get("subject_code") || params.get("subjectCode") || "";
  })();
  const initialCode = routeSubjectCode || resolvedFromLocation || "";

  const [subjectCode] = useState(initialCode);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!subjectCode) return;
    let active = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setUsingFallback(false);
        setStatusMessage("");
        const response = await apiEndpoints.getSubjectAnalysis(subjectCode);
        if (!active) return;
        const payload = response?.data ?? response ?? null;
        if (!payload) setData(null);
        else setData(payload);
      } catch {
        if (!active) return;
        setUsingFallback(true);
        setData(SAMPLE);
        setStatusMessage("Showing sample analysis because subject analysis API is not connected yet.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => { active = false; };
  }, [subjectCode]);

  if (loading) return <LoadingSpinner label="Loading analysis..." />;
  if (!data && !usingFallback) return <EmptyState title="No analysis data" description="No analysis data found for this subject yet." />;

  const subject = usingFallback ? SAMPLE.subject : (data.subject || {});
  const summary = usingFallback ? SAMPLE.summary : (data.summary || {});
  const topicFrequency = usingFallback ? SAMPLE.topic_frequency : (data.topic_frequency || []);
  const yearTrend = usingFallback ? SAMPLE.year_wise_topic_trend : (data.year_wise_topic_trend || []);
  const qTypeDist = usingFallback ? SAMPLE.question_type_distribution : (data.question_type_distribution || []);
  const repeated = usingFallback ? SAMPLE.repeated_patterns : (data.repeated_patterns || []);
  const recommended = usingFallback ? SAMPLE.recommended_focus : (data.recommended_focus || []);
  const insights = usingFallback ? SAMPLE.insights : (data.insights || []);

  const SUBJECT_NAME_MAP = {
    "510225": "Linear Algebra",
    "510221": "Digital Systems Design",
    "510223": "Discrete Mathematics",
  };

  const resolvedSubjectCode = String(subject.subject_code || subjectCode || "").trim();
  const subjectTitle = subject.subject_name || SUBJECT_NAME_MAP[resolvedSubjectCode] || resolvedSubjectCode || "Analysis";
  const pageTitle = subjectTitle === "Analysis" ? "Analysis" : `${subjectTitle} Analysis`;

  // topic frequency normalization
  const normalizeTopicFrequency = (arr) => {
    if (!Array.isArray(arr)) return [];
    const m = {};
    arr.forEach((it) => {
      const name = (it.topic || it.name || "").toString().trim();
      const count = Number(it.count ?? it.frequency ?? it.total ?? it.questions ?? 0) || 0;
      if (!name) return;
      m[name] = (m[name] || 0) + count;
    });
    const list = Object.keys(m).map(k => ({ topic: k, count: m[k] }));
    list.sort((a,b) => b.count - a.count);
    return list.slice(0,7);
  };

  const normalizedTopics = normalizeTopicFrequency(topicFrequency);
  const maxTopicCount = normalizedTopics.length ? Math.max(...normalizedTopics.map(t=>t.count)) : 1;

  // year trend normalization (accepts multiple key names, aggregates duplicates, keeps last 6 years)
  const normalizeYearTrend = (arr) => {
    if (!Array.isArray(arr)) return [];

    const totalsByYear = {};

    arr.forEach((item) => {
      const year = Number(item.year || item.exam_year || item.question_year);
      if (!Number.isFinite(year)) return;

      const rawCount =
        item.count ??
        item.questions ??
        item.total_questions ??
        item.total ??
        item.frequency ??
        null;

      const count = rawCount == null ? 1 : Number(rawCount) || 0;

      totalsByYear[year] = (totalsByYear[year] || 0) + count;
    });

    return Object.keys(totalsByYear)
      .map((year) => ({
        year: Number(year),
        count: totalsByYear[year],
      }))
      .sort((a, b) => a.year - b.year)
      .slice(-6);
  };

  const normalizedYear = normalizeYearTrend(yearTrend);
  const yearPoints = normalizedYear.map((y) => y.count);

  // repeated normalization (accepts multiple keys, removes blanks/zeros, sorts desc, top 5)
  const normalizeRepeated = (arr) => {
    if (!Array.isArray(arr)) return [];

    return arr
      .map((item) => {
        const label = (
          item.label ||
          item.question ||
          item.question_text ||
          item.pattern ||
          item.text ||
          ""
        )
          .toString()
          .trim();

        const count = Number(
          item.count ??
            item.repeat_count ??
            item.repeated_count ??
            item.times ??
            item.frequency ??
            0
        );

        return { label, count };
      })
      .filter((item) => item.label && item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const normalizedRepeated = normalizeRepeated(repeated);

  const normalizedRecommended = (Array.isArray(recommended) ? recommended : []).map(r => ({ topic: (r.topic || r.name || '').toString().trim(), priority: r.priority || 'Medium' })).filter(r=>r.topic).slice(0,5);
  const normalizedInsights = (Array.isArray(insights) ? insights.filter(i=>i && i.toString().trim()) : []).slice(0,3);

  function renderHeader() {
    return (
      <div>
        <div className="text-xs font-semibold text-indigo-600">Study Analysis</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">Understand question patterns, topic trends, and exam focus areas.</p>
      </div>
    );
  }

  function renderFilters() {
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-xs text-slate-500">Subject</div>
            <div className="mt-1 text-sm font-semibold">{subjectTitle}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Exam Type</div>
            <select className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <option>All</option>
              <option>Final</option>
              <option>Midterm</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500">Time Range</div>
            <select className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <option>Last 5 years</option>
              <option>Last 3 years</option>
              <option>Last year</option>
            </select>
          </div>
          <div className="ml-auto">
            <button disabled className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Export <span className="text-xs text-slate-400">(Coming soon)</span></button>
          </div>
        </div>
      </Card>
    );
  }

  function renderSummaryCards() {
    const examsText = (summary.available_years && summary.available_years.length) ? `Across ${summary.available_years.length} exams` : "Across past exams";
    const totalQuestions = Number(summary.total_questions) || 0;
    const repeatedTopics = Number(summary.repeated_topics) || 0;
    const highWeight = Number(summary.high_weightage_topics) || 0;
    const examCoverage = Number.isFinite(Number(summary.exam_coverage)) ? Number(summary.exam_coverage) : "—";

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Questions Analyzed</div>
          <div className="mt-2 text-2xl font-semibold">{totalQuestions}</div>
          <div className="mt-1 text-xs text-slate-500">{examsText}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Repeated Topics</div>
          <div className="mt-2 text-2xl font-semibold">{repeatedTopics}</div>
          <div className="mt-1 text-xs text-slate-500">Appeared 3+ times</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">High Weightage Topics</div>
          <div className="mt-2 text-2xl font-semibold">{highWeight}</div>
          <div className="mt-1 text-xs text-slate-500">{examCoverage === "—" ? "—" : `${examCoverage}%`} of total marks</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Exam Coverage</div>
          <div className="mt-2 text-2xl font-semibold">{examCoverage === "—" ? "—" : `${examCoverage}%`}</div>
          <div className="mt-1 text-xs text-slate-500">Of past {summary.available_years ? summary.available_years.length : "several"} years</div>
        </Card>
      </div>
    );
  }

  function renderTopicFrequency() {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Topic Frequency</h3>
            <div className="text-sm text-slate-500">Top topics by number of appearances</div>
          </div>
          <div className="inline-flex items-center gap-2 text-sm">
            <button className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">By Questions</button>
            <button className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700">By Marks</button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {normalizedTopics.length === 0 ? (
            <div className="text-sm text-slate-500">No topic frequency data available.</div>
          ) : (
            normalizedTopics.map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <div className="w-48 text-sm font-medium text-slate-900 truncate">{t.topic}</div>
                <div className="flex-1">
                  <HorizontalBar value={Math.round((t.count / Math.max(1, maxTopicCount)) * 100)} color="bg-indigo-500" />
                </div>
                <div className="w-12 text-right text-sm font-semibold text-slate-900">{t.count}</div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-right">
          <button onClick={() => navigate(`/subjects/${encodeURIComponent(subjectCode)}/questions`, { state: { subject_code: subjectCode } })} className="text-sm font-medium text-indigo-600">View all topics →</button>
        </div>
      </Card>
    );
  }

  function renderYearTrend() {
    if (!normalizedYear || normalizedYear.length === 0) {
      return (
        <Card className="p-4">
          <div className="text-sm text-slate-500">No year-wise trend data available.</div>
        </Card>
      );
    }
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Year-wise Trend</h3>
            <div className="text-sm text-slate-500">Number of questions appeared per year</div>
          </div>
          <div>
            <select className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm"><option>By Questions</option></select>
          </div>
        </div>
        <div className="mt-4">
          <SimpleSparkline points={yearPoints} />
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
            {normalizedYear.map((y) => (
              <div key={y.year} className="whitespace-nowrap">{y.year}: <span className="font-semibold text-slate-900">{y.count}</span></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  function renderQuestionTypeDistribution() {
    const colored = (Array.isArray(qTypeDist) ? qTypeDist : []).map((q, idx) => ({ ...q, color: ["#7c3aed", "#4f46e5", "#06b6d4", "#f97316"][idx%4] }));
    if (!colored || colored.length === 0) return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold">Question Type Distribution</h3>
        <div className="mt-3 text-sm text-slate-500">No distribution data available.</div>
      </Card>
    );
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold">Question Type Distribution</h3>
        <div className="text-sm text-slate-500">Share of questions by type</div>
        <div className="mt-4"><DonutChart data={colored} size={120} /></div>
        <div className="mt-4 text-right">
          <button onClick={() => navigate(`/subjects/${encodeURIComponent(subjectCode)}/questions`, { state: { subject_code: subjectCode } })} className="text-sm font-medium text-indigo-600">View question types →</button>
        </div>
      </Card>
    );
  }

  function renderRepeatedQuestions() {
    return (
      <Card className="p-4">
        <h3 className="text-lg font-semibold">Most Repeated Questions / Common Patterns</h3>
        <div className="text-sm text-slate-500">Frequently recurring questions & patterns</div>
        <div className="mt-4 space-y-2">
          {normalizedRepeated.length === 0 ? (
            <div className="text-sm text-slate-500">No repeated question patterns found yet.</div>
          ) : (
            normalizedRepeated.map((r, idx) => (
              <div key={idx} className="flex items-start justify-between">
                <div className="min-w-0 text-sm text-slate-900">{idx+1}. {r.label}</div>
                <div>{typeof r.count === 'number' ? <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{r.count} times</span> : null}</div>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 text-right">
          <button onClick={() => navigate(`/subjects/${encodeURIComponent(subjectCode)}/questions`, { state: { subject_code: subjectCode } })} className="text-sm font-medium text-indigo-600">View all repeated questions →</button>
        </div>
      </Card>
    );
  }

  function renderRightColumn() {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="text-sm font-semibold">Key Insights</h4>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {normalizedInsights.length === 0 ? <li className="text-sm text-slate-500">No insights available.</li> : normalizedInsights.map((i, idx) => (
              <li key={idx} className="flex items-start gap-3"><span className="mt-1 inline-block h-3 w-3 rounded-full bg-indigo-500" /> <span>{i}</span></li>
            ))}
          </ul>
          <div className="mt-3 text-right"><button className="text-sm font-medium text-indigo-600">Explore insights in full report →</button></div>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-semibold">Recommended Focus</h4>
          <div className="mt-3 space-y-2">
            {normalizedRecommended.length === 0 ? <div className="text-sm text-slate-500">No recommended topics yet.</div> : normalizedRecommended.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between"><div className="text-sm text-slate-900">{f.topic}</div><div>{f.priority==='High'?<Badge tone="rose">High</Badge>:f.priority==='Medium'?<Badge tone="amber">Medium</Badge>:<Badge tone="emerald">Low</Badge>}</div></div>
            ))}
          </div>
          <div className="mt-3 text-right"><button onClick={() => navigate(`/subjects/${encodeURIComponent(subjectCode)}/questions`, { state: { subject_code: subjectCode } })} className="text-sm font-medium text-indigo-600">View study plan →</button></div>
        </Card>
        <Card className="p-4 text-center">
          <h4 className="text-sm font-semibold">Take Action</h4>
          <p className="mt-2 text-sm text-slate-600">Practice important topics and strengthen your weak areas.</p>
          <div className="mt-4"><button type="button" onClick={() => navigate(`/subjects/${encodeURIComponent(subjectCode)}/questions`, { state: { subject_code: subjectCode } })} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Practice Important Topics →</button></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[240px]"><PublicSidebar onNavigate={() => setSidebarOpen(false)} /></div>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <div className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-white transition-transform lg:hidden ${sidebarOpen?"translate-x-0":"-translate-x-full"}`}><PublicSidebar onNavigate={() => setSidebarOpen(false)} /></div>
      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => setSidebarOpen((v)=>!v)} className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden" aria-label="Toggle dashboard menu">{sidebarOpen?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</button>
              <div>{renderHeader()}</div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative hidden sm:flex items-center gap-2 sm:w-[420px] lg:w-[540px]">
                <div className="relative flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="search" placeholder="Search questions, topics, concepts..." className="w-full rounded-l-xl rounded-r-none border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:bg-white" />
                </div>
                <button type="button" className="hidden sm:inline-flex h-10 items-center justify-center rounded-r-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">Search</button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600"><Bell className="h-4 w-4"/></button>
                <NavLink to="/profile"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">AC</div></NavLink>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {usingFallback && statusMessage ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{statusMessage}</div> : null}
          {renderFilters()}
          <div className="mt-4">{renderSummaryCards()}</div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <main className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {renderTopicFrequency()}
                {renderYearTrend()}
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                {renderQuestionTypeDistribution()}
                {renderRepeatedQuestions()}
              </div>
            </main>

            <aside className="space-y-6">
              {renderRightColumn()}
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AnalysisPage;



























































































































































