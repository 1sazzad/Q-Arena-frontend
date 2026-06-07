import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const KATEX_OPTIONS = {
  throwOnError: false,
  strict: false,
  trust: false,
};

function normalizeLatexDelimiters(input) {
  if (typeof input !== 'string') return input;

  // Normalize double escaped LaTeX commands (\\sum -> \sum) only for known commands
  const knownCommands = ['sum', 'bar', 'gamma', 'frac', 'sqrt', 'leq', 'geq', 'neq', 'times', 'cdot', 'alpha', 'beta', 'delta', 'epsilon', 'theta', 'lambda', 'mu', 'pi', 'rho', 'sigma', 'phi', 'omega'];
  knownCommands.forEach(cmd => {
    const doubleEscaped = new RegExp('\\\\' + cmd, 'g');
    input = input.replace(doubleEscaped, '\\' + cmd);
  });

  // Convert block delimiters \[ or \] or \\[ or \\] to $$
  input = input.replace(/\\\\\[/g, '$$');
  input = input.replace(/\\\[/g, '$$');
  input = input.replace(/\\\\\]/g, '$$');
  input = input.replace(/\\\]/g, '$$');

  // Convert inline delimiters \( or \) or \\( or \\) to $
  input = input.replace(/\\\\\(/g, '$');
  input = input.replace(/\\\(/g, '$');
  input = input.replace(/\\\\\)/g, '$');
  input = input.replace(/\\\)/g, '$');

  return input;
}

function MathRenderer({ value = "", className = "" }) {
  if (!value || (typeof value === "string" && !value.trim())) {
    return null;
  }

  const normalizedValue = normalizeLatexDelimiters(String(value));

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, KATEX_OPTIONS]]}>
        {normalizedValue}
      </ReactMarkdown>
    </div>
  );
}

export default MathRenderer;
