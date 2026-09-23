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

  it("strips a trailing References section before counting", () => {
    const prose = Array.from({ length: 220 }, () => "word").join(" ");
    const references =
      "## References\n\n" +
      Array.from({ length: 1000 }, () => "citation").join(" ");
    expect(estimateReadingMinutes(`${prose}\n\n${references}`)).toBe(1);
  });

  it("strips Cite this post, Changelog, Resources, and similar headings", () => {
    const prose = Array.from({ length: 220 }, () => "word").join(" ");
    const tail = [
      "## Cite this post",
      "deadmanoz (2026). Example. https://example.com.",
      "## Changelog",
      "- 2026-09-17: Added a note.",
      "## Resources",
      "- [A link](https://example.com)",
    ].join("\n");
    expect(estimateReadingMinutes(`${prose}\n\n${tail}`)).toBe(1);
  });

  it("strips headings that end with 'and further reading'", () => {
    const prose = Array.from({ length: 220 }, () => "word").join(" ");
    const further =
      "### Evidence and further reading\n\n" +
      Array.from({ length: 500 }, () => "source").join(" ");
    expect(estimateReadingMinutes(`${prose}\n\n${further}`)).toBe(1);
  });

  it("keeps later content after a skip section of the same heading level", () => {
    const before = Array.from({ length: 110 }, () => "before").join(" ");
    const references =
      "## References\n\n" +
      Array.from({ length: 1000 }, () => "citation").join(" ");
    const after = Array.from({ length: 110 }, () => "after").join(" ");
    expect(
      estimateReadingMinutes(`${before}\n\n${references}\n\n## Next\n\n${after}`),
    ).toBe(1);
  });

  it("does not strip an inline mention of References", () => {
    const prose =
      "See the References section for links. " +
      Array.from({ length: 219 }, () => "word").join(" ");
    expect(estimateReadingMinutes(prose)).toBe(1);
  });

  it("does not treat a content heading that merely contains 'sources' as skippable", () => {
    const heading = "## Summary tables and sources";
    const body = Array.from({ length: 220 }, () => "word").join(" ");
    expect(estimateReadingMinutes(`${heading}\n\n${body}`)).toBe(1);
  });

  it("counts table cell text without pipes, alignment markers or empty cells", () => {
    const table = [
      "| Rule | Block count |",
      "| :--- | ---: |",
      "| Invalid signature | 26 |",
      "| Missing witness | |",
    ].join("\n");
    expect(estimateReadingMinutes(table, 1)).toBe(8);
  });

  it("counts link labels and inline code without splitting formatted words", () => {
    const markdown = [
      "A pre**fix** and [linked label](https://example.com \"Hidden title words\").",
      "Use `aux_target` with [this reference][ref].",
      "",
      "[ref]: https://example.com \"Another hidden title\"",
    ].join("\n");
    expect(estimateReadingMinutes(markdown, 1)).toBe(10);
  });

  it("counts annotation labels but excludes tooltip prose and links", () => {
    const markdown = "Check [[**BIP 22**||See the [full specification](https://example.com) for details.]] first.";
    expect(estimateReadingMinutes(markdown, 1)).toBe(4);
  });

  it("includes collapsed prose, table cells and figure captions", () => {
    const markdown = [
      ":::collapse{Full catalogue}{#catalogue}",
      "",
      "Additional context.",
      "",
      "| Rule | Count |",
      "| --- | --- |",
      "| Overflow | 1 |",
      "",
      "![A [linked caption](https://example.com).](/figure.png){#fig:diagram}",
      "",
      ":::",
    ].join("\n");
    expect(estimateReadingMinutes(markdown, 1)).toBe(11);
  });

  it("retains plot captions and alert content without directive metadata", () => {
    const markdown = [
      ':::plot{sample title="Hidden plot title"}',
      '{"data": [{"x": [1, 2, 3], "y": [4, 5, 6]}]}',
      ":::",
      "A visible caption. {#fig:sample}",
      "",
      ":::alert{warning}",
      "{{cyan:Read this}} carefully.",
      ":::",
    ].join("\n");
    expect(estimateReadingMinutes(markdown, 1)).toBe(6);
  });

  it("excludes image alt text, HTML comments and footnotes", () => {
    const markdown = [
      "Visible prose.[^note]",
      "",
      "![An image description](/image.png)",
      "",
      "<!-- Hidden editorial comment -->",
      "",
      "[^note]: Supplemental footnote text.",
    ].join("\n");
    expect(estimateReadingMinutes(markdown, 1)).toBe(2);
  });

  it("ignores punctuation-only tokens and keeps hard line breaks between words", () => {
    expect(estimateReadingMinutes("One * two + three  \nfour", 1)).toBe(4);
  });

  it("excludes all Markdown code blocks before processing custom syntax", () => {
    const markdown = [
      "Before.",
      "",
      "~~~~markdown",
      ":::plot{example}",
      "````",
      "## References",
      "~~~~",
      "",
      "    indented code example",
      "",
      "After.",
      "",
      ":::",
    ].join("\n");
    expect(estimateReadingMinutes(markdown, 1)).toBe(2);
  });

  it("recognises formatted and setext bibliography headings", () => {
    const markdown = "Before.\n\n**References**\n---\n\nCitation text.\n\n## After\n\nMore prose.";
    expect(estimateReadingMinutes(markdown, 1)).toBe(4);
  });

  it("does not resume inside a skipped section after a nested bibliography heading", () => {
    const markdown = [
      "Before.",
      "## References",
      "### Further reading",
      "Source text.",
      "### Papers",
      "More source text.",
      "## Conclusion",
      "After.",
    ].join("\n\n");
    expect(estimateReadingMinutes(markdown, 1)).toBe(3);
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
