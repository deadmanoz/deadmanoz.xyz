import type { Layout } from "plotly.js-basic-dist";

import { synthwaveColors } from "./colors";

export const PAPER_BG = "#f3efe4";
export const PAPER_INK = "#11100b";

const DASHES = ["solid", "dash", "dot", "dashdot", "longdash", "longdashdot"];
const SYMBOLS = ["circle", "square", "triangle-up", "cross", "x", "hexagon", "pentagon", "star", "triangle-down"];
const PATTERNS = ["/", "\\", "x", "-", "|", "+", "."];
const FILLS = ["rgba(17, 16, 11, 0.18)", "rgba(17, 16, 11, 0.55)"];

export type PlotTrace = {
  type?: string;
  mode?: string;
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
  symbol: string | string[] | null;
  pattern: string | null;
  patternSize: number | null;
  lineColor: string | null;
  markerColor: string | string[] | null;
  fillColor: string | null;
  fillPattern: string | null;
};

function stringValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function symbolValue(value: string | string[] | undefined): string | string[] | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return [...value];
  return null;
}

function majoritySymbol(symbols: string[]): string {
  const counts = new Map<string, number>();
  for (const symbol of symbols) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
  let best = symbols[0];
  let count = 0;
  for (const [symbol, seen] of counts) {
    if (seen > count) {
      best = symbol;
      count = seen;
    }
  }
  return best;
}

export function snapshotEncodings(data: PlotTrace[]): TraceEncoding[] {
  return data.map((trace) => ({
    dash: stringValue(trace.line?.dash),
    symbol: symbolValue(trace.marker?.symbol),
    pattern: stringValue(trace.marker?.pattern?.shape),
    patternSize: null,
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

function isMarkerOnly(trace: PlotTrace) {
  const mode = trace.mode ?? "";
  return isScatter(trace) && mode.includes("markers") && !mode.includes("lines");
}

export function paperEncodings(data: PlotTrace[]): TraceEncoding[] {
  const next = snapshotEncodings(data);
  const scatter = data.flatMap((trace, index) => (isScatter(trace) ? [index] : []));
  if (scatter.length > 1) {
    let dash = 0;
    for (const index of scatter) {
      if (isMarkerOnly(data[index])) continue;
      if (next[index].dash == null && next[index].symbol == null) {
        next[index] = { ...next[index], dash: DASHES[dash % DASHES.length] };
        dash += 1;
      }
    }
  }
  const markers = data.flatMap((trace, index) => (isMarkerOnly(trace) ? [index] : []));
  if (markers.length > 1) {
    const reserved = new Set<string>();
    const groups = new Map<string, number[]>();
    for (const index of markers) {
      const symbols = next[index].symbol;
      const list = Array.isArray(symbols) ? symbols : null;
      const main = list?.length ? majoritySymbol(list) : typeof symbols === "string" ? symbols : "circle";
      if (list) {
        for (const symbol of list) {
          if (symbol !== main) reserved.add(symbol);
        }
      }
      const group = groups.get(main) ?? [];
      group.push(index);
      groups.set(main, group);
    }
    const palette = SYMBOLS.filter((symbol) => !reserved.has(symbol));
    for (const indices of groups.values()) {
      if (indices.length < 2) continue;
      indices.forEach((index, nth) => {
        const symbol = palette[nth % palette.length];
        const current = next[index].symbol;
        if (!Array.isArray(current)) {
          next[index] = { ...next[index], symbol };
          return;
        }
        const main = majoritySymbol(current);
        const mapped = current.map((item) => (item === main ? symbol : item));
        next[index] = {
          ...next[index],
          symbol: new Set(mapped).size === 1 ? symbol : mapped,
        };
      });
    }
  }
  const bars = data.flatMap((trace, index) => (isBar(trace) ? [index] : []));
  const colours = new Set(bars.map((index) => JSON.stringify(data[index].marker?.color ?? null)));
  if (bars.length > 1 && colours.size > 1 && bars.every((index) => next[index].pattern == null)) {
    bars.forEach((index, nth) => {
      const cycle = Math.floor(nth / PATTERNS.length);
      next[index] = {
        ...next[index],
        pattern: PATTERNS[nth % PATTERNS.length],
        patternSize: cycle === 0 ? 8 : 16,
      };
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
    "marker.pattern.size": encodings.map((encoding) => encoding.patternSize),
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
