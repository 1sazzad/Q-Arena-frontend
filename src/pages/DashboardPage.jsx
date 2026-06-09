import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import BrandLogo from "../components/BrandLogo";
import WorkflowSteps from "../components/ui/WorkflowSteps";
import { Badge, Card, ErrorMessage, PageHeader, ResponsiveContainer, StatCard, SectionCard } from "../components/ui";

const workflows = [
  {
    to: "/subjects",
    title: "Subject Library",
    description: "Search published subjects and browse previous-year questions.",
    badge: "Start here",
  },
  {
    to: "/search",
    title: "Semantic Search",
    description: "Find similar questions with natural-language queries.",
    badge: "Vector search",
  },
  {
    to: "/analysis",
    title: "Topic Analysis",
    description: "Review repeated topics, years, marks, and sample questions.",
    badge: "Patterns",
  },
  {
    to: "/predict",
    title: "Predictions",
    description: "See likely important topics ranked by confidence.",
    badge: "Exam prep",
  },
  {
    to: "/suggestions",
    title: "Suggestions",
    description: "Generate focused study suggestions and export them.",
    badge: "Exportable",
  },
  {
    to: "/generate-answer",
    title: "Answer Builder",
    description: "Draft exam-style answers from stored question context.",
    badge: "Practice",
  },
];

function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <ResponsiveContainer>
      <div className="mb-4 inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-200/60">
        <BrandLogo imageClassName="h-8 w-8" textClassName="text-sm font-semibold tracking-tight text-slate-950" />
      </div>
      <PageHeader
        eyebrow="Learner Dashboard"
        title={`Welcome, ${user?.full_name || "Learner"}`}
        description="Search questions, review predictions, generate answers, and export focused study material from published exam data."
        stats={
          <>
            <StatCard label="Workflows" value={workflows.length} helper="Available" tone="indigo" />
            <StatCard label="Role" value={user?.role || "student"} helper="Access" tone="cyan" />
            <StatCard label="Account" value={user?.email || "Signed in"} helper="Profile" tone="slate" className="sm:col-span-2" />
          </>
        }
      />

      <WorkflowSteps mode="loggedin" />

      <ErrorMessage tone="warning">{location.state?.message}</ErrorMessage>

      <SectionCard eyebrow="Quick start" title="Choose a learning workflow" description="These are the core student actions in Q Arena.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {workflows.map((item) => (
          <Link key={item.to} to={item.to} className="group">
            <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:border-indigo-200 group-hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
                <Badge tone="indigo">{item.badge}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </Card>
          </Link>
        ))}
        </div>
      </SectionCard>
    </ResponsiveContainer>
  );
}

export default DashboardPage;
