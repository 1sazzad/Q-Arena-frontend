import { useNavigate } from "react-router-dom";
import { Card } from "./index";

// A compact reusable workflow steps component for public and logged-in pages.
export default function WorkflowSteps({ mode = "public", selectedSubject = "" }) {
  const navigate = useNavigate();
  const isLoggedIn = mode === "loggedin";

  const publicSteps = [
    {
      number: 1,
      title: "Choose your subject",
      description: "Select your university, department, and subject.",
      action: () => navigate("/subjects"),
    },
    {
      number: 2,
      title: "View Smart Predictions",
      description: "See likely exam topics based on repeated questions, frequency, marks, and previous-year patterns.",
      action: () => navigate("/predictions"),
    },
    {
      number: 3,
      title: "Review previous questions",
      description: "Open related previous questions under each predicted topic.",
      action: () => navigate("/subjects"),
    },
    {
      number: 4,
      title: "Find similar questions",
      description: "Paste any question to check whether similar questions appeared before.",
      action: () => navigate("/search"),
    },
    {
      number: 5,
      title: "Export your report",
      description: "Download a clean prediction PDF for focused revision.",
      action: () => navigate("/predictions"),
    },
  ];

  const loggedInSteps = [
    { key: "select", title: "Select a subject", description: "Start with the subject you are preparing for.", to: "/subjects" },
    { key: "predict", title: "Smart Prediction", description: "Find high-priority topics using previous-year patterns.", to: "/predictions" },
    { key: "analysis", title: "Topic Analysis", description: "Check frequency, marks, and repeated question trends.", to: "/analysis" },
    { key: "search", title: "Similar Question Search", description: "Paste a question and find related previous questions.", to: "/search" },
    { key: "export", title: "Export & Answer", description: "Download a PDF report or generate an exam-style answer.", to: "/predictions" },
  ];

  const stepsToRender = isLoggedIn ? loggedInSteps : publicSteps;

  return (
    <section id={isLoggedIn ? "workflow-loggedin" : "how-it-works"} style={isLoggedIn ? undefined : { scrollMarginTop: "96px" }} className="px-4 py-4 sm:px-6 md:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">{isLoggedIn ? "Your Smart Preparation Workflow" : "How Q Arena Works"}</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            {isLoggedIn ? "Your Smart Preparation Workflow" : "How Q Arena Works"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Turn previous-year questions into a smart preparation plan.</p>
        </div>

        <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-2 md:grid-cols-5">
          {stepsToRender.map((step, idx) => (
            <Card
              key={step.key ?? step.number}
              as="button"
              onClick={() => {
                // Make steps navigable when logged in and subject is selected; otherwise only select step navigates to subjects
                if (!isLoggedIn) return;
                const to = step.to;
                if (!selectedSubject && to !== "/subjects") {
                  navigate("/subjects");
                  return;
                }
                if (selectedSubject) {
                  navigate(to, { state: { subject_code: selectedSubject } });
                } else {
                  navigate(to);
                }
              }}
              className={`flex items-start gap-3 p-3 text-left ${isLoggedIn ? "hover:border-indigo-200 hover:shadow-sm" : ""}`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-900">{step.number ?? idx + 1}</div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{step.description}</p>
              </div>
              {isLoggedIn && step.key === "predict" && (
                <span className="ml-auto inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Recommended</span>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
