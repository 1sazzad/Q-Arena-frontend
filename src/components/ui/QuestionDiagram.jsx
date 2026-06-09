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
      } catch (err) {
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

function QuestionDiagram({ diagramType = "", diagramSvg = "", className = "" }) {
  if (!diagramSvg || String(diagramType).toLowerCase() !== "svg") return null;

  let cleanSvg = "";
  let normalizedSvg = "";
  try {
    const preprocessed = inlineCommonSvgStyles(diagramSvg);
    normalizedSvg = preprocessed;
    cleanSvg = DOMPurify.sanitize(preprocessed, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  } catch (e) {
    cleanSvg = "";
  }

  if (!cleanSvg) return null;

  return (
    <div className={className || "mt-4 rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto"}>
      <div className="diagram-svg question-svg-diagram w-full max-w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: cleanSvg }} />
    </div>
  );
}

export default QuestionDiagram;
