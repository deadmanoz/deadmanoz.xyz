import { describe, expect, it } from "vitest";

import { applyPlotChrome, paperEncodings, snapshotEncodings, type PlotTrace } from "./plot-theme";

describe("paper plot encodings", () => {
  it("gives colour-only bar series a pattern and restores the absent original", () => {
    const bars: PlotTrace[] = [
      { type: "bar", marker: { color: "#00A0D0" } },
      { type: "bar", marker: { color: "#FF6C11" } },
    ];
    expect(snapshotEncodings(bars).map((item) => item.pattern)).toEqual([null, null]);
    expect(paperEncodings(bars).map((item) => item.pattern)).toEqual(["/", "\\"]);
    expect(paperEncodings(bars).map((item) => item.patternSize)).toEqual([8, 8]);
  });

  it("repeats a bar hatch at a coarser size once the seven shapes are used", () => {
    const bars: PlotTrace[] = Array.from({ length: 8 }, (_, index) => ({
      type: "bar" as const,
      marker: { color: `#${index}${index}${index}${index}${index}${index}` },
    }));
    const paper = paperEncodings(bars);
    expect(paper[0].pattern).toBe("/");
    expect(paper[0].patternSize).toBe(8);
    expect(paper[7].pattern).toBe("/");
    expect(paper[7].patternSize).toBe(16);
  });

  it("dashes multi-series scatter traces that have no dash or symbol", () => {
    const traces: PlotTrace[] = [
      { type: "scatter", marker: { color: "#00A0D0" } },
      { type: "scatter", line: { dash: "dot" } },
    ];
    const paper = paperEncodings(traces);
    expect(paper[0].dash).toBe("solid");
    expect(paper[0].markerColor).toBe("#11100b");
    expect(paper[1].dash).toBe("dot");
    expect(paper[1].lineColor).toBe("#11100b");
  });

  it("paints a single series in ink and remembers the original colour", () => {
    const traces: PlotTrace[] = [{ type: "scatter", line: { color: "#20E516" } }];
    expect(snapshotEncodings(traces)[0].lineColor).toBe("#20E516");
    expect(paperEncodings(traces)[0].lineColor).toBe("#11100b");
  });

  it("replaces filled areas with ink density and a hatch", () => {
    const traces: PlotTrace[] = [
      { type: "scatter", fill: "tozeroy", fillcolor: "rgba(46, 204, 113, 0.7)" },
      { type: "scatter", fill: "tonexty", fillcolor: "rgba(231, 76, 60, 0.7)" },
    ];
    const paper = paperEncodings(traces);
    expect(paper[0].fillColor).toBe("rgba(17, 16, 11, 0.18)");
    expect(paper[0].fillPattern).toBe("/");
    expect(paper[1].fillColor).toBe("rgba(17, 16, 11, 0.55)");
    expect(paper[1].fillPattern).toBe("\\");
  });

  it("overlays paper chrome without replacing an axis range", () => {
    const layout = applyPlotChrome(
      { xaxis: { range: [1, 2], title: { text: "height" } }, title: { text: "Hash", font: { color: "#FF8664" } } },
      "paper",
    );
    expect(layout.paper_bgcolor).toBe("#f3efe4");
    expect(layout.xaxis?.range).toEqual([1, 2]);
    expect(layout.xaxis?.title).toEqual({ text: "height" });
    expect(layout.xaxis?.linecolor).toBe("#11100b");
    expect(layout.title && typeof layout.title === "object" ? layout.title.font?.color : null).toBe("#11100b");
  });
});
