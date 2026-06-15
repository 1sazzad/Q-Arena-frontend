import { useEffect, useState, useCallback, useRef } from "react";
import { apiEndpoints, getAnswerGenerationErrorMessage } from "../../api/api";
import Card from "./Card";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import MathRenderer from "../MathRenderer";
import QuestionDiagram from "./QuestionDiagram";
import Badge from "./Badge";

// Math detection and normalization helpers
function hasMathDelimiter(text) {
  if (typeof text !== 'string') return false;
  // detect common delimiters: $$, $, \(, \), \[, \], and simple (...) / [...] wrappers
  return /\$\$|\$|\\\(|\\\)|\\\[|\\\]|^\(.+\)$|^\[.+\]$/.test(text);
}

function looksLikeLatex(text) {
  if (typeof text !== 'string') return false;
  // look for common LaTeX commands or symbols
  return /\\bar|\\cdot|\\frac|\\sum|\\sqrt|\\text\{|\\[a-zA-Z]+|\^|_/.test(text);
}

function isLikelyProseExplanation(text) {
  if (typeof text !== "string") return false;
  const s = text.trim();
  if (!s) return false;

  const words = s.replace(/\\[a-zA-Z]+/g, " ").match(/[A-Za-z]{3,}/g) || [];
  const sentenceLike = /[.,;:!?]/.test(s);
  return words.length >= 6 || (words.length >= 4 && sentenceLike);
}

function isLikelyMathFormula(text) {
  if (typeof text !== "string") return false;
  const s = text.trim();
  if (!s) return false;

  return /\\frac|\\sum|\\sqrt|\\int|\\begin\{|\\left|\\right|\\cdot|\\times|\\neq|\\leq|\\geq|\^|_|\d\s*[+\-*/=]|[A-Za-z]\s*=\s*[-+]?\d/.test(s);
}

function shouldUnwrapSingleDollarProse(text) {
  if (typeof text !== "string") return false;
  const s = text.trim();
  if (!s) return false;

  if (isLikelyProseExplanation(s)) return true;
  if (isLikelyMathFormula(s)) return false;

  const wordCount = (s.match(/[A-Za-z]{3,}/g) || []).length;
  return wordCount >= 5;
}

function cleanupMalformedTextFragments(text) {
  if (typeof text !== "string" || !text) return "";
  let s = text;

  const hasTextCommand = /\\text\s*\{|\btext\{/.test(s) || /\\text[a-zA-Z]/.test(s);
  const hasStrongMath = isLikelyMathFormula(s);

  if (hasTextCommand && (!hasStrongMath || isLikelyProseExplanation(s))) {
    s = s
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      .replace(/\btext\{([^{}]*)\}/g, "$1")
      .replace(/\\text([A-Za-z][A-Za-z0-9_-]{1,})/g, "$1");
  }

  // common malformed fragment after bad escape handling (e.g. "extbutsimpler")
  s = s.replace(/\bext(but[a-z]{1,})\b/gi, "$1");

  return s;
}

function normalizeFormulaLatex(value, opts = { preferBlock: false }) {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'string' ? value.trim() : String(value);
  s = normalizeDisplayText(s).trim();
  if (!s) return '';

  // If already has math delimiters, return as-is
  if (hasMathDelimiter(s)) return s;

  // If looks like LaTeX and we prefer block, wrap in $$...$$; otherwise inline $
  if (looksLikeLatex(s)) {
    return opts.preferBlock ? `$$${s}$$` : `$${s}$`;
  }

  return s;
}

// Higher-level helper used for general tutor text normalization
function normalizeTutorMathText(value, opts = { preferBlock: false, forTableCell: false }) {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'string' ? value.trim() : String(value);
  s = normalizeDisplayText(s).trim();
  if (!s) return '';

  // If already contains explicit math delimiters or wrapped parentheses/brackets, return as-is
  if (hasMathDelimiter(s)) return s;

  // If the whole cell or value looks like LaTeX (contains commands or symbols), prefer block or inline based on opts
  if (looksLikeLatex(s)) {
    // For table cells we prefer inline unless preferBlock is specified
    const preferBlock = Boolean(opts.preferBlock) || Boolean(opts.forTableCell) === false && Boolean(opts.preferBlock);
    return preferBlock ? `$$${s}$$` : `$${s}$`;
  }

  // otherwise return original text unchanged
  return s;
}

function normalizeDisplayText(value) {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "string" ? value : String(value);

  let normalized = raw
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n(?![a-zA-Z])/g, "\n")
    .replace(/\\r(?![a-zA-Z])/g, "\n")
    .replace(/\\t(?![a-zA-Z])/g, "    ");

  normalized = cleanupMalformedTextFragments(normalized);

  // unwrap single-dollar wrappers when content is prose/mixed explanation
  const trimmed = normalized.trim();
  const singleDollarMatch = trimmed.match(/^\$([\s\S]+)\$$/);
  if (singleDollarMatch && !trimmed.startsWith("$$") && !trimmed.endsWith("$$")) {
    const inner = String(singleDollarMatch[1] || "").trim();
    if (inner && shouldUnwrapSingleDollarProse(inner)) {
      normalized = inner;
    }
  }

  return normalized
    .replace(/[ \t]{2,}/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  // Normalize various table shapes into { columns, rows, caption }
  if (!table) {
    return <pre className="rounded-xl bg-white p-3 text-xs text-slate-700">{JSON.stringify(table || {}, null, 2)}</pre>;
  }

  let columns = [];
  let rows = [];
  let caption = table.caption || table.title || table.name || "";

  // If the table object itself is an array-of-arrays or array-of-objects
  if (Array.isArray(table) && table.length > 0) {
    if (Array.isArray(table[0])) {
      rows = table;
    } else if (typeof table[0] === "object") {
      columns = Array.from(table.reduce((acc, row) => { Object.keys(row || {}).forEach((k) => acc.add(k)); return acc; }, new Set()));
      rows = table.map((r) => columns.map((c) => r[c] ?? ""));
    }
  }

  // If not resolved yet, look into table.data
  if (rows.length === 0 && Array.isArray(table.data) && table.data.length > 0) {
    const data = table.data;
    if (Array.isArray(data[0])) {
      rows = data;
    } else if (typeof data[0] === "object") {
      columns = Array.from(data.reduce((acc, row) => { Object.keys(row || {}).forEach((k) => acc.add(k)); return acc; }, new Set()));
      rows = data.map((r) => columns.map((c) => r[c] ?? ""));
    }
  }

  // If not resolved yet, check rows/headers properties
  if (rows.length === 0 && Array.isArray(table.rows)) {
    rows = table.rows;
    if (Array.isArray(table.columns)) columns = table.columns;
    if (Array.isArray(table.headers)) columns = table.headers;
  }

  // If rows still look like nested arrays, keep them as-is
  if (columns.length === 0 && rows.length > 0 && Array.isArray(rows[0])) {
    // rows are array-of-arrays
    void 0;
  }

  if ((!rows || rows.length === 0) && (!columns || columns.length === 0)) {
    return <pre className="rounded-xl bg-white p-3 text-xs text-slate-700">{JSON.stringify(table || {}, null, 2)}</pre>;
  }

  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-left text-sm text-slate-700">
        {columns && columns.length > 0 && (
          <thead>
            <tr>
              {columns.map((column, columnIndex) => (
                <th key={`${columnIndex}-${String(column)}`} className="border border-slate-200 px-3 py-2 font-semibold align-top">
                  <MathRenderer value={normalizeTutorMathText(String(column), { preferBlock: false, forTableCell: true })} className="[&>p]:m-0 [&_.katex-display]:my-1" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {Array.isArray(row)
                ? row.map((cell, cellIndex) => {
                    const cellStr = cell === null || cell === undefined ? "" : String(cell);
                    const normalizedCell = normalizeTutorMathText(cellStr, { preferBlock: false, forTableCell: true });
                    return (
                      <td key={cellIndex} className="border border-slate-200 px-3 py-2 align-top">
                        <MathRenderer value={normalizedCell} className="[&>p]:m-0 [&_.katex-display]:my-1" />
                      </td>
                    );
                  })
                : (columns.map((col, cellIndex) => {
                    const cellVal = (row && row[col]) ?? "";
                    const cellStr = cellVal === null || cellVal === undefined ? "" : String(cellVal);
                    const normalizedCell = normalizeTutorMathText(cellStr, { preferBlock: false, forTableCell: true });
                    return (
                      <td key={cellIndex} className="border border-slate-200 px-3 py-2 align-top">
                        <MathRenderer value={normalizedCell} className="[&>p]:m-0 [&_.katex-display]:my-1" />
                      </td>
                    );
                  }))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption ? <div className="mt-2 text-xs text-slate-500">{String(caption)}</div> : null}
    </div>
  );
}

// Helper to get text-ish values from a step
function getStepText(step) {
  if (!step) return "";
  return (
    step.content ?? step.text ?? step.description ?? step.note ?? step.prompt ?? step.caption ?? step.title ?? ""
  );
}

function renderTutorText(value, className = "whitespace-pre-line text-sm text-slate-800 [&>p]:m-0 [&_.katex-display]:my-1") {
  if (value === null || value === undefined) return null;
  const s = normalizeDisplayText(typeof value === "string" ? value : String(value));
  return (
    <div className={className}>
      <MathRenderer value={s} />
    </div>
  );
}

function renderListItems(items) {
  if (!Array.isArray(items)) return null;
  return (
    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
      {items.map((it, idx) => (
        <li key={idx} className="align-top">
          <div className="[&>p]:m-0 [&_.katex-display]:my-1">
            {typeof it === "string" ? (
              <MathRenderer value={it} className="[&>p]:m-0" />
            ) : it && typeof it === "object" ? (
              <div>
                {it.latex || it.content || it.text ? (
                  <MathRenderer value={String(it.latex ?? it.content ?? it.text)} className="[&>p]:m-0" />
                ) : (
                  <span>Item</span>
                )}
                {Array.isArray(it.items) ? <div className="mt-1">{renderListItems(it.items)}</div> : null}
              </div>
            ) : (
              <span>Item</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function resolveDiagramReference(step, context) {
  const ref = step?.figure_id ?? step?.asset_id ?? step?.reference ?? step?.diagram_reference ?? step?.id ?? null;
  if (!context) return null;
  const candidates = Array.isArray(context.figures) ? context.figures.concat(Array.isArray(context.diagrams) ? context.diagrams : []) : Array.isArray(context.diagrams) ? context.diagrams : [];
  const match = candidates.find((c) => {
    if (!c) return false;
    return (
      String(c.id || c.figure_id || c.asset_id || c.reference || c.diagram_reference || c.caption || "").toLowerCase() === String(ref || "").toLowerCase()
    );
  });

  if (match && match.diagram_svg && String((match.diagram_type || "").toLowerCase()) === "svg") {
    return (
      <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3">
        {match.caption && <div className="text-xs text-slate-500">{match.caption}</div>}
        <div className="mt-2"><QuestionDiagram diagramType={"svg"} diagramSvg={match.diagram_svg} /></div>
      </div>
    );
  }

  // fallback neutral card
  return (
    <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3">
      <div className="font-semibold text-sm">Diagram reference</div>
      <div className="mt-1 text-sm text-slate-700">{String(ref || getStepText(step) || "Referenced diagram")}</div>
      {step.caption ? <div className="mt-1 text-xs text-slate-500">{String(step.caption)}</div> : null}
    </div>
  );
}

function resolveTableReference(step, context) {
  const ref = step?.table_id ?? step?.asset_id ?? step?.reference ?? step?.table_reference ?? step?.id ?? null;
  if (!context) return null;
  const candidates = Array.isArray(context.tables) ? context.tables : (Array.isArray(context.table_data) ? context.table_data : []);
  let match = null;
  if (Array.isArray(candidates)) {
    match = candidates.find((t, idx) => {
      if (!t) return false;
      return (
        String(t.id || t.table_id || t.caption || t.reference || idx).toLowerCase() === String(ref || "").toLowerCase()
      );
    });
  }

  if (match) {
    return (
      <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3">
        {match.caption && <div className="text-xs text-slate-500">{match.caption}</div>}
        <div className="mt-2">{renderTable(match)}</div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3">
      <div className="font-semibold text-sm">Table reference</div>
      <div className="mt-1 text-sm text-slate-700">{String(ref || getStepText(step) || "Referenced table")}</div>
      {step.caption ? <div className="mt-1 text-xs text-slate-500">{String(step.caption)}</div> : null}
    </div>
  );
}

function renderWhiteboardStep(step, index, context) {
  if (typeof step === "string") {
    return renderTutorText(step);
  }

  if (!step || typeof step !== "object") {
    return <div className="text-sm text-slate-700">Tutor step could not be rendered.</div>;
  }

  const type = String(step.type || "").toLowerCase();

  try {
    if (type === "heading") {
      const text = getStepText(step);
      return (
        <div className="text-sm font-semibold text-slate-900">
          <MathRenderer value={String(text)} />
        </div>
      );
    }

    if (type === "paragraph") {
      return renderTutorText(getStepText(step));
    }

    if (type === "bullet_list") {
      if (Array.isArray(step.items) && step.items.length > 0) return renderListItems(step.items);
      return renderTutorText(getStepText(step));
    }

    if (type === "formula") {
      const formulaRaw = normalizeDisplayText((typeof step.formula === "string" && step.formula) || step.latex || step.content || (step.formula && step.formula.latex) || "");
      const hasMathLikeContent = hasMathDelimiter(formulaRaw) || looksLikeLatex(formulaRaw) || isLikelyMathFormula(formulaRaw);
      const looksMostlyProse = isLikelyProseExplanation(formulaRaw);
      const formula = hasMathLikeContent && !looksMostlyProse ? normalizeFormulaLatex(formulaRaw, { preferBlock: true }) : "";
      return (
        <div>
          {formula ? <MathRenderer value={String(formula)} className="[&>p]:m-0" /> : renderTutorText(formulaRaw || getStepText(step))}
          {step.caption ? <div className="mt-1 text-xs text-slate-500">{String(step.caption)}</div> : null}
        </div>
      );
    }

    if (type === "calculation_step") {
      if (Array.isArray(step.lines) && step.lines.length > 0) {
        return (
          <div className="space-y-1">
            {step.lines.map((ln, li) => {
              const line = normalizeDisplayText(typeof ln === 'string' ? ln : String(ln));
              const preferBlock = looksLikeLatex(line);
              const normalized = normalizeFormulaLatex(line, { preferBlock });
              const isBlock = !!(normalized && /^\$\$[\s\S]*\$\$/.test(normalized));
              return (
                <div key={li} className="[&>p]:m-0">{
                  isBlock ? (
                    <MathRenderer value={normalized} className="[&>p]:m-0" />
                  ) : (
                    <MathRenderer value={normalized} className="[&>p]:m-0" />
                  )
                }</div>
              );
            })}
          </div>
        );
      }

      // fallback to content or latex
      if (step.content) return renderTutorText(step.content);
      if (step.latex) return <MathRenderer value={String(normalizeFormulaLatex(step.latex, { preferBlock: true }))} className="[&>p]:m-0" />;
      return <div className="text-sm text-slate-700">Calculation step</div>;
    }

    if (type === "truth_table") {
      const tableLike = step.table || step.data || step.rows || step;
      return (
        <div>
          <div className="text-xs font-semibold text-slate-500">Truth table</div>
          <div className="mt-2">{renderTable(tableLike)}</div>
        </div>
      );
    }

    if (type === "table") {
      const tableLike = step.table || step.data || step.rows || step;
      return (
        <div>
          {step.caption ? <div className="text-xs text-slate-500">{String(step.caption)}</div> : null}
          <div className="mt-2">{renderTable(tableLike)}</div>
        </div>
      );
    }

    if (type === "diagram_reference") {
      return resolveDiagramReference(step, context);
    }

    if (type === "table_reference") {
      return resolveTableReference(step, context);
    }

    if (type === "generated_svg") {
      const svg = step.svg || step.generated_svg || step.diagram_svg || step.diagramSvg || null;
      if (svg) {
        return (
          <div>
            {step.title ? <div className="text-sm font-semibold text-slate-900">{String(step.title)}</div> : null}
            <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3 max-h-[360px] overflow-auto flex items-center justify-center">
              <div className="w-full max-w-full">
                <QuestionDiagram diagramType={"svg"} diagramSvg={svg} />
              </div>
            </div>
            {step.caption ? <div className="mt-1 text-xs text-slate-500">{String(step.caption)}</div> : null}
          </div>
        );
      }
      return renderTutorText(getStepText(step));
    }

    if (type === "example") {
      return (
        <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
          {step.title ? <div className="font-semibold"><MathRenderer value={typeof step.title === 'string' ? step.title : getStepText(step)} /></div> : null}
          {step.content ? <div className="mt-1">{renderTutorText(step.content)}</div> : renderTutorText(getStepText(step))}
          {Array.isArray(step.items) ? <div className="mt-2">{renderListItems(step.items)}</div> : null}
        </div>
      );
    }

    if (type === "warning") {
      return (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          {step.title ? <div className="font-semibold"><MathRenderer value={typeof step.title === 'string' ? step.title : getStepText(step)} /></div> : null}
          {renderTutorText(getStepText(step), "mt-1 text-sm text-amber-800")}
        </div>
      );
    }

    if (type === "practice") {
      return (
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <div className="text-xs font-semibold text-slate-500">Practice</div>
          <div className="mt-1">{renderTutorText(step.content ?? step.prompt ?? getStepText(step))}</div>
        </div>
      );
    }

    if (type === "diagram_note") {
      return <div className="text-xs text-slate-500">{renderTutorText(getStepText(step))}</div>;
    }

    // Generic handling: try content, latex, items, formula, text
    if (step.formula || step.latex) {
      return <MathRenderer value={normalizeDisplayText(String(step.formula ?? step.latex))} />;
    }

    if (Array.isArray(step.items)) return renderListItems(step.items);

    if (step.content) return renderTutorText(step.content);
    if (step.text) return renderTutorText(step.text);
    if (step.description) return renderTutorText(step.description);

    return <div className="text-sm text-slate-700">Tutor step could not be rendered in its original format.</div>;
  } catch {
    // Robust fallback on malformed step
    return <div className="text-sm text-slate-700">Tutor step could not be rendered.</div>;
  }
}

export default function TutorModal({ isOpen, onClose, tutorResponse = null, loading = false, error = null, onRetry = null, selectedTutorQuestion = null }) {
  // Chat state (local to this modal) -- declared unconditionally to satisfy hooks rules
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState(null);

  // Speech state for browser SpeechSynthesis (text-to-speech)
  const [speechSupported] = useState(() => {
    try {
      return Boolean(typeof window !== 'undefined' && window.speechSynthesis && window.SpeechSynthesisUtterance);
    } catch {
      return false;
    }
  });
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [speechError, setSpeechError] = useState(null);
  const currentUtteranceRef = useRef(null);

  // Speech recognition (voice input) state
  const [voiceSupported] = useState(() => {
    try {
      return Boolean(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
    } catch {
      return false;
    }
  });
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const lastFinalTranscriptRef = useRef("");
  const startListeningRef = useRef(null);

  const startListening = useCallback(() => {
    setVoiceError(null);
    try {
      const Recognition = (typeof window !== 'undefined') ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
      if (!Recognition) {
        setVoiceError("Voice input is not supported in this browser.");
        return;
      }

      // mark that we should keep listening across browser auto-ends
      shouldKeepListeningRef.current = true;
      lastFinalTranscriptRef.current = "";

      // prevent starting when already active
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { void 0; }
        recognitionRef.current = null;
      }

      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = (tutorResponse && tutorResponse.language === "bn") ? "bn-BD" : "en-US";

      recognition.onresult = (ev) => {
        try {
          const results = ev && ev.results;
          if (!results) return;

          const startIndex = ev.resultIndex || 0;
          for (let i = startIndex; i < results.length; i++) {
            const res = results[i];
            if (!res || !res[0]) continue;
            const transcriptPiece = String(res[0].transcript || "").trim();
            if (!transcriptPiece) continue;

            if (res.isFinal) {
              if (transcriptPiece && transcriptPiece !== lastFinalTranscriptRef.current) {
                setChatInput((prev) => {
                  const prevTrim = String(prev || "").trim();
                  if (prevTrim) return `${prevTrim} ${transcriptPiece}`;
                  return transcriptPiece;
                });
                lastFinalTranscriptRef.current = transcriptPiece;
                setVoiceError(null);
              }
            } else {
              // interim: ignored for MVP (could show a small live hint)
            }
          }
        } catch {
          // ignore individual result errors
        }
      };

      recognition.onerror = (ev) => {
        const err = ev && ev.error ? ev.error : null;
        if (err === "not-allowed" || err === "permission-denied" || err === "security") {
          shouldKeepListeningRef.current = false;
          setVoiceError("Microphone permission was denied.");
          setIsListening(false);
          recognitionRef.current = null;
        } else if (err === "no-speech") {
          // do not stop keep-listening on transient no-speech
          setVoiceError("Still listening... speak again.");
        } else if (err === "network" || err === "service-not-available" || err === "connection") {
          shouldKeepListeningRef.current = false;
          setVoiceError("Voice input is not available right now.");
          setIsListening(false);
          recognitionRef.current = null;
        } else {
          shouldKeepListeningRef.current = false;
          setVoiceError("Voice input failed. Try again.");
          setIsListening(false);
          recognitionRef.current = null;
        }
      };

      recognition.onend = () => {
        // browser ended recognition (often after silence); restart if requested
        recognitionRef.current = null;
        if (shouldKeepListeningRef.current && isOpen) {
          setTimeout(() => {
            try {
              if (shouldKeepListeningRef.current && isOpen) {
                try { startListeningRef.current && startListeningRef.current(); } catch { void 0; }
              }
            } catch {
              // ignore restart errors
            }
          }, 200);
        } else {
          setIsListening(false);
          recognitionRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      try {
        recognition.start();
      } catch {
        setIsListening(false);
        recognitionRef.current = null;
        setVoiceError("Voice input failed. Try again.");
        shouldKeepListeningRef.current = false;
      }
    } catch {
      setVoiceError("Voice input failed. Try again.");
      shouldKeepListeningRef.current = false;
    }
  }, [tutorResponse, isOpen]);

  // Keep a ref to the startListening function so onend can trigger a restart without lint errors
  useEffect(() => {
    startListeningRef.current = startListening;
    return () => {
      startListeningRef.current = null;
    };
  }, [startListening]);

  const stopListening = useCallback(() => {
    try {
      // signal that we should not auto-restart
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { void 0; }
        recognitionRef.current = null;
      }
    } catch {
      void 0;
    }
    setIsListening(false);
  }, []);

  // stop recognition when modal closes or component unmounts
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => stopListening(), 0);
      return () => clearTimeout(t);
    }
    return () => {
      stopListening();
    };
  }, [isOpen, stopListening]);

  const stopSpeech = useCallback(() => {
    try {
      if (window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {
      void 0;
    }
    setSpeakingMessageId(null);
    setSpeechError(null);
    currentUtteranceRef.current = null;
  }, []);

  const speakMessage = useCallback((text, messageId) => {
    if (!text || !speechSupported) return;
    try {
      // stop any existing speech first
      if (window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {
      void 0;
    }

    setSpeechError(null);

    try {
      const Utterance = window.SpeechSynthesisUtterance;
      const utterance = new Utterance(String(text));
      // language selection: if tutorResponse?.language === "bn" -> bn-BD else en-US
      utterance.lang = (tutorResponse && tutorResponse.language === "bn") ? "bn-BD" : "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1;

      utterance.onend = () => {
        setSpeakingMessageId(null);
        currentUtteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeakingMessageId(null);
        currentUtteranceRef.current = null;
        setSpeechError({ targetId: messageId, message: "Audio unavailable right now." });
      };

      currentUtteranceRef.current = utterance;
      setSpeakingMessageId(messageId);

      if (window && window.speechSynthesis) {
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setSpeechError({ targetId: messageId, message: "Audio unavailable right now." });
      setSpeakingMessageId(null);
      currentUtteranceRef.current = null;
    }
  }, [speechSupported, tutorResponse]);

  // Stop speech when modal closes or when component unmounts
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => stopSpeech(), 0);
      return () => clearTimeout(t);
    }
    return () => {
      stopSpeech();
    };
  }, [isOpen, stopSpeech]);

  const questionId =
    (tutorResponse && (tutorResponse.question_id || (tutorResponse.question_context && (tutorResponse.question_context.question_id || tutorResponse.question_context.id)))) ||
    (selectedTutorQuestion && selectedTutorQuestion.id) ||
    null;

  const canChat = Boolean(tutorResponse && questionId);
  const trimmedChatInput = String(chatInput || "").trim();
  const canSubmitFollowUp = Boolean(canChat && !loading && !chatSending && trimmedChatInput);

  const appendMessage = useCallback((msg) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const classroomScrollRef = useRef(null);

  useEffect(() => {
    if (!speechError) return;
    const t = setTimeout(() => setSpeechError(null), 2400);
    return () => clearTimeout(t);
  }, [speechError]);

  useEffect(() => {
    if (!isOpen) return;
    const node = classroomScrollRef.current;
    if (!node) return;

    const reset = () => {
      try {
        node.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {
        node.scrollTop = 0;
      }
    };

    const t = setTimeout(reset, 0);
    return () => clearTimeout(t);
  }, [isOpen, questionId]);

  async function handleSendChat() {
    const trimmed = String(chatInput || "").trim();
    if (!trimmed) {
      setChatError("Please type a question first.");
      return;
    }

    // Append user message locally (do not log)
    appendMessage({ id: `u-${Date.now()}`, role: "user", text: trimmed });

    setChatInput("");
    setChatError(null);
    setChatSending(true);

    try {
      const payload = {
        message: trimmed,
        language: tutorResponse?.language || "en",
        student_level: tutorResponse?.student_level || "beginner",
      };
      const resp = await apiEndpoints.chatTutorQuestion(questionId, payload);
      const data = resp?.data ?? resp;
      const reply = data?.reply ?? "";
      const source = data?.source ?? tutorResponse?.source ?? null;
      appendMessage({ id: `a-${Date.now()}`, role: "assistant", text: reply, source });
    } catch (err) {
      const status = err?.response?.status ?? err?.status ?? null;
      if (status === 422) {
        setChatError("Please type a valid question.");
      } else {
        setChatError(getAnswerGenerationErrorMessage(err, "Failed to send message."));
      }
    } finally {
      setChatSending(false);
    }
  }

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
  const selectedMeta = (selectedTutorQuestion && selectedTutorQuestion.metadata) || {};

  const subjectValue =
    tutorResponse?.subject_name ||
    context?.subject_name ||
    selectedTutorQuestion?.subject_name ||
    selectedMeta?.subject_name ||
    "-";

  const subjectCodeValue =
    tutorResponse?.subject_code ||
    context?.subject_code ||
    selectedTutorQuestion?.subject_code ||
    selectedMeta?.subject_code ||
    "-";

  const topicValue =
    metadata?.topic ||
    context?.topic ||
    selectedMeta?.topic ||
    selectedTutorQuestion?.topic ||
    "-";

  const subtopicValue =
    metadata?.subtopic ||
    context?.subtopic ||
    selectedMeta?.subtopic ||
    selectedTutorQuestion?.subtopic ||
    null;

  const difficultyValue =
    metadata?.difficulty ||
    tutorResponse?.difficulty ||
    selectedMeta?.difficulty ||
    selectedTutorQuestion?.difficulty ||
    null;

  const sourceValue =
    tutorResponse?.source_label ||
    metadata?.source ||
    context?.source ||
    selectedMeta?.source ||
    selectedTutorQuestion?.source ||
    "Q Arena DB";

  const teacherExplanationText = tutorResponse?.teacher_explanation
    ? (Array.isArray(tutorResponse.teacher_explanation)
      ? tutorResponse.teacher_explanation.map((x) => (typeof x === "string" ? x : String(x))).join("\n\n")
      : String(tutorResponse.teacher_explanation))
    : "";

  // Safe development-only log of source and small diagnostics (do not log full response)
  if (import.meta.env && import.meta.env.DEV) {
    console.log("tutor_response_source:", tutorResponse?.source);
    console.log("has_teacher_explanation:", Boolean(tutorResponse?.teacher_explanation), "speech_supported:", Boolean(speechSupported));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />

      <div className="relative z-10 w-full max-w-[1200px]">
        <Card className="flex max-h-[92vh] min-h-[72vh] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-0 shadow-[0_20px_55px_rgba(15,23,42,0.22)]">
          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 3a4 4 0 0 0-4 4v1H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a4 4 0 0 0-4-4z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9.5 8V7a2.5 2.5 0 0 1 5 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M9 13h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-slate-900">Tutor Classroom</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">AI Tutor is explaining the solution</p>
                  </div>
                  <Badge tone="indigo">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  </Badge>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close Tutor classroom"
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs lg:grid-cols-4">
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Subject</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{subjectValue}</div>
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Subject Code</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{subjectCodeValue}</div>
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Topic</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{topicValue}</div>
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Question ID</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{questionId || "-"}</div>
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Subtopic</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{subtopicValue || "-"}</div>
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Difficulty</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{difficultyValue || "-"}</div>
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Source</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{sourceValue || "Q Arena DB"}</div>
                </div>
                <div>
                  <div className="font-semibold uppercase tracking-wide text-slate-500">Status</div>
                  <div className="mt-0.5 text-[13px] text-slate-800">{loading ? "Loading" : "Ready"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {loading ? (
              <div className="flex flex-1 items-center justify-center gap-3 p-6">
                <LoadingSpinner />
                <div className="text-sm text-slate-600">Loading Tutor classroom...</div>
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="space-y-3">
                  <ErrorMessage message={String(error)} />
                  <div className="flex gap-2">
                    {typeof onRetry === "function" && (
                      <Button type="button" onClick={onRetry}>Retry</Button>
                    )}
                    <Button type="button" onClick={onClose} aria-label="Close Tutor classroom">Close</Button>
                  </div>
                </div>
              </div>
            ) : !tutorResponse ? (
              <div className="p-6 text-sm text-slate-600">No Tutor data available.</div>
            ) : (
              <>
                <div ref={classroomScrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 lg:px-5">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <section className="relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-[#fcfdff] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] lg:p-5">
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
                      <div className="relative z-10 space-y-6">
                      <section className="space-y-4 border-b border-indigo-100/70 pb-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />Initial Response</h4>
                          {teacherExplanationText ? (
                            speechSupported ? (
                              speakingMessageId === "teacher_explanation" ? (
                                <button type="button" className="rounded-md border border-red-200/80 bg-red-50/80 px-2 py-1 text-xs text-red-700" onClick={() => stopSpeech()}>
                                  Stop audio
                                </button>
                              ) : (
                                <button type="button" className="rounded-md border border-indigo-100 bg-white/90 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50" onClick={() => speakMessage(teacherExplanationText, "teacher_explanation")}>
                                  Read aloud
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">Voice output unavailable</span>
                            )
                          ) : null}
                        </div>
                        {speechError?.targetId === "teacher_explanation" ? <div className="mb-2 text-xs text-slate-500">{speechError.message}</div> : null}

                        {(context.question_text || context.stem) && (
                          <div className="mb-4 rounded-xl border border-indigo-100/70 bg-white/80 p-3.5">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</div>
                            {context.question_text ? (
                              <div className="mt-2 text-sm text-slate-800"><MathRenderer value={normalizeDisplayText(context.question_text)} /></div>
                            ) : null}
                            {context.stem ? (
                              <div className="mt-2 text-sm text-slate-800"><MathRenderer value={normalizeDisplayText(context.stem)} /></div>
                            ) : null}
                          </div>
                        )}

                        <div className="space-y-4">
                          <div>
                            <h5 className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Teacher explanation</h5>
                            {tutorResponse.teacher_explanation ? (
                              <div className="mt-2 rounded-xl border border-indigo-100/70 bg-white/85 p-3.5 text-sm text-slate-800">
                                <MathRenderer value={normalizeDisplayText(teacherExplanationText)} />
                              </div>
                            ) : (
                              <div className="mt-2 text-sm text-slate-600">Teacher explanation is not available in metadata preview.</div>
                            )}
                          </div>

                          {Array.isArray(context.parts) && context.parts.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Question parts</h5>
                              <div className="mt-2 space-y-2">
                                {context.parts.map((part, idx) => (
                                  <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="font-semibold text-slate-900">{part.label || `Part ${idx + 1}`}</div>
                                        {part.question_text ? <div className="mt-1 text-slate-800"><MathRenderer value={normalizeDisplayText(part.question_text)} /></div> : null}
                                        {part.instruction ? <div className="mt-1 text-slate-600">{part.instruction}</div> : null}
                                      </div>
                                      <div className="text-xs text-slate-500">{part.marks ? `${part.marks} marks` : null}</div>
                                    </div>
                                    {part.options ? <div className="mt-2">{renderOptions(part.options)}</div> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {context.options && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Options</h5>
                              {renderOptions(context.options)}
                            </div>
                          )}

                          {Array.isArray(context.tables) && context.tables.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Tables</h5>
                              <div className="mt-2 space-y-3">
                                {context.tables.map((table, idx) => (
                                  <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3">
                                    {table.caption ? <div className="text-xs text-slate-500">{table.caption}</div> : null}
                                    <div className="mt-2">{renderTable(table)}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(context.diagram_description || (Array.isArray(context.diagrams) && context.diagrams.length > 0) || (Array.isArray(context.figures) && context.figures.length > 0)) && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Diagrams</h5>
                              <div className="mt-2 space-y-2 text-sm text-slate-700">
                                {context.diagram_description ? <div>{context.diagram_description}</div> : null}
                                {Array.isArray(context.diagrams) && context.diagrams.map((d, i) => (
                                  <div key={i} className="rounded-xl border border-slate-100 bg-white p-2">{d.diagram_reference || d.diagram_description || "Diagram"}</div>
                                ))}
                                {Array.isArray(context.figures) && context.figures.map((f, i) => (
                                  <div key={i} className="rounded-xl border border-slate-100 bg-white p-2">{f.caption || f.reference || "Figure (metadata)"}</div>
                                ))}
                                <div className="text-xs text-slate-500">Original question diagrams are referenced here. AI-generated answer diagrams may appear inside whiteboard steps when available.</div>
                              </div>
                            </div>
                          )}

                          {Array.isArray(context.math_blocks) && context.math_blocks.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Math blocks</h5>
                              <div className="mt-2 space-y-2">
                                {context.math_blocks.map((block, i) => (
                                  <div key={i} className="rounded-xl border border-slate-100 bg-white p-3">
                                    {block.latex ? <MathRenderer value={normalizeDisplayText(block.latex)} /> : <div className="text-sm text-slate-700">{String(block.type || block.content || block.formula || "Math block")}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {Array.isArray(tutorResponse.whiteboard_steps) && tutorResponse.whiteboard_steps.length > 0 && (
                            <div>
                              <h5 className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />Whiteboard Steps</h5>
                              <ol className="mt-2 space-y-0.5">
                                {tutorResponse.whiteboard_steps.map((step, i) => (
                                  <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-l-2 border-indigo-100/80 py-2.5 pl-2.5 pr-1">
                                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">{i + 1}</span>
                                    <div className="min-w-0">
                                      {step && typeof step === "object" && step.type ? (
                                        <div className="mb-1.5">
                                          <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700 ring-1 ring-indigo-100">{String(step.type)}</span>
                                        </div>
                                      ) : null}
                                      <div className="text-sm text-slate-800">{renderWhiteboardStep(step, i, context)}</div>
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {Array.isArray(tutorResponse.hints) && tutorResponse.hints.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Hints</h5>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                                {tutorResponse.hints.map((h, i) => (
                                  <li key={i}>{String(h)}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {Array.isArray(tutorResponse.practice_prompts) && tutorResponse.practice_prompts.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Practice prompts</h5>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                                {tutorResponse.practice_prompts.map((p, i) => (
                                  <li key={i}>{String(p)}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {typeof tutorResponse.practice_prompts === "string" && tutorResponse.practice_prompts.trim() !== "" && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Practice prompts</h5>
                              <div className="mt-2 text-sm text-slate-700">{String(tutorResponse.practice_prompts)}</div>
                            </div>
                          )}

                          {Array.isArray(tutorResponse.exam_tips) && tutorResponse.exam_tips.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Exam tips</h5>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                                {tutorResponse.exam_tips.map((tip, i) => (
                                  <li key={i}>{String(tip)}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {typeof tutorResponse.exam_tips === "string" && tutorResponse.exam_tips.trim() !== "" && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Exam tips</h5>
                              <div className="mt-2 text-sm text-slate-700">{String(tutorResponse.exam_tips)}</div>
                            </div>
                          )}

                          {Array.isArray(tutorResponse.next_actions) && tutorResponse.next_actions.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-slate-900">Next actions</h5>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
                                {tutorResponse.next_actions.map((a, i) => (
                                  <li key={i}>{String(a)}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {tutorResponse?.source === "metadata_fallback" && (
                            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                              AI Tutor is not available for this request, so Q Arena is showing a metadata-based guide.
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="space-y-3 pt-1">
                        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><span className="inline-block h-2 w-2 rounded-full bg-violet-500" />Live Interaction</h4>
                        <div className="mt-3 space-y-2">
                          {chatMessages.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-indigo-200/70 bg-white/80 px-3 py-2 text-sm text-slate-500">
                              No messages yet. Ask a follow-up question.
                            </div>
                          ) : (
                            chatMessages.map((m) => (
                              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                {m.role === "user" ? (
                                  <div className="max-w-[80%] rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                                    <MathRenderer value={normalizeDisplayText(m.text)} />
                                  </div>
                                ) : (
                                  <div className="max-w-[88%] rounded-xl border border-indigo-100/80 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-[0_1px_0_rgba(99,102,241,0.08)]">
                                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">Teacher note</div>
                                    <MathRenderer value={normalizeDisplayText(m.text)} />
                                    <div className="mt-2">
                                      {speechSupported ? (
                                        speakingMessageId === m.id ? (
                                          <button type="button" className="rounded border border-red-200/80 bg-red-50/80 px-2 py-0.5 text-xs text-red-700" onClick={() => stopSpeech()}>
                                            Stop
                                          </button>
                                        ) : (
                                          <button type="button" className="rounded border border-indigo-100 bg-white px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-50" onClick={() => speakMessage(m.text, m.id)}>
                                            Read aloud
                                          </button>
                                        )
                                      ) : (
                                        <span className="text-xs text-slate-400">Voice output unavailable</span>
                                      )}
                                      {speechError?.targetId === m.id ? <div className="mt-1 text-xs text-slate-500">{speechError.message}</div> : null}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </div>
                    </section>

                    <aside className="space-y-3 xl:sticky xl:top-2 xl:self-start">
                      <section className="rounded-2xl border border-indigo-100/80 bg-gradient-to-b from-white to-indigo-50/40 p-3.5">
                        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Session Controls</h4>
                        <div className="mt-3 space-y-3 text-sm">
                          <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white/80 px-3 py-2">
                            <span className="text-slate-600">Live status</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (isListening) stopListening();
                              else startListening();
                            }}
                            disabled={!voiceSupported}
                            className={`w-full rounded-lg border px-3 py-2 text-left ${isListening ? "border-red-200 bg-red-50 text-red-700" : "border-indigo-100 bg-white text-slate-700"} ${!voiceSupported ? "opacity-50" : "hover:bg-indigo-50"}`}
                          >
                            {isListening ? "Stop voice input" : "Start voice input"}
                          </button>
                          <button
                            type="button"
                            onClick={() => stopSpeech()}
                            disabled={!speechSupported}
                            className={`w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-left text-slate-700 ${!speechSupported ? "opacity-50" : "hover:bg-indigo-50"}`}
                          >
                            Stop voice output
                          </button>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-indigo-100/80 bg-white p-3.5">
                        <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />Conversation Flow</h4>
                        <ol className="mt-3 space-y-2 text-sm text-slate-700">
                          <li className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2">1. Initial Explanation</li>
                          <li className={`rounded-lg border px-3 py-2 ${chatMessages.length > 0 ? "border-indigo-200 bg-indigo-50 text-indigo-800 shadow-[inset_3px_0_0_0_rgb(99,102,241)]" : "border-indigo-100 bg-white"}`}>2. Follow-up</li>
                          <li className="rounded-lg border border-indigo-100 bg-white px-3 py-2">3. Summary</li>
                        </ol>
                      </section>
                    </aside>
                  </div>
                </div>

                <div className="sticky bottom-0 border-t border-indigo-100 bg-gradient-to-r from-white via-indigo-50/50 to-white px-4 py-3 backdrop-blur-sm lg:px-5">
                  {chatError ? <div className="mb-2 text-sm text-red-500">{chatError}</div> : null}
                  {voiceError ? <div className="mb-2 text-sm text-red-500">{voiceError}</div> : null}

                  <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white/90 p-2 shadow-[0_-1px_0_rgba(99,102,241,0.06)]">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (!canSubmitFollowUp) return;
                          e.preventDefault();
                          handleSendChat();
                        }
                      }}
                      placeholder="Ask a follow-up question..."
                      className="h-11 flex-1 rounded-xl border border-indigo-100 bg-white px-3 text-sm outline-none ring-0 focus:border-indigo-300 focus:bg-white"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        if (isListening) stopListening();
                        else startListening();
                      }}
                      disabled={!voiceSupported}
                      aria-label={isListening ? "Stop voice input" : (!voiceSupported ? "Voice input is not supported" : "Start voice input")}
                      title={isListening ? "Stop voice input" : (!voiceSupported ? "Voice input is not supported" : "Start voice input")}
                      className={`h-11 w-11 rounded-xl border ${isListening ? "border-red-200 bg-red-50 text-red-600" : "border-indigo-100 bg-white text-indigo-700"} ${!voiceSupported ? "cursor-not-allowed opacity-50" : "hover:bg-indigo-50"}`}
                    >
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                        {isListening ? (
                          <>
                            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" fill="currentColor" />
                            <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 5 5 0 0 0 4 4.9V19a1 1 0 1 0 2 0v-3.1A5 5 0 0 0 19 11z" fill="currentColor" />
                          </>
                        ) : (
                          <>
                            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 11a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 19v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </>
                        )}
                      </svg>
                    </button>

                    <Button type="button" onClick={handleSendChat} disabled={!canSubmitFollowUp} className="h-11 rounded-xl px-4">
                      {chatSending ? "Sending..." : "Send"}
                    </Button>
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {isListening ? "Listening..." : ""}
                    {!canChat ? "Follow-up is unavailable for this response." : ""}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
