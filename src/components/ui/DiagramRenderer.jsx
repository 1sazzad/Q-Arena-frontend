import QuestionDiagram from "./QuestionDiagram";

function getOptionalText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isDiagramRequired(value) {
  return value === true || value === "true";
}

function getDiagramProps(source = {}) {
  return {
    diagramRequired: isDiagramRequired(source.diagram_required),
    diagramType: getOptionalText(source.diagram_type),
    diagramSvg: getOptionalText(source.diagram_svg),
    diagramDescription: getOptionalText(source.diagram_description),
    diagramReference: getOptionalText(source.diagram_reference),
  };
}

function DiagramRenderer({
  question,
  diagram_required,
  diagram_type,
  diagram_svg,
  diagram_description,
  diagram_reference,
  className = "",
}) {
    const diagram = getDiagramProps(

    question || {
      diagram_required,
      diagram_type,
      diagram_svg,
      diagram_description,
      diagram_reference,
    },
  );


  if (!diagram.diagramRequired && !diagram.diagramSvg && !diagram.diagramDescription) {
    return null;
  }

    if (diagram.diagramSvg) {
    return (
      <div className={`my-4 ${className}`}>
        <div className="flex flex-col items-center gap-1">
                    <QuestionDiagram
            diagramType={diagram.diagramType}
            diagramSvg={diagram.diagramSvg}
            className="w-full max-w-full overflow-x-auto rounded-lg border bg-white p-2"
          />
          {diagram.diagramReference && (
            <p className="text-[11px] leading-4 text-slate-500">Reference: {diagram.diagramReference}</p>
          )}
        </div>
      </div>
    );
  }


  if (diagram.diagramDescription) {
    return (
      <div className={`my-4 rounded-lg border bg-yellow-50 p-3 text-sm text-gray-700 ${className}`}>
        <strong>Diagram:</strong> {diagram.diagramDescription}
        {diagram.diagramReference && <p className="mt-1 text-[11px] leading-4 text-gray-500">Reference: {diagram.diagramReference}</p>}
      </div>
    );
  }

  if (diagram.diagramRequired) {
    return (
      <div className={`my-4 rounded-lg border bg-yellow-50 p-3 text-sm text-gray-700 ${className}`}>
        Diagram required.
        {diagram.diagramReference && <p className="mt-1 text-[11px] leading-4 text-gray-500">Reference: {diagram.diagramReference}</p>}
      </div>
    );
  }

  return null;
}

export default DiagramRenderer;