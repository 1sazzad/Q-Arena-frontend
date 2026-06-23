function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function PredictionSummary({ summary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Predicted Topics"
        value={summary.predictedTopics || 0}
        helper="Topics to study"
      />
      <SummaryCard
        label="Related Questions"
        value={summary.predictedQuestions || 0}
        helper="Previous-question evidence"
      />
      <SummaryCard
        label="High Priority"
        value={summary.highPriorityTopics || 0}
        helper="Start here first"
      />
      <SummaryCard
        label="Confidence"
        value={`${summary.confidence || 0}%`}
        helper="Based on repetition and marks"
      />
    </div>
  );
}