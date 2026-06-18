import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import QuestionDiagram from "./QuestionDiagram";

describe("QuestionDiagram SVG sanitization", () => {
  test("renders safe SVG with circle", () => {
    const svg = `<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} />
    );

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("circle")).not.toBeNull();
  });

  test("removes script tags but keeps shapes", () => {
    const svg = `<svg><script>alert("xss")</script><circle cx="5" cy="5" r="4"/></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} />
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("circle")).not.toBeNull();
  });

  test("removes event handler attributes", () => {
    const svg = `<svg><circle onload="alert(1)" cx="5" cy="5" r="4"/></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} />
    );

    const circle = container.querySelector("circle");
    expect(circle).not.toBeNull();
    expect(circle.hasAttribute("onload")).toBe(false);
  });

  test("neutralizes javascript: URLs", () => {
    const svg = `<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} />
    );

    // Rendered HTML should not contain javascript: URIs
    expect(container.innerHTML.toLowerCase()).not.toContain("javascript:");
    // The text content should still be present
    expect(container.querySelector("text")).not.toBeNull();
  });

  test("foreignObject dangerous content is neutralized", () => {
    const svg = `<svg><foreignObject><body xmlns='http://www.w3.org/1999/xhtml'><script>alert(1)</script><div>hi</div></body></foreignObject></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} />
    );

    // no script tags left
    expect(container.querySelector("script")).toBeNull();
    // foreignObject content may be removed by sanitizer; ensure no executable content remains
    expect(container.innerHTML.toLowerCase()).not.toContain("script");
  });

  test("exposes accessible name when description provided", () => {
    const svg = `<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} diagramDescription={"A simple square diagram"} />
    );

    const img = container.querySelector('[role="img"]');
    expect(img).not.toBeNull();
    expect(img.getAttribute('aria-label')).toBe('A simple square diagram');
    // figcaption (sr-only) should also contain the description
    expect(container.querySelector('figcaption').textContent).toBe('A simple square diagram');
  });

  test("provides generic label when required but no description", () => {
    const svg = `<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} diagramRequired={true} />
    );

    const img = container.querySelector('[role="img"]');
    expect(img).not.toBeNull();
    expect(img.getAttribute('aria-label')).toBe('Question diagram');
    expect(container.querySelector('figcaption').textContent).toBe('Question diagram');
  });

  test("marks decorative diagrams as aria-hidden when no description and not required", () => {
    const svg = `<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/></svg>`;
    const { container } = render(
      <QuestionDiagram diagramType="svg" diagramSvg={svg} />
    );

    const svgWrapper = container.querySelector('.diagram-svg');
    expect(svgWrapper).not.toBeNull();
    expect(svgWrapper.getAttribute('aria-hidden')).toBe('true');
  });
});
