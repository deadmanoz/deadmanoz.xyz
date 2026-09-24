import type { Layout } from "plotly.js-basic-dist";

import { synthwaveColors } from "./colors";

export const PAPER_BG = "#f3efe4";
export const PAPER_INK = "#11100b";

const DASHES = ["solid", "dash", "dot", "dashdot", "longdash", "longdashdot"];
const PATTERNS = ["/", "\\", "x", "-", "|", "+", "."];
const FILLS = ["rgba(17, 16, 11, 0.18)", "rgba(17, 16, 11, 0.55)"];

export type PlotTrace = {
  type?: string;
  fill?: string;
  fillcolor?: string;
  fillpattern?: { shape?: string };
  line?: { dash?: string; color?: string };
  marker?: {
    color?: string | string[];
    symbol?: string | string[];
    pattern?: { shape?: string | string[] };
  };
};

export type TraceEncoding = {
  dash: string | null;
  symbol: string | null;
  pattern: string | null;
  lineColor: string | null;
  markerColor: string | string[] | null;
  fillColor: string | null;
  fillPattern: string | null;
};

function stringValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function snapshotEncodings(data: PlotTrace[]): TraceEncoding[] {
  return data.map((trace) => ({
    dash: stringValue(trace.line?.dash),
    symbol: stringValue(trace.marker?.symbol),
    pattern: stringValue(trace.marker?.pattern?.shape),
    lineColor: typeof trace.line?.color === "string" ? trace.line.color : null,
    markerColor: trace.marker?.color ?? null,
    fillColor: typeof trace.fillcolor === "string" ? trace.fillcolor : null,
    fillPattern: stringValue(trace.fillpattern?.shape),
  }));
}

function isBar(trace: PlotTrace) {
  return trace.type === "bar";
}

function isScatter(trace: PlotTrace) {
  return trace.type === undefined || trace.type === "scatter" || trace.type === "scattergl";
}

export function paperEncodings(data: PlotTrace[]): TraceEncoding[] {
  const next = snapshotEncodings(data);
  const scatter = data.flatMap((trace, index) => (isScatter(trace) ? [index] : []));
  if (scatter.length > 1) {
    let dash = 0;
    for (const index of scatter) {
      if (next[index].dash == null && next[index].symbol == null) {
        next[index] = { ...next[index], dash: DASHES[dash % DASHES.length] };
        dash += 1;
      }
    }
  }
  const bars = data.flatMap((trace, index) => (isBar(trace) ? [index] : []));
  const colours = new Set(bars.map((index) => JSON.stringify(data[index].marker?.color ?? null)));
  if (bars.length > 1 && colours.size > 1 && bars.every((index) => next[index].pattern == null)) {
    bars.forEach((index, nth) => {
      next[index] = { ...next[index], pattern: PATTERNS[nth % PATTERNS.length] };
    });
  }
  data.forEach((trace, index) => {
    if (!isScatter(trace) && !isBar(trace)) return;
    const marker = next[index].markerColor;
    next[index] = {
      ...next[index],
      lineColor: PAPER_INK,
      markerColor: Array.isArray(marker) ? marker.map(() => PAPER_INK) : PAPER_INK,
    };
  });
  let fill = 0;
  data.forEach((trace, index) => {
    if (!trace.fill && !trace.fillcolor) return;
    next[index] = {
      ...next[index],
      fillColor: FILLS[fill % FILLS.length],
      fillPattern: PATTERNS[fill % PATTERNS.length],
    };
    fill += 1;
  });
  return next;
}

export function encodingRestyle(encodings: TraceEncoding[]) {
  return {
    "line.dash": encodings.map((encoding) => encoding.dash),
    "line.color": encodings.map((encoding) => encoding.lineColor),
    "marker.symbol": encodings.map((encoding) => encoding.symbol),
    "marker.color": encodings.map((encoding) => encoding.markerColor),
    "marker.pattern.shape": encodings.map((encoding) => encoding.pattern),
    fillcolor: encodings.map((encoding) => encoding.fillColor),
    "fillpattern.shape": encodings.map((encoding) => encoding.fillPattern),
  };
}

type ThemeName = "paper" | "synthwave";

type LayoutMarks = {
  shapes?: Array<{ line?: { color?: unknown } }>;
  annotations?: Array<{ font?: { color?: unknown }; bordercolor?: unknown; bgcolor?: unknown }>;
};

function colorString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Ink annotation rules and labels on paper; the stored colours come back on synthwave. */
export function layoutMarkRelayout(layout: LayoutMarks, theme: ThemeName): Record<string, string> {
  const updates: Record<string, string> = {};
  layout.shapes?.forEach((shape, index) => {
    const color = colorString(shape.line?.color);
    if (!color) return;
    updates[`shapes[${index}].line.color`] = theme === "paper" ? PAPER_INK : color;
  });
  layout.annotations?.forEach((annotation, index) => {
    const font = colorString(annotation.font?.color);
    const border = colorString(annotation.bordercolor);
    const background = colorString(annotation.bgcolor);
    if (font) updates[`annotations[${index}].font.color`] = theme === "paper" ? PAPER_INK : font;
    if (border) updates[`annotations[${index}].bordercolor`] = theme === "paper" ? PAPER_INK : border;
    if (background) updates[`annotations[${index}].bgcolor`] = theme === "paper" ? PAPER_BG : background;
  });
  return updates;
}

function chrome(theme: ThemeName) {
  if (theme === "paper") {
    return {
      paper: PAPER_BG,
      plot: PAPER_BG,
      font: PAPER_INK,
      grid: "rgba(17, 16, 11, 0.15)",
      line: PAPER_INK,
      hover: PAPER_BG,
      slider: "#e7e1d2",
    };
  }
  return {
    paper: "rgba(38, 20, 71, 0.7)",
    plot: "rgba(0, 2, 33, 0.5)",
    font: synthwaveColors.peach,
    grid: "rgba(255, 108, 17, 0.2)",
    line: synthwaveColors.neonCyan,
    hover: "rgba(38, 20, 71, 0.95)",
    slider: "rgba(0, 2, 33, 0.8)",
  };
}

/** Overlay chrome after the user layout merge. Geometry on the axes is left in place. */
export function applyPlotChrome(layout: Partial<Layout>, theme: ThemeName): Partial<Layout> {
  const colours = chrome(theme);
  const xaxis = layout.xaxis;
  const yaxis = layout.yaxis;
  return {
    ...layout,
    paper_bgcolor: colours.paper,
    plot_bgcolor: colours.plot,
    font: { ...layout.font, color: colours.font },
    title:
      layout.title && typeof layout.title === "object"
        ? { ...layout.title, font: { ...layout.title.font, color: colours.font } }
        : layout.title,
    xaxis: {
      ...xaxis,
      gridcolor: colours.grid,
      linecolor: colours.line,
      tickfont: { ...xaxis?.tickfont, color: colours.line },
      rangeslider: xaxis?.rangeslider
        ? { ...xaxis.rangeslider, bgcolor: colours.slider, bordercolor: colours.line }
        : xaxis?.rangeslider,
    },
    yaxis: {
      ...yaxis,
      gridcolor: colours.grid,
      linecolor: colours.line,
      tickfont: { ...yaxis?.tickfont, color: colours.line },
    },
    hoverlabel: {
      ...layout.hoverlabel,
      bgcolor: colours.hover,
      bordercolor: colours.line,
      font: { ...layout.hoverlabel?.font, color: colours.font },
    },
  };
}

export function plotChromeRelayout(theme: ThemeName): Record<string, string> {
  const colours = chrome(theme);
  return {
    paper_bgcolor: colours.paper,
    plot_bgcolor: colours.plot,
    "font.color": colours.font,
    "title.font.color": colours.font,
    "xaxis.gridcolor": colours.grid,
    "xaxis.linecolor": colours.line,
    "xaxis.tickfont.color": colours.line,
    "yaxis.gridcolor": colours.grid,
    "yaxis.linecolor": colours.line,
    "yaxis.tickfont.color": colours.line,
    "hoverlabel.bgcolor": colours.hover,
    "hoverlabel.bordercolor": colours.line,
    "hoverlabel.font.color": colours.font,
    "xaxis.rangeslider.bgcolor": colours.slider,
    "xaxis.rangeslider.bordercolor": colours.line,
  };
}
