import { describe, it, expect } from "vitest";
import { estimateReadingMinutes, formatReadingTime } from "./reading-time";

describe("estimateReadingMinutes", () => {
  it("returns at least 1 minute for any non-empty content", () => {
    expect(estimateReadingMinutes("Hello world")).toBe(1);
    expect(estimateReadingMinutes("")).toBe(1);
  });

  it("approximates one minute per WPM words of prose", () => {
    const words = Array.from({ length: 440 }, () => "word").join(" ");
    expect(estimateReadingMinutes(words)).toBe(2);
  });

  it("strips fenced code blocks before counting", () => {
    const prose = Array.from({ length: 220 }, () => "word").join(" ");
    const codeBlock =
      "```ts\n" + Array.from({ length: 1000 }, () => "filler").join(" ") + "\n```";
    expect(estimateReadingMinutes(`${prose}\n\n${codeBlock}`)).toBe(1);
  });

  it("strips :::plot{...} JSON blocks before counting", () => {
    const prose = Array.from({ length: 220 }, () => "word").join(" ");
    const plotBlock =
      ":::plot{p1}\n" +
      JSON.stringify({ data: Array.from({ length: 200 }, (_, i) => ({ x: i, y: i })) }) +
      "\n:::";
    expect(estimateReadingMinutes(`${prose}\n\n${plotBlock}`)).toBe(1);
  });

  it("counts captions, math, and inline code as normal prose", () => {
    const md =
      "The value \\(x^2 + 1\\) is interesting. Use the `aux_target` constant. " +
      Array.from({ length: 200 }, () => "more").join(" ");
    // ~211 tokens at 220 WPM → 1 min
    expect(estimateReadingMinutes(md)).toBe(1);
  });

  it("accepts a custom WPM override", () => {
    const words = Array.from({ length: 600 }, () => "word").join(" ");
    expect(estimateReadingMinutes(words, 300)).toBe(2);
    expect(estimateReadingMinutes(words, 200)).toBe(3);
  });
});

describe("formatReadingTime", () => {
  it("formats as 'N min read'", () => {
    expect(formatReadingTime("Hello world")).toBe("1 min read");
  });

  it("uses the rounded minute count", () => {
    const words = Array.from({ length: 1100 }, () => "word").join(" ");
    expect(formatReadingTime(words)).toBe("5 min read");
  });
});
