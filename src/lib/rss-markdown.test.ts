import { describe, expect, it } from "vitest";

import {
  markdownToFeedHtml,
  numberFiguresForFeed,
  numberTablesForFeed,
  prependCoverImageForFeed,
  stripAnnotationsForFeed,
  stripColorsForFeed,
} from "./rss-markdown";

describe("stripAnnotationsForFeed", () => {
  it("keeps the visible text from a simple annotation", () => {
    expect(stripAnnotationsForFeed("Use [[this detector||More detail.]] here.")).toBe(
      "Use this detector here.",
    );
  });

  it("removes a tooltip containing a Markdown link", () => {
    const markdown =
      'Over [[the last few years||"Five years is an eternity in AI" - Andrew Ng, [The Batch](https://example.com)]] models improved.';

    expect(stripAnnotationsForFeed(markdown)).toBe(
      "Over the last few years models improved.",
    );
  });

  it("handles multiple annotations without changing surrounding Markdown", () => {
    const markdown =
      "A [[`frontier agent`||Model details.]] can use [[active perception||See [the paper](https://example.com/paper).]].";

    expect(stripAnnotationsForFeed(markdown)).toBe(
      "A `frontier agent` can use active perception.",
    );
  });

  it("leaves malformed annotations untouched", () => {
    const markdown = "An unfinished [[annotation||still has no closing marker.";

    expect(stripAnnotationsForFeed(markdown)).toBe(markdown);
  });
});

describe("prependCoverImageForFeed", () => {
  it("prepends a relative cover as an absolute image URL", () => {
    const html = prependCoverImageForFeed(
      "<h2>Introduction</h2>",
      "/assets/blog/post/cover.png",
      "A post",
      "https://deadmanoz.xyz",
    );

    expect(html).toBe(
      '<p><img src="https://deadmanoz.xyz/assets/blog/post/cover.png" alt="A post cover image"></p>\n<h2>Introduction</h2>',
    );
  });

  it("escapes the generated image attributes", () => {
    const html = prependCoverImageForFeed(
      "<p>Body</p>",
      "/assets/cover.png?size=large&crop=wide",
      'A "quoted" & tested post',
      "https://deadmanoz.xyz",
    );

    expect(html).toContain(
      'src="https://deadmanoz.xyz/assets/cover.png?size=large&amp;crop=wide"',
    );
    expect(html).toContain(
      'alt="A &quot;quoted&quot; &amp; tested post cover image"',
    );
  });

  it("leaves feed HTML unchanged when a post has no cover", () => {
    expect(
      prependCoverImageForFeed(
        "<p>Body</p>",
        undefined,
        "A post",
        "https://deadmanoz.xyz",
      ),
    ).toBe("<p>Body</p>");
  });
});

describe("numberFiguresForFeed", () => {
  it("numbers a plot before an image in document order and resolves references", () => {
    const markdown = [
      "See {@fig:rate} and {@fig:shot}.",
      "",
      ":::plot{rate}",
      "{}",
      ":::",
      "Hash rate over time. {#fig:rate}",
      "",
      "![A screenshot with a [link](https://example.com) in it.](/img/shot.png){#fig:shot}",
    ].join("\n");

    const result = numberFiguresForFeed(markdown);

    expect(result).toContain("See Figure 1 and Figure 2.");
    expect(result).toContain("**Figure 1:** Hash rate over time.");
    expect(result).toContain(
      "![Figure 2: A screenshot with a [link](https://example.com) in it.](/img/shot.png)",
    );
    expect(result).not.toContain("{#fig:");
  });

  it("drops a literal Figure: prefix from a caption and leaves an unknown reference as 'figure'", () => {
    const markdown = "![Figure: Already prefixed.](/img/a.png){#fig:a} See {@fig:missing}.";

    expect(numberFiguresForFeed(markdown)).toBe(
      "![Figure 1: Already prefixed.](/img/a.png) See figure.",
    );
  });
});

describe("stripColorsForFeed", () => {
  it("keeps the text of a known colour and leaves an unknown colour literal, as the site does", () => {
    expect(stripColorsForFeed("{{cyan:bright}} and {{neonpurple:this}}")).toBe(
      "bright and {{neonpurple:this}}",
    );
  });
});

describe("numberTablesForFeed", () => {
  it("labels captions, labels an empty caption without a colon, and resolves references", () => {
    const md =
      "See {@tab:a} and {@tab:b}.\n\n| x |\n|---|\n\nRows by rule. {#tab:a}\n\n| y |\n|---|\n\n{#tab:b}";
    expect(numberTablesForFeed(md)).toBe(
      "See Table 1 and Table 2.\n\n| x |\n|---|\n\n**Table 1:** Rows by rule.\n\n| y |\n|---|\n\n**Table 2**",
    );
  });
});

describe("markdownToFeedHtml", () => {
  it("flattens the custom syntax into reader-safe HTML that carries the site's numbering", async () => {
    const md = [
      "Intro with {{green:colour}}, [[a term||tooltip]], x^2^, ~~gone~~ and \\(x_1\\).",
      "",
      ":::plot{rate}",
      "{}",
      ":::",
      "Rate over time. {#fig:rate}",
      "",
      "![Shot.](/img/shot.png){#fig:shot}",
      "",
      ":::alert{warning}",
      "Careful.",
      ":::",
      "",
      ":::collapse{{@fig:shot}: the shot}{#shot-box}",
      "",
      "Hidden [text](/posts/other).",
      "",
      ":::",
      "",
      "| a |",
      "|---|",
      "",
      "{#tab:only}",
      "",
      "See {@fig:rate}, {@fig:shot} and {@tab:only}.",
    ].join("\n");

    const html = await markdownToFeedHtml(md, "https://example.com/");

    expect(html).toContain(
      'Intro with colour, a term, x<sup>2</sup>, <del>gone</del> and <span class="math-inline">\\(x_1\\)</span>.',
    );
    expect(html).toContain("<strong>[Interactive plot - view on website]</strong>");
    expect(html).toContain("<strong>Figure 1:</strong> Rate over time.");
    expect(html).toContain('<img src="https://example.com/img/shot.png" alt="Figure 2: Shot.">');
    expect(html).toContain("<blockquote>\n<p>Careful.</p>\n</blockquote>");
    expect(html).toContain("<strong>Figure 2: the shot</strong>");
    expect(html).toContain('<a href="https://example.com/posts/other">text</a>');
    expect(html).toContain("<strong>Table 1</strong>");
    expect(html).toContain("See Figure 1, Figure 2 and Table 1.");
    expect(html).not.toContain("shot-box");
    expect(html).not.toMatch(/\{[#@]|:::|\[\[/);
  });
});
