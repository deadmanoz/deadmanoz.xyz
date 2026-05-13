import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  annotationToShape,
  annotationToLabel,
  filterAnnotations,
  filterAnnotationsByDateRange,
  applyAnnotationsToLayout,
  loadAnnotationsFromFile,
  annotationColors,
  type PlotAnnotation,
} from "./annotation-utils";

const ann = (overrides: Partial<PlotAnnotation> = {}): PlotAnnotation => ({
  id: "halving-2024",
  date: "2024-04-20",
  label: "Halving",
  ...overrides,
});

describe("annotationToShape", () => {
  it("produces a dashed vertical line shape pinned to the annotation date", () => {
    const shape = annotationToShape(ann());
    expect(shape.type).toBe("line");
    expect(shape.x0).toBe("2024-04-20");
    expect(shape.x1).toBe("2024-04-20");
    expect(shape.y0).toBe(0);
    expect(shape.y1).toBe(1);
    expect(shape.line?.dash).toBe("dash");
  });

  it("uses the default annotation colour when no colour is supplied", () => {
    const shape = annotationToShape(ann());
    expect(shape.line?.color).toBe(annotationColors.default);
  });

  it("respects an explicit colour on the annotation", () => {
    const shape = annotationToShape(ann({ color: "#FF00FF" }));
    expect(shape.line?.color).toBe("#FF00FF");
  });
});

describe("annotationToLabel", () => {
  it("pins to the top with bottom anchor when position is 'top'", () => {
    const label = annotationToLabel(ann({ position: "top" }), 0);
    expect(label.y).toBe(1);
    expect(label.yanchor).toBe("bottom");
  });

  it("pins to the bottom with top anchor when position is 'bottom'", () => {
    const label = annotationToLabel(ann({ position: "bottom" }), 0);
    expect(label.y).toBe(0);
    expect(label.yanchor).toBe("top");
  });

  it("alternates auto positions by index parity (even=top, odd=slightly offset top)", () => {
    const even = annotationToLabel(ann({ position: "auto" }), 0);
    const odd = annotationToLabel(ann({ position: "auto" }), 1);
    expect(even.y).toBe(1);
    expect(odd.y).toBe(0.95);
    expect(even.yanchor).toBe("bottom");
    expect(odd.yanchor).toBe("bottom");
  });

  it("carries the annotation description through to hovertext", () => {
    const label = annotationToLabel(
      ann({ description: "Block reward halved" }),
      0,
    );
    expect(label.hovertext).toBe("Block reward halved");
  });
});

describe("filterAnnotations", () => {
  const all: PlotAnnotation[] = [
    ann({ id: "a", date: "2020-01-01", label: "A" }),
    ann({ id: "b", date: "2021-01-01", label: "B" }),
    ann({ id: "c", date: "2022-01-01", label: "C" }),
  ];

  it("returns all annotations unchanged when no ids are supplied", () => {
    expect(filterAnnotations(all)).toEqual(all);
  });

  it("filters by an array of ids", () => {
    expect(filterAnnotations(all, ["a", "c"]).map((x) => x.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("filters by a comma-separated string of ids and trims whitespace", () => {
    expect(filterAnnotations(all, " a , c ").map((x) => x.id)).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("filterAnnotationsByDateRange", () => {
  const all: PlotAnnotation[] = [
    ann({ id: "a", date: "2020-01-01" }),
    ann({ id: "b", date: "2021-06-01" }),
    ann({ id: "c", date: "2022-12-31" }),
  ];

  it("returns all annotations unchanged when neither bound is set", () => {
    expect(filterAnnotationsByDateRange(all)).toEqual(all);
  });

  it("filters by start date only (inclusive)", () => {
    expect(
      filterAnnotationsByDateRange(all, "2021-01-01").map((x) => x.id),
    ).toEqual(["b", "c"]);
  });

  it("filters by end date only (inclusive)", () => {
    expect(
      filterAnnotationsByDateRange(all, undefined, "2021-12-31").map(
        (x) => x.id,
      ),
    ).toEqual(["a", "b"]);
  });

  it("filters by both bounds (inclusive on both ends)", () => {
    expect(
      filterAnnotationsByDateRange(all, "2020-06-01", "2022-06-01").map(
        (x) => x.id,
      ),
    ).toEqual(["b"]);
  });

  it("accepts Date objects as well as strings", () => {
    expect(
      filterAnnotationsByDateRange(
        all,
        new Date("2021-01-01"),
        new Date("2021-12-31"),
      ).map((x) => x.id),
    ).toEqual(["b"]);
  });
});

describe("applyAnnotationsToLayout", () => {
  it("appends new shapes and labels onto existing arrays without losing them", () => {
    const existingShapes = [{ type: "rect" as const }];
    const existingAnnotations = [{ text: "existing" }];
    const result = applyAnnotationsToLayout(
      [ann()],
      existingShapes,
      existingAnnotations,
    );
    expect(result.shapes).toHaveLength(2);
    expect(result.shapes[0]).toEqual({ type: "rect" });
    expect(result.annotations).toHaveLength(2);
    expect(result.annotations[0]).toEqual({ text: "existing" });
  });

  it("works when no existing shapes/annotations are supplied", () => {
    const result = applyAnnotationsToLayout([ann(), ann({ id: "b" })]);
    expect(result.shapes).toHaveLength(2);
    expect(result.annotations).toHaveLength(2);
  });
});

describe("loadAnnotationsFromFile", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns the annotations array from a successful fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ annotations: [ann()] }),
    } as unknown as Response);

    const result = await loadAnnotationsFromFile("/foo.json");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("halving-2024");
  });

  it("returns an empty array when the fetch response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    } as unknown as Response);

    const result = await loadAnnotationsFromFile("/missing.json");
    expect(result).toEqual([]);
  });

  it("returns an empty array when the fetch throws", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await loadAnnotationsFromFile("/foo.json");
    expect(result).toEqual([]);
  });

  it("returns an empty array when the payload has no annotations field", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown as Response);

    const result = await loadAnnotationsFromFile("/empty.json");
    expect(result).toEqual([]);
  });
});
