import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createTimeSeriesPlot,
  createMultiSeriesPlot,
  createBarChart,
  createScatterPlot,
  parsePlotData,
} from "./plot-utils";
import { synthwaveColors, colorSchemes } from "./colors";

describe("createTimeSeriesPlot", () => {
  it("produces a single scatter+lines trace with the supplied x/y data", () => {
    const { data } = createTimeSeriesPlot(
      ["2024-01-01", "2024-02-01"],
      [10, 20],
    );
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      type: "scatter",
      mode: "lines",
      x: ["2024-01-01", "2024-02-01"],
      y: [10, 20],
    });
  });

  it("defaults the name to 'Data' and the line colour to neon cyan", () => {
    const { data } = createTimeSeriesPlot([], []);
    const trace = data[0] as { name: string; line: { color: string } };
    expect(trace.name).toBe("Data");
    expect(trace.line.color).toBe(synthwaveColors.neonCyan);
  });

  it("enables the rangeslider by default and disables it when requested", () => {
    const enabled = createTimeSeriesPlot([], []);
    const disabled = createTimeSeriesPlot([], [], { showRangeSlider: false });
    expect(
      (enabled.layout.xaxis as { rangeslider: { visible: boolean } }).rangeslider
        .visible,
    ).toBe(true);
    expect(
      (disabled.layout.xaxis as { rangeslider: { visible: boolean } })
        .rangeslider.visible,
    ).toBe(false);
  });

  it("threads annotations through to layout shapes and annotations", () => {
    const { layout } = createTimeSeriesPlot(["2024-01-01"], [1], {
      annotations: [
        { id: "a", date: "2024-01-01", label: "A" },
      ],
    });
    expect(layout.shapes).toHaveLength(1);
    expect(layout.annotations).toHaveLength(1);
  });
});

describe("createMultiSeriesPlot", () => {
  it("emits one trace per series in the supplied order", () => {
    const { data } = createMultiSeriesPlot(
      ["2024-01-01"],
      [
        { name: "A", values: [1] },
        { name: "B", values: [2] },
        { name: "C", values: [3] },
      ],
    );
    expect(data.map((t) => (t as { name: string }).name)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("assigns colours from the chosen colour scheme, cycling when series outnumber colours", () => {
    const neon = colorSchemes.neon;
    const series = Array.from({ length: neon.length + 2 }, (_, i) => ({
      name: `S${i}`,
      values: [i],
    }));
    const { data } = createMultiSeriesPlot(["2024-01-01"], series);
    const colors = data.map(
      (t) => (t as { line: { color: string } }).line.color,
    );
    expect(colors[0]).toBe(neon[0]);
    expect(colors[neon.length]).toBe(neon[0]);
    expect(colors[neon.length + 1]).toBe(neon[1]);
  });

  it("uses an explicit series colour when provided, overriding the scheme", () => {
    const { data } = createMultiSeriesPlot(
      ["2024-01-01"],
      [{ name: "A", values: [1], color: "#FF00FF" }],
    );
    expect((data[0] as { line: { color: string } }).line.color).toBe(
      "#FF00FF",
    );
  });
});

describe("createBarChart", () => {
  it("maps labels to x and values to y in vertical orientation (default)", () => {
    const { data } = createBarChart(["a", "b"], [1, 2]);
    expect(data[0]).toMatchObject({
      type: "bar",
      orientation: "v",
      x: ["a", "b"],
      y: [1, 2],
    });
  });

  it("swaps labels and values for horizontal orientation", () => {
    const { data } = createBarChart(["a", "b"], [1, 2], {
      orientation: "h",
    });
    expect(data[0]).toMatchObject({
      orientation: "h",
      x: [1, 2],
      y: ["a", "b"],
    });
  });
});

describe("createScatterPlot", () => {
  it("produces a single markers trace by default with no trendline", () => {
    const { data } = createScatterPlot([1, 2, 3], [2, 4, 6]);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ mode: "markers" });
  });

  it("adds a linear-fit trendline trace when showTrendline is true", () => {
    const { data, layout } = createScatterPlot([1, 2, 3], [2, 4, 6], {
      showTrendline: true,
    });
    expect(data).toHaveLength(2);
    const trend = data[1] as {
      mode: string;
      x: number[];
      y: number[];
      name: string;
    };
    expect(trend.mode).toBe("lines");
    expect(trend.name).toBe("Trend");
    expect(trend.x).toEqual([1, 3]);
    expect(trend.y[0]).toBeCloseTo(2);
    expect(trend.y[1]).toBeCloseTo(6);
    expect(layout.showlegend).toBe(true);
  });

  it("skips the trendline when only one point is supplied", () => {
    const { data } = createScatterPlot([1], [2], { showTrendline: true });
    expect(data).toHaveLength(1);
  });
});

describe("parsePlotData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed data + layout for valid JSON containing a data array", () => {
    const result = parsePlotData(
      '{"data":[{"x":[1]}],"layout":{"title":{"text":"T"}}}',
    );
    expect(result).not.toBeNull();
    expect(result?.data).toEqual([{ x: [1] }]);
    expect(result?.layout).toEqual({ title: { text: "T" } });
  });

  it("defaults layout to an empty object when not present in the JSON", () => {
    const result = parsePlotData('{"data":[]}');
    expect(result?.layout).toEqual({});
  });

  it("returns null and logs an error when the data field is missing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parsePlotData("{}")).toBeNull();
  });

  it("returns null and logs an error when the data field is not an array", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parsePlotData('{"data":"oops"}')).toBeNull();
  });

  it("returns null and logs an error when the input is not valid JSON", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parsePlotData("not json")).toBeNull();
  });
});
