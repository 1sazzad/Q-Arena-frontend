import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  CircleCheck,
  CircleX,
  FileSearch,
  GraduationCap,
  LineChart,
  Laptop,
  Search,
  Sparkles,
  Trophy,
  TrendingUp,
} from "lucide-react";

import PublicNavbar from "../components/PublicNavbar";
import Footer from "../components/Footer";
import { CONTACT_METHODS } from "../config/contact";

const predictionRows = [
{ label: "Data Structures", value: 90 },
{ label: "Algorithms", value: 82 },
{ label: "Database Systems", value: 75 },
{ label: "Operating Systems", value: 68 },
{ label: "Computer Networks", value: 60 },
];

const featureCards = [
{
title: "Past Question Search",
text: "Search thousands of past questions from multiple boards and institutions.",
icon: FileSearch,
tone: "bg-blue-100 text-blue-700",
},
{
title: "Smart Predictions",
text: "AI analyzes question patterns to predict important topics and high-priority areas.",
icon: TrendingUp,
tone: "bg-emerald-100 text-emerald-700",
},
{
title: "AI Tutor",
text: "Get step-by-step explanations, solve doubts, and learn like in a smart classroom.",
icon: Bot,
tone: "bg-violet-100 text-violet-700",
},
{
title: "Detailed Analysis",
text: "Understand topic weightage, trends, and performance insights.",
icon: BarChart3,
tone: "bg-amber-100 text-amber-700",
},
];

const problemItems = [
"Too many past papers, no idea where to start",
"Don't know which topics are really important",
"Hard to understand complex solutions",
"No personal tutor available anytime",
"Wasting time on low-value topics",
];

const solutionItems = [
"AI finds important topics for you",
"Smart predictions focus your preparation",
"AI Tutor explains anything, anytime",
"Learn faster, understand better, score higher",
"Save time, focus on what matters",
];

const subjects = [
"Mathematics",
"Physics",
"Chemistry",
"Biology",
"Computer Science",
"Business",
"English",
"Statistics",
"Economics",
"... and more",
];

function ProgressBar({ label, value, color = "bg-blue-600" }) {
return ( <div> <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"> <span className="font-medium text-slate-800">{label}</span> <span className="font-semibold text-slate-500">{value}%</span> </div> <div className="h-2 overflow-hidden rounded-full bg-slate-100">
<div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} /> </div> </div>
);
}

function HeroDashboardPreview() {
  return (
    <div className="relative mx-auto md:mx-0 md:max-w-[760px] rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(37,99,235,0.06)]">
      <div className="absolute -right-5 -top-5 hidden h-16 w-16 rounded-3xl border border-blue-100 bg-white/80 shadow-lg lg:block">
        <div className="absolute left-1/2 top-3 h-10 w-10 -translate-x-1/2 rotate-45 rounded-lg border border-blue-200 bg-blue-50" />
        <div className="absolute bottom-3 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-violet-500" />
      </div>

      <div className="grid items-start gap-4 rounded-[1.25rem] bg-slate-50/70 p-4 md:grid-cols-[160px_1fr]">
        <aside className="hidden rounded-2xl border border-slate-100 bg-white p-3 md:block">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-950">Q Arena</span>
          </div>

          {[
            "Dashboard",
            "My Subjects",
            "Questions",
            "Predictions",
            "AI Tutor",
            "Analysis",
            "Bookmarks",
            "Mock Tests",
            "Notes",
            "Help",
          ].map((item, index) => (
            <div
              key={item}
              className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                index === 0 ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600"
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${index === 0 ? "bg-blue-600" : "bg-slate-300"}`} />
              <div className="truncate">{item}</div>
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Welcome back, Alex 👋</h3>
              <p className="text-sm text-slate-500">Let's continue your smart preparation today.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden w-56 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400 sm:flex">
                <Search className="h-3.5 w-3.5" />
                Search questions, topics...
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 text-sm">
                A
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["My Subjects", "8", "Active subjects"],
              ["Total Questions", "12,450", "Past questions"],
              ["Predictions", "168", "High priority topics"],
              ["Study Time", "32h", "This month"],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3 shadow">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-extrabold text-slate-950">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-950">Smart Predictions Overview</h4>
              </div>
              <div className="space-y-2">
                {predictionRows.map((row, index) => (
                  <ProgressBar
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    color={index === 3 ? "bg-orange-500" : index === 4 ? "bg-fuchsia-500" : "bg-gradient-to-r from-blue-600 to-blue-400"}
                  />
                ))}
              </div>
              <Link to="/login" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                View all predictions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-white p-3 shadow">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-950">Ask AI Tutor</h4>
                      <p className="mt-1 text-xs text-slate-500">What would you like to learn today?</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm text-slate-500">
                  Ask any question...
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3 shadow">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-950">Recent Activity</h4>
                </div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Solved questions</span>
                    <strong>24</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AI Tutor sessions</span>
                    <strong>8</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Topics studied</span>
                    <strong>15</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
);
}


function HomePage() {
const location = useLocation();
const whatsapp = CONTACT_METHODS.find((method) => method.type === "WhatsApp");

useEffect(() => {
if (!location.hash) return;


const target = document.querySelector(location.hash);
if (target) {
  window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
}


}, [location.hash]);

return (
<> <PublicNavbar />


  <main className="overflow-hidden bg-white text-slate-950">
    <section id="home" className="relative bg-gradient-to-br from-white via-blue-50/50 to-white">
      <div className="pointer-events-none absolute right-0 top-28 hidden h-64 w-64 rounded-full bg-blue-100/50 blur-3xl lg:block" />
      <div className="pointer-events-none absolute bottom-10 left-0 hidden h-56 w-56 rounded-full bg-violet-100/50 blur-3xl lg:block" />

      <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-6 py-12 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <Sparkles className="h-4 w-4" />
            AI-Powered Exam Preparation
          </div>

          <h1 className="max-w-2xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            Study Smarter.
            <span className="mt-1 block text-blue-600">Achieve More.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700">
            Q Arena uses AI to analyze past questions, find important topics, and help you learn faster with step-by-step explanations and smart predictions.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-6 py-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
            >
              Explore Features <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold text-slate-700">
            {[
              ["Smart Predictions", Sparkles],
              ["AI Tutor", Bot],
              ["Detailed Analysis", BarChart3],
            ].map(([label]) => (
              <div key={label} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <HeroDashboardPreview />
      </div>
    </section>

    <section id="features" className="relative -mt-2 px-6 pb-8 md:px-10">
      <div className="mx-auto max-w-[1440px] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="flex gap-5 border-slate-100 lg:border-r lg:pr-6 last:lg:border-r-0">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl ${feature.tone}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    <section className="px-6 py-8 md:px-10">
      <div className="relative mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">The Problem Students Face</h2>
          <ul className="mt-6 space-y-4">
            {problemItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-medium text-slate-800">
                <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden lg:absolute lg:left-1/2 lg:top-1/2 lg:z-10 lg:flex lg:h-20 lg:w-20 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:items-center lg:justify-center lg:rounded-full lg:bg-white lg:text-slate-950 lg:shadow-lg lg:ring-2 lg:ring-blue-50">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white">
            <ArrowRight className="h-6 w-6" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-cyan-50 to-white p-8 shadow-sm">
          <div className="absolute bottom-0 right-0 hidden h-36 w-36 rounded-tl-[4rem] bg-blue-100/70 lg:block" />

          <div className="relative">
            <h2 className="text-2xl font-black text-slate-950">Q Arena Is The Solution</h2>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <ul className="space-y-4 lg:w-1/2">
                {solutionItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm font-medium text-slate-800">
                    <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="relative lg:w-1/2">
                {/* CSS-only subtle illustration */}
                <div className="ml-auto flex w-full max-w-xs items-center justify-center lg:ml-0">
                  <div className="relative flex h-40 w-full items-center justify-center">
                    {/* laptop/card */}
                    <div className="absolute top-4 right-2 hidden h-28 w-36 rounded-xl bg-white/90 border border-slate-100 p-3 shadow-md lg:block">
                      <div className="flex h-full flex-col items-center justify-center">
                        <div className="mb-2 h-8 w-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold">Q</div>
                        <div className="h-2 w-20 rounded-full bg-slate-100" />
                      </div>
                    </div>

                    {/* avatar */}
                    <div className="absolute left-4 top-6 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-700 font-semibold">A</div>
                      <div className="hidden flex-col gap-1 lg:flex">
                        <div className="h-3 w-28 rounded-full bg-slate-100" />
                        <div className="h-2 w-20 rounded-full bg-slate-100" />
                      </div>
                    </div>

                    {/* floating bubbles */}
                    <div className="absolute bottom-2 left-32 hidden flex-col gap-2 lg:flex">
                      <div className="h-6 w-12 rounded-full bg-blue-50 text-xs text-blue-700 flex items-center justify-center">msg</div>
                      <div className="h-8 w-10 rounded-full bg-white/90 border border-slate-100 shadow-sm flex items-center justify-center text-xs">📈</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <section id="ai-tutor" className="px-6 py-8 md:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-100 lg:grid-cols-[0.85fr_0.65fr_1.2fr_0.65fr] lg:p-8">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            <Sparkles className="h-3.5 w-3.5" />
            Your Personal AI Tutor
          </div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Learn. Ask. Understand.
            <span className="block text-blue-600">Anytime, Anywhere.</span>
          </h2>
          <ul className="mt-6 space-y-3 text-sm font-medium text-slate-700">
            {["Step-by-step solutions", "Follow-up questions", "Whiteboard explanations", "Works for any subject"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            to="/login"
            className="mt-7 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Try AI Tutor After Login
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Bot className="h-5 w-5" />
            </div>
            <strong className="text-sm text-slate-950">AI Tutor</strong>
          </div>
          <div className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
            Can you explain how to solve this equation?
          </div>
          <div className="mt-3 rounded-2xl bg-blue-50 p-3 text-sm text-slate-700">
            Sure! Let's solve it step by step.
          </div>
          <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs text-slate-400 shadow-sm">Typing...</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex justify-end gap-2">
            {["bg-slate-900", "bg-blue-600", "bg-rose-500", "bg-emerald-500"].map((color) => (
              <span key={color} className={`h-4 w-4 rounded-full ${color}`} />
            ))}
          </div>
          <div className="rounded-2xl bg-slate-50 p-8 text-center">
            <p className="mb-6 text-left text-lg font-semibold text-slate-800">Solve for x:</p>
            <div className="space-y-5 text-2xl font-medium text-slate-950">
              <p>2x + 3 = 11</p>
              <p>2x = 11 - 3</p>
              <p>2x = 8</p>
              <p className="inline-flex rounded-lg border border-blue-500 bg-white px-4 py-2 text-blue-700">x = 4</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4">
          {["Instant explanations", "Clear step-by-step", "Smart follow-ups", "Available anytime"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="predictions" className="px-6 py-8 md:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-[0.8fr_1fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Top Predicted Topics</h3>
          <div className="mt-5 space-y-4">
            {predictionRows.map((row) => (
              <ProgressBar key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
          <Link to="/login" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
            View full prediction report <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-lg font-black text-slate-950">Question Trend (Last 5 Years)</h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                High Priority Topics
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Other Topics
              </span>
            </div>
          </div>

          <svg viewBox="0 0 600 250" className="mt-4 h-56 w-full">
            <line x1="30" y1="210" x2="570" y2="210" stroke="#e2e8f0" strokeWidth="2" />
            <line x1="30" y1="40" x2="30" y2="210" stroke="#e2e8f0" strokeWidth="2" />
            <polyline
              points="50,180 150,150 250,130 350,140 450,95 550,60"
              fill="none"
              stroke="#2563eb"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="50,195 150,180 250,165 350,155 450,135 550,120"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[50, 150, 250, 350, 450, 550].map((x, index) => (
              <circle key={x} cx={x} cy={[180, 150, 130, 140, 95, 60][index]} r="6" fill="#2563eb" />
            ))}
            {["2020", "2021", "2022", "2023", "2024"].map((year, index) => (
              <text key={year} x={70 + index * 110} y="235" fill="#64748b" fontSize="14">
                {year}
              </text>
            ))}
          </svg>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-950">Trusted by Students</h3>
          <div className="mt-5 flex -space-x-3">
            {["A", "R", "S", "M"].map((letter, index) => (
              <div
                key={letter}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-white text-sm font-bold text-white ${
                  index === 0 ? "bg-blue-600" : index === 1 ? "bg-emerald-600" : index === 2 ? "bg-violet-600" : "bg-amber-500"
                }`}
              >
                {letter}
              </div>
            ))}
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-blue-700">
              +
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Designed to help students prepare with better focus and clearer explanations.
          </p>
          <p className="mt-4 text-sm font-bold text-blue-700">Students from many subjects</p>
        </div>
      </div>
    </section>

    <section id="how-it-works" className="px-6 py-8 md:px-10">
      <div className="mx-auto max-w-[1440px]">
        <h2 className="text-center text-3xl font-black text-slate-950">How It Works</h2>
        <div className="mt-9 grid gap-6 lg:grid-cols-3">
          {[
            [BookOpen, "1. Choose Your Subject", "Select your subject or course and access past questions."],
            [LineChart, "2. Explore & Analyze", "Get smart predictions and detailed topic analysis."],
            [Bot, "3. Learn & Improve", "Use AI Tutor to learn better and prepare with confidence."],
          ].map(([Icon, title, text]) => (
            <div key={title} className="relative flex items-start gap-5 rounded-3xl bg-white p-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <Icon className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="subjects" className="px-6 py-6 md:px-10">
      <div className="mx-auto max-w-[1440px] text-center">
        <h2 className="text-xl font-black text-slate-950">Loved by Students Across All Subjects</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {subjects.map((subject) => (
            <span key={subject} className="rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700">
              {subject}
            </span>
          ))}
        </div>
      </div>
    </section>

    <section className="px-6 py-6 md:px-10">
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 p-6 text-white shadow-2xl shadow-blue-200 lg:grid-cols-[0.8fr_1.4fr_0.8fr]">
        <Trophy className="pointer-events-none absolute left-8 top-6 hidden h-16 w-16 opacity-10 lg:block" />
        <BookOpen className="pointer-events-none absolute right-12 top-8 hidden h-14 w-14 opacity-10 lg:block" />
        <Laptop className="pointer-events-none absolute left-1/2 bottom-6 hidden -translate-x-1/2 h-12 w-12 opacity-10 lg:block" />
        <div className="hidden lg:flex lg:justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-white/15">
            <GraduationCap className="h-16 w-16" />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-black">Start Preparing Smarter Today</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-blue-50">
            Create your free Q Arena account and unlock the power of AI for your exam success.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register" className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-700">
              Create Free Account
            </Link>
            <Link to="/login" className="rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white">
              Login to Your Account
            </Link>
          </div>
        </div>

        <div className="hidden lg:flex lg:justify-center">
          <div className="flex h-28 w-36 items-center justify-center rounded-3xl bg-white/15">
            <BookOpen className="h-14 w-14" />
          </div>
        </div>
      </div>
    </section>

    <div id="contact">
      <div className="mx-auto max-w-[1440px] px-6 pb-4 text-center text-sm text-slate-500 md:px-10 -mt-4">
        <p>
          Need help? Email{" "}
          <a className="font-semibold text-blue-700" href="mailto:support@qarena.me">
            support@qarena.me
          </a>
          {whatsapp ? " or contact us on WhatsApp from the footer." : "."}
        </p>
      </div>
      <Footer />
    </div>
  </main>
</>


);
}

export default HomePage;
