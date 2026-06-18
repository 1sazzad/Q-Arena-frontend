import DOMPurify from "dompurify";

function inlineCommonSvgStyles(svg) {
  if (!svg || typeof svg !== "string") return svg || "";

  const mappings = [
    { classes: ["e", "edge"], attrs: 'stroke="#111" stroke-width="2.5" fill="none"' },
    { classes: ["n", "v"], attrs: 'fill="#fff" stroke="#111" stroke-width="2.5"' },
    { classes: ["node"], attrs: 'fill="#111"' },
    { classes: ["lbl", "label", "t"], attrs: 'fill="#111"' },
  ];

  let out = svg;

  mappings.forEach(({ classes, attrs }) => {
    classes.forEach((cls) => {
      try {
        // Match class="... cls ..." or class='... cls ...' and append attrs after the class attribute
        const re = new RegExp("class=(['\"])([^\"']*\\b" + cls + "\\b[^\"']*)\\1", "g");
        out = out.replace(re, function (match, quote, clsContent) {
          // keep the original class attribute, and append attributes after it
          return 'class=' + quote + clsContent + quote + ' ' + attrs;
        });
      } catch {
        // ignore regex errors for unexpected class names
      }
    });
  });

  // As a final fallback, replace simple class="e" or class='e' occurrences
  out = out.replace(/class=("|')e\1/g, 'class=$1e$1 stroke="#111" stroke-width="2.5" fill="none"');
  out = out.replace(/class=("|')edge\1/g, 'class=$1edge$1 stroke="#111" stroke-width="2.5" fill="none"');
  out = out.replace(/class=("|')n\1/g, 'class=$1n$1 fill="#fff" stroke="#111" stroke-width="2.5"');
  out = out.replace(/class=("|')node\1/g, 'class=$1node$1 fill="#111"');
  out = out.replace(/class=("|')lbl\1/g, 'class=$1lbl$1 fill="#111"');
  out = out.replace(/class=("|')label\1/g, 'class=$1label$1 fill="#111"');
  out = out.replace(/class=("|')t\1/g, 'class=$1t$1 fill="#111"');

  return out;
}

function QuestionDiagram({ diagramType = "", diagramSvg = "", className = "", diagramDescription = "", diagramRequired = false }) {
  if (!diagramSvg || String(diagramType).toLowerCase() !== "svg") return null;

  let cleanSvg;
  try {
    const preprocessed = inlineCommonSvgStyles(diagramSvg);
    cleanSvg = DOMPurify.sanitize(preprocessed, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  } catch {
    cleanSvg = "";
  }

  if (!cleanSvg) return null;

  // Accessibility: expose accessible name/description for meaningful diagrams.
  // Priority: use provided diagramDescription; if missing and diagram is required, use generic label; otherwise mark as decorative.
  const hasDescription = Boolean(diagramDescription && String(diagramDescription).trim());
  const accessibleLabel = hasDescription ? String(diagramDescription).trim() : diagramRequired ? "Question diagram" : null;

  const wrapperClass = className || "mt-4 rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto";

  return (
    <figure className={wrapperClass}>
      <div
        className="diagram-svg question-svg-diagram w-full max-w-full overflow-x-auto"
        // If we have an accessible label, expose role=img and aria-label. Otherwise mark as decorative for AT.
        {...(accessibleLabel ? { role: "img", "aria-label": accessibleLabel, "aria-atomic": "true" } : { "aria-hidden": "true" })}
        dangerouslySetInnerHTML={{ __html: cleanSvg }}
      />
      {accessibleLabel ? (
        // sr-only caption for screen readers and assistive tech
        <figcaption className="sr-only">{accessibleLabel}</figcaption>
      ) : null}
    </figure>
  );
}

export default QuestionDiagram;
