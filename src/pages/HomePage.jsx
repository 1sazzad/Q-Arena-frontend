import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import heroImage from "../assets/hero.png";
import { APP_NAME } from "../config/app";
import { CONTACT_METHODS } from "../config/contact";
import Footer from "../components/Footer";
import BrandLogo from "../components/BrandLogo";
import PublicNavbar from "../components/PublicNavbar";
import { useAuth } from "../context/useAuth";
import { Button, Card, StatCard, Badge } from "../components/ui";
import WorkflowSteps from "../components/ui/WorkflowSteps";
import LockedPreviewCard from "../components/home/LockedPreviewCard";
import { demoSubjectOverview, demoPatternAnalysis, demoPredictions, unlockBenefits } from "../data/homepagePreviewData";

const features = [
  {
    title: "Previous Question Search",
    titleBangla: "আগের বছরের প্রশ্ন খোঁজা",
  },
  {
    title: "Topic Analysis",
    titleBangla: "টপিক বিশ্লেষণ",
  },
  {
    title: "AI-Based Suggestions",
    titleBangla: "AI-ভিত্তিক সাজেশন",
  },
  {
    title: "Important Question Prediction",
    titleBangla: "গুরুত্বপূর্ণ প্রশ্ন পূর্বাভাস",
  },
  {
    title: "Semantic Search",
    titleBangla: "অর্থভিত্তিক সার্চ",
  },
  {
    title: "Export as PDF",
    titleBangla: "PDF হিসেবে ডাউনলোড",
  },
];

const painPoints = [
  {
    title: "“Do you have previous questions?”",
    titleBangla: "“ভাই, আগের বছরের প্রশ্ন আছে?”",
  },
  {
    title: "Too many files, no clear priority",
    titleBangla: "অনেক ফাইল, কিন্তু কোনটা গুরুত্বপূর্ণ বোঝা কঠিন",
  },
  {
    title: "Exam is near, confidence is low",
    titleBangla: "পরীক্ষা কাছাকাছি, আত্মবিশ্বাস কম",
  },
];

const steps = [
  {
    number: "01",
    title: "Search your subject",
    bangla: "১. আপনার সাবজেক্ট সার্চ করুন",
  },
  {
    number: "02",
    title: "View question analysis",
    bangla: "২. প্রশ্ন বিশ্লেষণ দেখুন",
  },
  {
    number: "03",
    title: "Get prediction and suggestions",
    bangla: "৩. প্রেডিকশন ও সাজেশন নিন",
  },
];

function WhatsAppIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2a9.9 9.9 0 0 0-8.6 14.8L2 22l5.33-1.4a9.9 9.9 0 0 0 4.7 1.2h.01a9.93 9.93 0 0 0 9.93-9.9 9.86 9.86 0 0 0-2.92-6.99Zm-7.01 15.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.16.83.84-3.08-.2-.32a8.18 8.18 0 1 1 7 3.9Zm4.5-6.13c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.13-.56.12-.17.25-.65.8-.8.96-.15.17-.3.19-.55.07-.25-.13-1.06-.39-2.02-1.24a7.56 7.56 0 0 1-1.4-1.74c-.14-.25-.01-.38.11-.5.11-.11.25-.3.37-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.12.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.59.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

function MailIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <rect width="18" height="14" x="3" y="5" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ContactIcon({ type, className }) {
  return type === "WhatsApp" ? <WhatsAppIcon className={className} /> : <MailIcon className={className} />;
}

function SectionHeading({ eyebrow, title, titleBangla, description, descriptionBangla, bangla }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="break-words text-xs font-semibold uppercase leading-relaxed tracking-[0.08em] text-cyan-700 sm:tracking-[0.14em]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
      {titleBangla && <p className="mt-3 break-words text-xl font-semibold leading-8 text-slate-900 sm:text-2xl sm:leading-9">{titleBangla}</p>}
      {description && <p className="mt-3 break-words text-base leading-relaxed text-slate-600">{description}</p>}
      {descriptionBangla && <p className="mt-2 break-words text-base leading-8 text-slate-500">{descriptionBangla}</p>}
      {bangla && <p className="mt-2 break-words text-base leading-relaxed text-slate-600">{bangla}</p>}
    </div>
  );
}

function HomePage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const searchPath = isAuthenticated ? "/subjects" : "/login";
  const getStartedPath = isAuthenticated ? "/dashboard" : "/register";

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const target = document.querySelector(location.hash);
    if (target) {
      window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }, [location.hash]);

  function handleFeedbackSubmit(event) {
    event.preventDefault();
    // TODO: Wire this compact homepage form to the feedback endpoint when phone/contact support is finalized.
    event.currentTarget.reset();
    setFeedbackStatus("Thanks. Your feedback UI is ready and the full feedback page is available from the navbar.");
  }

  return (
    <>
      <PublicNavbar />
      <main className="overflow-x-hidden bg-slate-50">
        <section id="home" className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:py-16 lg:min-h-[calc(100vh-73px)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-20">
          <div className="min-w-0 max-w-3xl">
            <BrandLogo className="mb-5" imageClassName="h-12 w-12" textClassName="text-xl font-semibold tracking-tight text-slate-950" />
            <p className="inline-flex max-w-full rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold leading-relaxed text-cyan-800">
              AI-powered exam preparation for university students
            </p>
            <h1 className="mt-6 break-words text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl md:text-5xl lg:text-6xl">
              Analyze Previous Questions. Predict Important Topics. Prepare Smarter.
            </h1>
            <p className="mt-5 break-words text-base leading-relaxed text-slate-700 sm:text-lg">
              পূর্ববর্তী প্রশ্ন বিশ্লেষণ করুন, গুরুত্বপূর্ণ টপিক অনুমান করুন, আরও স্মার্টভাবে প্রস্তুতি নিন।
            </p>
            <p className="mt-5 max-w-2xl break-words text-base leading-relaxed text-slate-600">
              {APP_NAME} helps you search subjects, understand repeated topics, receive AI-based suggestions, and export useful results for focused revision.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to={searchPath} size="lg" className="w-full sm:w-auto">
                Search Subject
              </Button>
              <Button as={Link} to={getStartedPath} variant="secondary" size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-xl shadow-slate-200/80 sm:p-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">Exam Signal Overview</p>
                    <p className="mt-1 text-xs text-slate-500">Subject analysis preview</p>
                  </div>
                  <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Ready</span>
                </div>
                <div className="grid gap-3 py-5 sm:grid-cols-3">
                  {["Topics", "Years", "Matches"].map((label, index) => (
                    <div key={label} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{[24, 5, 86][index]}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {["Repeated algorithms", "Database normalization", "Short note patterns"].map((item, index) => (
                    <div key={item} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                        {index + 1}
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${84 - index * 13}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <img
              src={heroImage}
              alt=""
              className="pointer-events-none absolute -right-3 -top-8 hidden w-28 max-w-[28vw] opacity-90 lg:block xl:w-36"
            />
          </div>
        </div>
      </section>

      <section id="problem" className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="EXAM WEEK CHAOS | পরীক্ষার আগের বাস্তবতা"
            title="Students spend more time finding questions than preparing for exams."
            titleBangla="পরীক্ষার প্রস্তুতির চেয়ে প্রশ্ন খুঁজতেই শিক্ষার্থীদের বেশি সময় চলে যায়।"
          />
          <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {painPoints.map((item) => (
              <Card key={item.title} as="article" className="h-full rounded-2xl p-5 sm:p-6">
                <h3 className="break-words text-lg font-semibold leading-snug text-slate-950 sm:text-xl">{item.title}</h3>
                <p className="mt-2 break-words text-base font-semibold leading-7 text-slate-900">{item.titleBangla}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="FEATURES | ফিচারসমূহ"
            title="Everything students need for smarter revision"
            titleBangla="স্মার্ট রিভিশনের জন্য শিক্ষার্থীদের প্রয়োজনীয় সবকিছু"
          />
          <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="h-full">
                <h3 className="break-words text-lg font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-2 break-words text-base font-semibold leading-7 text-slate-900">{feature.titleBangla}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <WorkflowSteps mode="public" />

      {/* Product Preview Sections - static curated demo-only content */}
      <section id="product-preview-subject" className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="PREVIEW" title="Everything starts from your subject" description="A curated preview of the subject overview and quick signals (demo only)." />

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div>
              <Card>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-700">Subject</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">{demoSubjectOverview.subjectName}</h3>
                <p className="mt-1 text-sm text-slate-600">{demoSubjectOverview.department} — {demoSubjectOverview.program}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {demoSubjectOverview.stats.map((s) => (
                    <div key={s.label} className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-sm text-slate-500">{s.label}</p>
                      <p className="mt-1 font-semibold text-slate-950">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <p className="text-sm text-slate-500">Top topics</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {demoSubjectOverview.topTopics.slice(0, 3).map((topic) => (
                      <Badge key={topic} tone="indigo">{topic}</Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <LockedPreviewCard title="Previous question preview is locked" description="Sample previous question preview is hidden in public demo." />
                </div>

                <div className="mt-4">
                  <Button as={Link} to="/register">Create free account to view full subject report</Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-700">Pattern Analysis (demo)</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950">See what repeats every year</h3>
                    <p className="mt-1 text-sm text-slate-600">A compact preview of recommended study priorities and repeated patterns.</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {demoPatternAnalysis.stats.map((s) => (
                    <div key={s.label} className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-sm text-slate-500">{s.label}</p>
                      <p className="mt-1 font-semibold text-slate-950">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-slate-900">Recommended study priority</h4>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-300 max-w-full">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-3 py-1 text-left">Rank</th>
                          <th className="border border-slate-300 px-3 py-1 text-left">Topic</th>
                          <th className="border border-slate-300 px-3 py-1 text-right">Frequency</th>
                          <th className="border border-slate-300 px-3 py-1 text-right">Marks</th>
                          <th className="border border-slate-300 px-3 py-1 text-left">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demoPatternAnalysis.priorityRows.map((row) => (
                          <tr key={row.rank} className="bg-white">
                            <td className="border border-slate-300 px-3 py-1">{row.rank}</td>
                            <td className="border border-slate-300 px-3 py-1">{row.topic}</td>
                            <td className="border border-slate-300 px-3 py-1 text-right">{row.frequency}</td>
                            <td className="border border-slate-300 px-3 py-1 text-right">{row.marks}</td>
                            <td className="border border-slate-300 px-3 py-1">{row.priority}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {demoPatternAnalysis.repeatedPatterns.map((p) => (
                      <div key={p.title} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <h5 className="font-semibold text-slate-900">{p.title}</h5>
                        <p className="mt-1 text-sm text-slate-600">{p.years}</p>
                        <p className="mt-2 text-sm text-slate-700">Frequency: {p.frequency}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button as={Link} to="/register" className="w-full sm:w-auto">Unlock full analysis after login</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="product-preview-predictions" className="bg-white px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="PREDICTION PREVIEW" title="Rank likely topics before exam" description="Top 3 sample predictions (demo only). Register to unlock full report and export options." />

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {demoPredictions.map((p) => (
              <Card key={p.rank} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Prediction {p.rank}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">{p.topic}</h3>
                    <p className="mt-2 text-sm text-slate-600">{p.reason}</p>
                  </div>
                  <Badge tone="indigo">{p.confidence}%</Badge>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, p.confidence))}%` }} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-sm text-slate-400">Importance</p>
                    <p className="font-semibold text-slate-950">{p.importance}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-sm text-slate-400">Confidence</p>
                    <p className="font-semibold text-slate-950">{p.confidence}%</p>
                  </div>
                </div>

                <div className="mt-4">
                  <LockedPreviewCard title="Related previous questions are locked" description="Related questions are hidden in this demo preview." />
                </div>

                <div className="mt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <Button as={Link} to="/register" className="w-full sm:w-auto">Register to unlock</Button>
                    <Button as={Link} to="/register" variant="secondary" className="w-full sm:w-auto">Export PDF (login required)</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="product-preview-unlock" className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="UNLOCK" title="Create a free account to unlock your full preparation report" description="Sign up to access full subject dashboards, predictions, previous questions, PDF export and AI answer support." />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unlockBenefits.map((b) => (
              <Card key={b} className="rounded-2xl p-4">
                <p className="text-sm font-semibold text-slate-900">{b}</p>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <Button as={Link} to="/register">Create Free Account</Button>
            <Button as={Link} to="/login" variant="secondary">Log In</Button>
          </div>
        </div>
      </section>

      <section id="request-subject" className="bg-white px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Missing Subject</p>
            <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Can’t find your subject?</h2>
            <p className="mt-4 break-words text-base leading-relaxed text-slate-600">
              We are still expanding our question database. If your subject is not available, please reach out to us with at least the previous five years’ question papers. This will help us add your subject and improve prediction accuracy.
            </p>
            <h3 className="mt-8 break-words text-xl font-semibold text-slate-950 sm:text-2xl">আপনার সাবজেক্ট খুঁজে পাচ্ছেন না?</h3>
            <p className="mt-4 break-words text-base leading-relaxed text-slate-600">
              আমরা এখনো আমাদের প্রশ্ন ডাটাবেজ বড় করছি। যদি আপনার সাবজেক্ট পাওয়া না যায়, তাহলে অন্তত বিগত পাঁচ বছরের প্রশ্নপত্র নিয়ে আমাদের সাথে যোগাযোগ করুন। এতে আমরা আপনার সাবজেক্ট যুক্ত করতে পারব এবং প্রেডিকশনের মান আরও ভালো হবে।
            </p>
            <div className="mt-8 rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
              <p className="text-base font-semibold text-slate-950">Need help? Contact us directly.</p>
              <p className="mt-1 break-words text-base leading-relaxed text-slate-700">সাহায্য প্রয়োজন? সরাসরি যোগাযোগ করুন।</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {CONTACT_METHODS.map((method) => (
                  <Button
                    key={method.type}
                    as="a"
                    href={method.href}
                    target={method.href.startsWith("http") ? "_blank" : undefined}
                    rel={method.href.startsWith("http") ? "noreferrer" : undefined}
                    variant={method.type === "WhatsApp" ? "primary" : "secondary"}
                    className="w-full sm:w-auto"
                  >
                    <ContactIcon type={method.type} className="h-4 w-4" />
                    {method.actionLabel}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Card className="self-start">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Button as={Link} to="/feedback" variant="primary" className="w-full">
                Request Subject
              </Button>
              <Button as={Link} to="/feedback" variant="secondary" className="w-full">
                Submit Question Papers
              </Button>
              <Button as="a" href="#contact" variant="secondary" className="w-full">
                Contact Us
              </Button>
            </div>
            <p className="mt-5 break-words text-sm leading-relaxed text-slate-500">
              Include subject code, subject name, department, exam years, and clear scans or PDFs when you contact the team.
            </p>
          </Card>
        </div>
      </section>

      <section id="contact" className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Reach Out"
            title="Contact Us"
            bangla="যেকোনো প্রয়োজন বা সাবজেক্ট সংক্রান্ত সহায়তার জন্য যোগাযোগ করুন"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:mt-10">
            {CONTACT_METHODS.map((method) => {
              const isWhatsApp = method.type === "WhatsApp";
              const iconClasses = isWhatsApp ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700";
              const hoverClasses = isWhatsApp ? "hover:border-emerald-200 hover:bg-emerald-50/50" : "hover:border-indigo-200 hover:bg-indigo-50/50";

              return (
                <a
                  key={method.type}
                  href={method.href}
                  target={method.href.startsWith("http") ? "_blank" : undefined}
                  rel={method.href.startsWith("http") ? "noreferrer" : undefined}
                  className={`group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 transition ${hoverClasses} sm:p-6`}
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClasses}`}>
                      <ContactIcon type={method.type} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500">{method.type}</p>
                      <p className="mt-1 break-words text-xl font-semibold text-slate-950">{method.label}</p>
                      <p className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-indigo-700 group-hover:text-indigo-800">
                        {method.actionLabel}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="feedback" className="px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Feedback</p>
            <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Help improve Q Arena</h2>
            <p className="mt-4 break-words text-base leading-relaxed text-slate-600">
              Share subject requests, usability issues, prediction feedback, or ideas that would make exam preparation easier.
            </p>
          </div>
          <Card as="form" onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Name
                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" placeholder="Your name" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Email or Phone
                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100" placeholder="email@example.com or 01XXXXXXXXX" />
              </label>
            </div>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Feedback message
              <textarea
                rows={5}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                placeholder="Write your feedback"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" className="w-full sm:w-auto">Submit</Button>
              <Link to="/feedback" className="inline-flex min-h-10 items-center justify-center text-sm font-semibold text-indigo-700 hover:text-indigo-800">
                Open full feedback page
              </Link>
            </div>
            {feedbackStatus && <p className="break-words rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium leading-relaxed text-emerald-700">{feedbackStatus}</p>}
          </Card>
        </div>
      </section>

      <section id="support" className="bg-white px-4 py-12 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
          <div className="min-w-0">
            <p className="break-words text-xs font-semibold uppercase leading-relaxed tracking-[0.08em] text-cyan-700 sm:tracking-[0.14em]">
              SUPPORT COMMUNITY | শিক্ষার্থী কমিউনিটিকে সহযোগিতা করুন
            </p>
            <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Students already help each other. We’re making it easier.
            </h2>
            <h3 className="mt-3 break-words text-xl font-semibold leading-8 text-slate-900 sm:text-2xl sm:leading-9">
              শিক্ষার্থীরা একে অপরকে সাহায্য করে — আমরা শুধু এটাকে আরও সহজ করছি।
            </h3>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Previous questions stay scattered", "পুরোনো প্রশ্ন ছড়িয়ে থাকে"],
                ["Students waste time searching", "শিক্ষার্থীদের খুঁজতে অনেক সময় নষ্ট হয়"],
                ["Better preparation needs easier access", "ভালো প্রস্তুতির জন্য সহজ অ্যাক্সেস দরকার"],
              ].map(([english, bangla]) => (
                <div key={english} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="break-words text-sm font-semibold leading-6 text-slate-800">{english}</p>
                  <p className="mt-2 break-words text-sm font-medium leading-7 text-slate-500">{bangla}</p>
                </div>
              ))}
            </div>
            <Button as={Link} to="/support" size="lg" className="mt-8 w-full sm:w-auto">
              Support Students | শিক্ষার্থীদের সহযোগিতা করুন
            </Button>
          </div>
          <Card className="self-start border-cyan-100 bg-cyan-50/60">
            <p className="break-words text-xl font-semibold leading-8 text-slate-950">
              Keep this resource free for students
            </p>
            <p className="mt-4 break-words text-lg font-semibold leading-8 text-slate-800">
              এই রিসোর্স শিক্ষার্থীদের জন্য ফ্রি রাখতে সাহায্য করুন
            </p>
          </Card>
        </div>
      </section>

      <Footer />
      </main>
    </>
  );
}

export default HomePage;
