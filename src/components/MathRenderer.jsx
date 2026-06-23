import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";


const KATEX_OPTIONS = {
  throwOnError: false,
  strict: false,
  trust: false,
};

const DISPLAY_ENVIRONMENTS = [
  "bmatrix",
  "matrix",
  "pmatrix",
  "vmatrix",
  "Vmatrix",
  "smallmatrix",
  "cases",
  "aligned",
  "array",
];

const SIMPLE_INLINE_COMMANDS = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "theta",
  "lambda",
  "mu",
  "pi",
  "rho",
  "sigma",
  "phi",
  "omega",
  "neq",
  "ne",
  "leq",
  "geq",
  "lt",
  "gt",
  "times",
  "cdot",
  "oplus",
  "leftarrow",
  "rightarrow",
  "leftrightarrow",
  "Rightarrow",
  "Leftarrow",
  "Leftrightarrow",
  "infty",
];

function decodeCommonEscapes(input) {
  if (typeof input !== "string") return "";

  return input
    .replace(/\\u2260/g, "≠")
    .replace(/\\u2192/g, "→")
    .replace(/\\u2190/g, "←")
    .replace(/\\u2194/g, "↔")
    .replace(/\\u21d2/g, "⇒")
    .replace(/\\u21d0/g, "⇐")
    .replace(/\\u21d4/g, "⇔")
    .replace(/\\u2264/g, "≤")
    .replace(/\\u2265/g, "≥")
    .replace(/\\u2212/g, "−")
    .replace(/\\u00d7/g, "×")
    .replace(/\\u00f7/g, "÷");
}

function normalizeEscapedLatex(input) {
  if (typeof input !== "string") return "";

  let out = input;

  // Convert double-escaped LaTeX commands: \\lambda -> \lambda, \\begin -> \begin.
  // This only touches double backslashes followed by letters, so matrix row separators like \\ before numbers are preserved.
  out = out.replace(/\\\\([a-zA-Z]+)/g, "\\$1");

  // Convert double-escaped math delimiters.
  out = out.replace(/\\\\\(/g, "\\(");
  out = out.replace(/\\\\\)/g, "\\)");
  out = out.replace(/\\\\\[/g, "\\[");
  out = out.replace(/\\\\\]/g, "\\]");

  // Convert LaTeX delimiters to remark-math delimiters.
  out = out.replace(/\\\[/g, "$$");
  out = out.replace(/\\\]/g, "$$");
  out = out.replace(/\\\(/g, "$");
  out = out.replace(/\\\)/g, "$");

  // Remove accidental triple/quad dollar runs created by bad model output.
  out = out.replace(/\${3,}/g, "$$");

  return out;
}


function splitByMathSegments(input) {
  if (typeof input !== "string" || !input) return [];

  // Keep existing math segments untouched.
  return input.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g).filter((part) => part !== "");
}

function wrapDisplayEnvironmentsInText(input) {
  if (typeof input !== "string") return "";

  const envPattern = DISPLAY_ENVIRONMENTS.join("|");
  const envRegex = new RegExp(
    `\\\\begin\\{(${envPattern})\\}[\\s\\S]*?\\\\end\\{\\1\\}`,
    "g",
  );

  return input.replace(envRegex, (match) => {
    return `\n\n$$${match}$$\n\n`;
  });
}

function protectExistingMath(input, transformer) {
  return splitByMathSegments(input)
    .map((segment) => {
      if (segment.startsWith("$")) return segment;
      return transformer(segment);
    })
    .join("");
}

function wrapRegexMatches(input, regex) {
  return input.replace(regex, (match) => {
    if (!match || match.includes("$")) return match;
    const trimmed = match.trim();
    if (!trimmed) return match;

    const leading = match.match(/^\s*/)?.[0] ?? "";
    const trailing = match.match(/\s*$/)?.[0] ?? "";
    return `${leading}$${trimmed}$${trailing}`;
  });
}

function wrapBareInlineMath(input) {
  if (typeof input !== "string") return "";

  return protectExistingMath(input, (plain) => {
    let out = plain;

    // Row operation expressions: R2\leftarrow R2-2R1
    out = wrapRegexMatches(
      out,
      /\b[RF]\d+\s*\\(?:leftarrow|rightarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow)\s*[^,.;\n]+/g,
    );

    // Simple command with braced argument: \vec{v}, \bar{P}, \sqrt{21}
    out = wrapRegexMatches(
      out,
      /\\(?:vec|bar|overline|sqrt|text)\{[^{}\n]+\}/g,
    );

    // Fractions: \frac{a}{b}
    out = wrapRegexMatches(
      out,
      /\\frac\{[^{}\n]+\}\{[^{}\n]+\}/g,
    );

    // Greek/symbol commands: \lambda, \neq, \Rightarrow, \cdot
    const commandPattern = SIMPLE_INLINE_COMMANDS.join("|");
    out = wrapRegexMatches(
      out,
      new RegExp(`\\\\(?:${commandPattern})(?![a-zA-Z])`, "g"),
    );

    // Subscript/superscript variables: x_1, x_{1}, Q_n^+
    out = wrapRegexMatches(
      out,
      /\b[A-Za-z]\w*(?:_\{?[-+]?\w+\}?|\^\{?[-+]?\w+\}?)+(?:\s*=\s*[-+]?\w+(?:_\{?[-+]?\w+\}?)?)?/g,
    );

    // Compact equations containing math variables, but avoid normal English sentences.
    out = wrapRegexMatches(
      out,
      /\b[A-Za-z]\w*(?:_\{?[-+]?\w+\}?)?\s*=\s*[-+]?\d+(?:\.\d+)?\b/g,
    );

    return out;
  });
}

function normalizeMixedMath(input) {
  let out = decodeCommonEscapes(input);
  out = normalizeEscapedLatex(out);
  out = protectExistingMath(out, wrapDisplayEnvironmentsInText);
  out = wrapBareInlineMath(out);

  // Clean awkward spacing around display blocks.
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  return out;
}

function getSafeMathText(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);

  // Do not show [object Object].
  return "";
}

function MathRenderer({ value = "", className = "" }) {
  const safe = getSafeMathText(value);

  if (safe === null) return null;
  if (!safe.trim()) return null;

    const normalizedValue = normalizeMixedMath(safe);

  const wrapperClass = `qa-math-renderer qa-content w-full max-w-full min-w-0 ${className || ""}`.trim();

  return (
    <div className={wrapperClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}
      >
        {normalizedValue}
      </ReactMarkdown>
    </div>
  );
}

export default MathRenderer;