import { afterEach, describe, expect, it, vi } from "vitest";

import { decodePlotAttribute, loadPlot } from "./plot-loader";

const encode = (json: string) =>
  json
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("decodePlotAttribute", () => {
  it("reverses the renderer's attribute escaping", () => {
    const json = '{"data":[{"name":"a<b & \'c\'"}]}';
    expect(decodePlotAttribute(encode(json))).toBe(json);
  });
});

describe("loadPlot", () => {
  it("parses inline data and defaults the layout", async () => {
    const plot = await loadPlot(encode('{"data":[{"x":[1],"y":[2]}]}'), "plot-inline");
    expect(plot).toEqual({ data: [{ x: [1], y: [2] }], layout: {} });
  });

  it("fetches external data named by src and applies the annotations it names", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/plots/a.json") {
        return {
          ok: true,
          json: async () => ({ data: [{ x: [1] }], layout: { title: "A" }, annotationsSrc: "/plots/ann.json" }),
        };
      }
      if (url === "/plots/ann.json") {
        return {
          ok: true,
          json: async () => ({
            annotations: [{ id: "one", date: "2024-01-01", label: "One", type: "milestone" }],
          }),
        };
      }
      return { ok: false, status: 404, statusText: "Not Found" };
    });
    vi.stubGlobal("fetch", fetchMock);

    const plot = await loadPlot(encode('{"src":"/plots/a.json"}'), "plot-external");

    expect(plot?.data).toEqual([{ x: [1] }]);
    expect(plot?.layout.title).toBe("A");
    expect(plot?.layout.shapes).toHaveLength(1);
    expect(plot?.layout.annotations).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/plots/ann.json");
  });

  it("returns null and logs when the external fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, statusText: "Server Error" })));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await loadPlot(encode('{"src":"/plots/missing.json"}'), "plot-missing")).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  it("returns null and logs for malformed inline JSON", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await loadPlot("not json", "plot-bad")).toBeNull();
    expect(error).toHaveBeenCalled();
  });
});
