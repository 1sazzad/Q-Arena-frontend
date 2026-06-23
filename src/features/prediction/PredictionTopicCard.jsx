import PredictionQuestionCard from "./PredictionQuestionCard";

const toArray = (value) => (Array.isArray(value) ? value : []);

export default function PredictionTopicCard({ topic }) {
  const questions = toArray(
    topic?.evidence?.length ? topic.evidence : topic?.relatedQuestions,
  );

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-950 break-words">
            {topic?.topic || topic?.predictedTopic || "Untitled Topic"}
          </h3>

          {topic?.reason ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {topic.reason}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            {topic?.confidence || 0}% confidence
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {topic?.priority || topic?.chanceLabel || "Priority"}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3 min-w-0">
        {questions.length ? (
          questions.map((question, index) => (
            <PredictionQuestionCard
              key={question.id || question.question_id || `${topic.id}-${index}`}
              question={question}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No related questions found for this topic.
          </div>
        )}
      </div>
    </article>
  );
}