import type { Data, Layout } from "plotly.js-basic-dist";
import type { PlotAnnotation } from "./annotation-utils";
import { applyAnnotationsToLayout } from "./annotation-utils";
import { synthwaveColors, colorSchemes } from "./colors";

// Re-export for backwards compatibility
export { synthwaveColors, colorSchemes };

/**
 * Create a time-series scatter plot
 */
export function createTimeSeriesPlot(
  timestamps: (string | Date)[],
  values: number[],
  options: {
    name?: string;
    color?: string;
    showRangeSlider?: boolean;
    yAxisTitle?: string;
    xAxisTitle?: string;
    annotations?: PlotAnnotation[];
  } = {}
): { data: Data[]; layout: Partial<Layout> } {
  const {
    name = "Data",
    color = synthwaveColors.neonCyan,
    showRangeSlider = true,
    yAxisTitle = "",
    xAxisTitle = "Time",
    annotations = [],
  } = options;

  const data: Data[] = [
    {
      x: timestamps,
      y: values,
      type: "scatter",
      mode: "lines",
      name,
      line: {
        color,
        width: 2,
      },
      hovertemplate: "%{x}<br>%{y:.2f}<extra></extra>",
    },
  ];

  const layout: Partial<Layout> = {
    xaxis: {
      title: { text: xAxisTitle },
      rangeslider: {
        visible: showRangeSlider,
      },
    },
    yaxis: {
      title: { text: yAxisTitle },
    },
  };

  // Apply annotations if provided
  if (annotations.length > 0) {
    const { shapes, annotations: layoutAnnotations } = applyAnnotationsToLayout(
      annotations,
      layout.shapes as Partial<import("plotly.js-basic-dist").Shape>[] | undefined,
      layout.annotations as Partial<import("plotly.js-basic-dist").Annotations>[] | undefined
    );
    layout.shapes = shapes as Layout["shapes"];
    layout.annotations = layoutAnnotations as Layout["annotations"];
  }

  return { data, layout };
}

/**
 * Create a multi-series time-series plot
 */
export function createMultiSeriesPlot(
  timestamps: (string | Date)[],
  series: Array<{
    name: string;
    values: number[];
    color?: string;
  }>,
  options: {
    showRangeSlider?: boolean;
    yAxisTitle?: string;
    xAxisTitle?: string;
    colorScheme?: keyof typeof colorSchemes;
    annotations?: PlotAnnotation[];
  } = {}
): { data: Data[]; layout: Partial<Layout> } {
  const {
    showRangeSlider = true,
    yAxisTitle = "",
    xAxisTitle = "Time",
    colorScheme = "neon",
    annotations = [],
  } = options;

  const colors = colorSchemes[colorScheme];

  const data: Data[] = series.map((s, index) => ({
    x: timestamps,
    y: s.values,
    type: "scatter",
    mode: "lines",
    name: s.name,
    line: {
      color: s.color || colors[index % colors.length],
      width: 2,
    },
    hovertemplate: `${s.name}<br>%{x}<br>%{y:.2f}<extra></extra>`,
  }));

  const layout: Partial<Layout> = {
    xaxis: {
      title: { text: xAxisTitle },
      rangeslider: {
        visible: showRangeSlider,
      },
    },
    yaxis: {
      title: { text: yAxisTitle },
    },
    showlegend: true,
    legend: {
      x: 0,
      y: 1,
      bgcolor: "rgba(38, 20, 71, 0.8)",
      bordercolor: synthwaveColors.neonCyan,
      borderwidth: 1,
    },
  };

  // Apply annotations if provided
  if (annotations.length > 0) {
    const { shapes, annotations: layoutAnnotations } = applyAnnotationsToLayout(
      annotations,
      layout.shapes as Partial<import("plotly.js-basic-dist").Shape>[] | undefined,
      layout.annotations as Partial<import("plotly.js-basic-dist").Annotations>[] | undefined
    );
    layout.shapes = shapes as Layout["shapes"];
    layout.annotations = layoutAnnotations as Layout["annotations"];
  }

  return { data, layout };
}

/**
 * Create a bar chart
 */
export function createBarChart(
  labels: string[],
  values: number[],
  options: {
    name?: string;
    color?: string;
    orientation?: "v" | "h";
    yAxisTitle?: string;
    xAxisTitle?: string;
  } = {}
): { data: Data[]; layout: Partial<Layout> } {
  const {
    name = "Data",
    color = synthwaveColors.neonOrange,
    orientation = "v",
    yAxisTitle = "",
    xAxisTitle = "",
  } = options;

  const data: Data[] = [
    {
      x: orientation === "v" ? labels : values,
      y: orientation === "v" ? values : labels,
      type: "bar",
      name,
      orientation,
      marker: {
        color,
        line: {
          color: synthwaveColors.neonCyan,
          width: 1,
        },
      },
      hovertemplate: orientation === "v"
        ? "%{x}<br>%{y:.2f}<extra></extra>"
        : "%{y}<br>%{x:.2f}<extra></extra>",
    },
  ];

  const layout: Partial<Layout> = {
    xaxis: {
      title: { text: xAxisTitle },
    },
    yaxis: {
      title: { text: yAxisTitle },
    },
  };

  return { data, layout };
}

/**
 * Create a scatter plot with optional trend line
 */
export function createScatterPlot(
  xValues: number[],
  yValues: number[],
  options: {
    name?: string;
    color?: string;
    size?: number;
    showTrendline?: boolean;
    xAxisTitle?: string;
    yAxisTitle?: string;
  } = {}
): { data: Data[]; layout: Partial<Layout> } {
  const {
    name = "Data",
    color = synthwaveColors.neonCyan,
    size = 8,
    showTrendline = false,
    xAxisTitle = "",
    yAxisTitle = "",
  } = options;

  const data: Data[] = [
    {
      x: xValues,
      y: yValues,
      type: "scatter",
      mode: "markers",
      name,
      marker: {
        color,
        size,
        line: {
          color: synthwaveColors.neonOrange,
          width: 1,
        },
      },
      hovertemplate: "(%{x:.2f}, %{y:.2f})<extra></extra>",
    },
  ];

  // Add simple linear trendline if requested
  if (showTrendline && xValues.length > 1) {
    const { slope, intercept } = linearRegression(xValues, yValues);
    const trendX = [Math.min(...xValues), Math.max(...xValues)];
    const trendY = trendX.map(x => slope * x + intercept);

    data.push({
      x: trendX,
      y: trendY,
      type: "scatter",
      mode: "lines",
      name: "Trend",
      line: {
        color: synthwaveColors.neonGreen,
        width: 2,
        dash: "dash",
      },
      hoverinfo: "skip",
    });
  }

  const layout: Partial<Layout> = {
    xaxis: {
      title: { text: xAxisTitle },
    },
    yaxis: {
      title: { text: yAxisTitle },
    },
    showlegend: showTrendline,
  };

  return { data, layout };
}

/**
 * Simple linear regression helper
 */
function linearRegression(xValues: number[], yValues: number[]): { slope: number; intercept: number } {
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Parse plot data from JSON string with error handling
 */
export function parsePlotData(jsonString: string): {
  data: Data[];
  layout?: Partial<Layout>;
} | null {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.data || !Array.isArray(parsed.data)) {
      console.error("Plot data must include a 'data' array");
      return null;
    }

    return {
      data: parsed.data,
      layout: parsed.layout || {},
    };
  } catch (error) {
    console.error("Failed to parse plot data:", error);
    return null;
  }
}
