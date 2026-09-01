import { describe, expect, it } from "vitest";

import {
  prependCoverImageForFeed,
  stripAnnotationsForFeed,
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
