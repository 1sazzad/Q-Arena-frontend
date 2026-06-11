import { useEffect } from "react";
import Card from "./Card";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import MathRenderer from "../MathRenderer";

function SafeValue({ label, children }) {
  if (!children && children !== 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function renderOptions(options) {
  if (!options) return null;
  if (Array.isArray(options)) {
    return (
      <ul className="mt-2 list-inside list-decimal pl-4 text-sm text-slate-700">
        {options.map((opt, idx) => (
          <li key={idx}>{String(opt)}</li>
        ))}
      </ul>
    );
  }

  if (typeof options === "object") {
    return (
      <div className="mt-2 space-y-2 text-sm text-slate-700">
        {Object.entries(options).map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <span className="font-semibold">{k}.</span>
            <span>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function renderTable(table) {
  if (!table || table.data === undefined) {
    return <pre className="rounded-xl bg-white p-3 text-xs text-slate-700">{JSON.stringify(table || {}, null, 2)}</pre>;
  }

  const data = table.data;

  // array of arrays
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return (
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-left text-sm text-slate-700">
          <tbody>
            {data.map((row, rIndex) => (
              <tr key={rIndex}>
                {row.map((cell, cIndex) => (
                  <td key={cIndex} className="border border-slate-200 px-3 py-2 align-top">
                    <span className="text-sm text-slate-700">{String(cell)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // array of objects
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    const headers = Array.from(
      data.reduce((acc, row) => {
        Object.keys(row || {}).forEach((k) => acc.add(k));
        return acc;
      }, new Set()),
    );

    return (
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full border-collapse text-left text-sm text-slate-700">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} className="border border-slate-200 px-3 py-2 font-semibold align-top">
                  {String(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rIndex) => (
              <tr key={rIndex}>
                {headers.map((h, cIndex) => (
                  <td key={cIndex} className="border border-slate-200 px-3 py-2 align-top">
                    <span className="text-sm text-slate-700">{String(row[h] ?? "")}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // fallback: render as JSON/text
  return <pre className="rounded-xl bg-white p-3 text-xs text-slate-700">{JSON.stringify(data, null, 2)}</pre>;
}

export default function TutorModal({ isOpen, onClose, tutorResponse = null, loading = false, error = null, onRetry = null }) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const context = (tutorResponse && tutorResponse.question_context) || {};
  const metadata = context.metadata || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 max-w-3xl w-full">
        <Card className="max-h-[85vh] overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Q Arena Tutor</h3>
              <p className="mt-1 text-xs text-slate-500">Interactive question explanation (metadata preview)</p>
            </div>
            <div className="flex items-center gap-2">
              {tutorResponse?.source === "metadata_fallback" && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Metadata preview</span>
              )}
              <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-3 py-1 text-sm" aria-label="Close Tutor preview">
                Close
              </button>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-3">
                <LoadingSpinner />
                <div className="text-sm text-slate-600">Loading Tutor preview...</div>
              </div>
            ) : error ? (
              <div className="space-y-3">
                <ErrorMessage message={String(error)} />
                <div className="flex gap-2">
                  {typeof onRetry === "function" && (
                    <Button type="button" onClick={onRetry}>Retry</Button>
                  )}
                  <Button type="button" onClick={onClose} aria-label="Close Tutor preview">Close</Button>
                </div>
              </div>
            ) : !tutorResponse ? (
              <div className="text-sm text-slate-600">No Tutor data available.</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Subject</div>
                      <div className="mt-1 text-sm text-slate-800">{tutorResponse.subject_name || tutorResponse.subject_code}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Mode</div>
                      <div className="mt-1 text-sm text-slate-800">{tutorResponse.mode || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Language</div>
                      <div className="mt-1 text-sm text-slate-800">{tutorResponse.language || "en"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Student level</div>
                      <div className="mt-1 text-sm text-slate-800">{tutorResponse.student_level || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Basic question context */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Question</h4>
                  {context.question_text && (
                    <div className="mt-2 text-sm text-slate-800">
                      <MathRenderer value={context.question_text} />
                    </div>
                  )}

                  {context.stem && (
                    <div className="mt-2 text-sm text-slate-800">
                      <MathRenderer value={context.stem} />
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-700">
                    {metadata.marks !== undefined && metadata.marks !== null && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500">Marks</div>
                        <div className="mt-1">{metadata.marks}</div>
                      </div>
                    )}
                    {metadata.exam_year && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500">Exam year</div>
                        <div className="mt-1">{metadata.exam_year}</div>
                      </div>
                    )}
                    {metadata.difficulty && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500">Difficulty</div>
                        <div className="mt-1">{metadata.difficulty}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parts */}
                {Array.isArray(context.parts) && context.parts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Question parts</h4>
                    <div className="mt-2 space-y-3">
                      {context.parts.map((part, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900">{part.label || `Part ${idx + 1}`}</div>
                              {part.question_text && <div className="mt-1 text-sm text-slate-800"><MathRenderer value={part.question_text} /></div>}
                              {part.instruction && <div className="mt-1 text-sm text-slate-600">{part.instruction}</div>}
                            </div>
                            <div className="text-sm text-slate-600">{part.marks ? `${part.marks} marks` : null}</div>
                          </div>

                          {part.options && (
                            <div className="mt-2">{renderOptions(part.options)}</div>
                          )}

                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Root options */}
                {context.options && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Options</h4>
                    {renderOptions(context.options)}
                  </div>
                )}

                {/* Tables */}
                {Array.isArray(context.tables) && context.tables.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Tables</h4>
                    <div className="mt-2 space-y-3">
                      {context.tables.map((table, idx) => (
                        <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3">
                          {table.caption && <div className="text-xs text-slate-500">{table.caption}</div>}
                          <div className="mt-2">{renderTable(table)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diagrams */}
                {(context.diagram_description || (Array.isArray(context.diagrams) && context.diagrams.length > 0) || (Array.isArray(context.figures) && context.figures.length > 0)) && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Diagrams</h4>
                    <div className="mt-2 text-sm text-slate-700 space-y-2">
                      {context.diagram_description && <div>{context.diagram_description}</div>}
                      {Array.isArray(context.diagrams) && context.diagrams.map((d, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-white p-2">{d.diagram_reference || d.diagram_description || "Diagram"}</div>
                      ))}

                      {Array.isArray(context.figures) && context.figures.map((f, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-white p-2">{f.caption || f.reference || "Figure (metadata)"}</div>
                      ))}

                      <div className="text-xs text-slate-500">Raw SVG is not rendered in the Tutor preview.</div>
                    </div>
                  </div>
                )}

                {/* Math blocks */}
                {Array.isArray(context.math_blocks) && context.math_blocks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Math blocks</h4>
                    <div className="mt-2 space-y-2">
                      {context.math_blocks.map((block, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-white p-3">
                          {block.latex ? <MathRenderer value={block.latex} /> : <div className="text-sm text-slate-700">{String(block.type || block.content || block.formula || "Math block")}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanations / lists (may be empty) */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Teacher explanation</h4>
                  {tutorResponse.teacher_explanation ? (
                    <div className="mt-2 text-sm text-slate-800">{String(tutorResponse.teacher_explanation)}</div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-600">Teacher explanation is not available in metadata preview.</div>
                  )}
                </div>

                {Array.isArray(tutorResponse.hints) && tutorResponse.hints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Hints</h4>
                    <ul className="mt-2 list-disc list-inside text-sm text-slate-700">
                      {tutorResponse.hints.map((h, i) => (
                        <li key={i}>{String(h)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Close action */}
                <div className="mt-4 flex justify-end">
                  <Button type="button" onClick={onClose} aria-label="Close Tutor preview">Close</Button>
                </div>

              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
