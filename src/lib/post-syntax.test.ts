import { describe, expect, it } from "vitest";

import {
  ANNOTATION_PATTERN,
  COLOR_PATTERN,
  applyEdits,
  collectFigureNumbers,
  collectTableNumbers,
  colorFor,
  findImageFigures,
  findPlotBlocks,
  findPlotFigures,
  preserveMathDelimiters,
  renderStrikethrough,
  renderSuperscript,
  replacePlotBlocks,
  restoreMathDelimiters,
} from "./post-syntax";

const plot = (id: string) =>
  [`:::plot{${id}}`, "{}", ":::", `Caption for ${id}. {#fig:${id}}`].join("\n");

describe("applyEdits", () => {
  it("applies edits by offset regardless of the order given", () => {
    expect(
      applyEdits("abcdef", [
        { start: 0, end: 1, text: "A" },
        { start: 4, end: 6, text: "EF" },
        { start: 2, end: 3, text: "C" },
      ]),
    ).toBe("AbCdEF");
  });
});

describe("ANNOTATION_PATTERN", () => {
  it("captures the display text and a tooltip that contains a Markdown link", () => {
    const md = "See [[this||A [link](https://example.com) inside.]] here.";
    expect(md.replace(ANNOTATION_PATTERN, "<$1|$2>")).toBe(
      "See <this|A [link](https://example.com) inside.> here.",
    );
  });
});

describe("COLOR_PATTERN and colorFor", () => {
  it("captures the colour name and the text", () => {
    expect("a {{cyan:bright}} b".replace(COLOR_PATTERN, "[$1/$2]")).toBe("a [cyan/bright] b");
  });

  it("resolves known names case-insensitively and rejects unknown ones", () => {
    expect(colorFor("Cyan")).toBe("#00A0D0");
    expect(colorFor("neonpurple")).toBeUndefined();
  });
});

describe("findPlotBlocks and replacePlotBlocks", () => {
  it("captures the id, the body and a {#fig:id} caption line", () => {
    const md = `Text.\n\n${plot("rate")}\n\nMore.`;
    const [block] = findPlotBlocks(md);
    expect(block.idAndAttrs).toBe("rate");
    expect(block.body).toBe("{}\n");
    expect(md.slice(block.start, block.end)).toBe(":::plot{rate}\n{}\n:::");
    expect(block.caption).toMatchObject({ text: "Caption for rate.", figId: "rate" });
    expect(md.slice(block.caption!.start, block.caption!.end)).toBe(
      "Caption for rate. {#fig:rate}",
    );
  });

  it("treats the following line as a caption only when it carries {#fig:id}", () => {
    const [block] = findPlotBlocks(":::plot{bare}\n{}\n:::\n\n# Heading after plot\n");
    expect(block.caption).toBeUndefined();
  });

  it("replaces only the block, or the block and its caption, leaving later text intact", () => {
    const md = `:::plot{bare}\n{}\n:::\n\n# Heading\n\n${plot("cap")}\n\nAfter.`;
    const replacer = (b: { idAndAttrs: string }) => `[${b.idAndAttrs}]`;
    expect(replacePlotBlocks(md, replacer)).toBe(
      "[bare]\n\n# Heading\n\n[cap]\nCaption for cap. {#fig:cap}\n\nAfter.",
    );
    expect(replacePlotBlocks(md, replacer, { includeCaption: true })).toBe(
      "[bare]\n\n# Heading\n\n[cap]\n\nAfter.",
    );
  });
});

describe("findImageFigures", () => {
  it("captures alt, src and id, allowing a Markdown link inside the alt text", () => {
    const md =
      "Intro.\n\n![A caption with a [link](https://example.com/a) inside.](/img/a.png){#fig:a}\n";
    const [fig] = findImageFigures(md);
    expect(fig.alt).toBe("A caption with a [link](https://example.com/a) inside.");
    expect(fig.src).toBe("/img/a.png");
    expect(fig.id).toBe("a");
    expect(md.slice(fig.start, fig.end)).toBe(
      "![A caption with a [link](https://example.com/a) inside.](/img/a.png){#fig:a}",
    );
  });

  it("ignores images without a {#fig:id} suffix", () => {
    const md = "![plain](/img/p.png)\n\n![tagged](/img/t.png){#fig:t}";
    expect(findImageFigures(md).map((f) => f.id)).toEqual(["t"]);
  });
});

describe("findPlotFigures", () => {
  it("captures the caption line that follows the closing :::", () => {
    const md = `Text.\n\n${plot("rate")}\n\nMore.`;
    const [fig] = findPlotFigures(md);
    expect(fig.id).toBe("rate");
    expect(fig.caption).toBe("Caption for rate.");
    expect(md.slice(fig.captionStart, fig.captionEnd)).toBe("Caption for rate. {#fig:rate}");
  });

  it("does not let a caption-less plot swallow a later figure caption", () => {
    const md = [
      ":::plot{bare}",
      "{}",
      ":::",
      "",
      ":::collapse{Box}",
      "",
      "![Inner.](/i.png){#fig:inner}",
      "",
      ":::",
      "",
      plot("later"),
    ].join("\n");
    expect(findPlotFigures(md).map((f) => f.id)).toEqual(["later"]);
  });
});

describe("collectFigureNumbers", () => {
  it("numbers image and plot figures together in document order", () => {
    const md = [plot("first-plot"), "", "![Image.](/a.png){#fig:image}", "", plot("second-plot")].join("\n");
    expect([...collectFigureNumbers(md)]).toEqual([
      ["first-plot", 1],
      ["image", 2],
      ["second-plot", 3],
    ]);
  });

  it("keeps the first number for a repeated id", () => {
    const md = "![A.](/a.png){#fig:dup}\n\n![B.](/b.png){#fig:dup}\n\n![C.](/c.png){#fig:c}";
    expect([...collectFigureNumbers(md)]).toEqual([
      ["dup", 1],
      ["c", 2],
    ]);
  });
});

describe("collectTableNumbers", () => {
  it("numbers tables in source order and keeps the first number for a repeated id", () => {
    const md =
      "| a |\n|---|\n\nFirst. {#tab:one}\n\n| b |\n|---|\n\n{#tab:two}\n\nAgain {#tab:one}.";
    expect([...collectTableNumbers(md)]).toEqual([
      ["one", 1],
      ["two", 2],
    ]);
  });
});

describe("math delimiters", () => {
  it("shields math from remark and restores it as MathJax containers with entities decoded", () => {
    const preserved = preserveMathDelimiters("Inline \\(a<b\\) and display \\[x\\]");
    expect(preserved).toBe(
      "Inline MATH_INLINE_STARTa<bMATH_INLINE_END and display MATH_DISPLAY_STARTxMATH_DISPLAY_END",
    );
    expect(restoreMathDelimiters(preserved.replace("<", "&#x3C;"))).toBe(
      'Inline <span class="math-inline">\\(a<b\\)</span> and display <div class="math-display">\\[x\\]</div>',
    );
  });
});

describe("renderSuperscript and renderStrikethrough", () => {
  it("convert outside math and leave MathJax containers alone", () => {
    const html = '<p>x^2^ and ~~old~~ <span class="math-inline">\\(a^b^ ~~c~~\\)</span></p>';
    expect(renderStrikethrough(renderSuperscript(html))).toBe(
      '<p>x<sup>2</sup> and <del>old</del> <span class="math-inline">\\(a^b^ ~~c~~\\)</span></p>',
    );
  });
});
