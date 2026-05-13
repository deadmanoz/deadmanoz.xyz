import { describe, it, expect } from "vitest";
import markdownToHtml from "./markdownToHtml";

describe("markdownToHtml — inline extensions", () => {
  it("renders ^text^ as superscript", async () => {
    const html = await markdownToHtml("E = mc^2^ in plain prose.");
    expect(html).toContain("E = mc<sup>2</sup> in plain prose.");
  });

  it("renders ~~text~~ as strikethrough", async () => {
    const html = await markdownToHtml("Old name ~~deprecated~~ replaced.");
    expect(html).toContain("Old name <del>deprecated</del> replaced.");
  });

  it("renders {{color:text}} with the mapped colour from the colour map", async () => {
    const html = await markdownToHtml("Highlight {{cyan:value}} here.");
    expect(html).toContain('<span style="color: #00D9FF; font-weight: bold;">value</span>');
  });

  it("leaves {{color:text}} untouched when the colour is unknown", async () => {
    const html = await markdownToHtml("Try {{neonpurple:value}} now.");
    expect(html).toContain("{{neonpurple:value}}");
  });

  it("does not apply ^...^ inside inline math", async () => {
    const html = await markdownToHtml("Inline \\(x^2 + y^2\\) stays raw.");
    expect(html).toContain('<span class="math-inline">\\(x^2 + y^2\\)</span>');
    expect(html).not.toContain("<sup>2 + y</sup>");
  });

  it("does not apply ~~...~~ inside display math", async () => {
    const html = await markdownToHtml("\\[a ~~ b\\]");
    expect(html).toContain('<div class="math-display">\\[a ~~ b\\]</div>');
    expect(html).not.toContain("<del>");
  });
});

describe("markdownToHtml — math delimiters", () => {
  it("preserves inline math \\(...\\) for client-side MathJax", async () => {
    const html = await markdownToHtml("The value \\(x^2 + 1\\) is positive.");
    expect(html).toContain('<span class="math-inline">\\(x^2 + 1\\)</span>');
  });

  it("preserves display math \\[...\\] for client-side MathJax", async () => {
    const html = await markdownToHtml("\\[E = mc^2\\]");
    expect(html).toContain('<div class="math-display">\\[E = mc^2\\]</div>');
  });

  it("decodes hex numeric HTML entities inside math so MathJax sees raw characters", async () => {
    // rehype-stringify emits &#x3C; for `<` and &#x26; for `&` — the decoder
    // must turn these back into literal characters before MathJax renders.
    const html = await markdownToHtml("\\[a < b & c\\]");
    expect(html).toContain('<div class="math-display">\\[a < b & c\\]</div>');
    expect(html).not.toMatch(/&#x[0-9A-Fa-f]+;/);
  });
});

describe("markdownToHtml — figure captions", () => {
  it("renders inline code backticks in image alt text as <code> in the figcaption", async () => {
    const md =
      "![Headers clear `aux_target` and `parent_target` only sometimes.](/foo.png){#fig:codecap}";
    const html = await markdownToHtml(md);
    expect(html).toContain(
      "<figcaption><strong>Figure 1:</strong> Headers clear <code>aux_target</code> and <code>parent_target</code> only sometimes.</figcaption>",
    );
  });

  it("renders markdown links in image alt text as anchors in the figcaption", async () => {
    const md =
      "![See [the paper](https://example.com/paper.pdf) for details.](/foo.png){#fig:linkcap}";
    const html = await markdownToHtml(md);
    expect(html).toContain(
      '<a href="https://example.com/paper.pdf" target="_blank" rel="noopener noreferrer">the paper</a>',
    );
  });

  it("renders bare URLs in image alt text as anchors in the figcaption", async () => {
    const md =
      "![Source: https://example.com/page for context.](/foo.png){#fig:bareurl}";
    const html = await markdownToHtml(md);
    expect(html).toContain(
      '<a href="https://example.com/page" target="_blank" rel="noopener noreferrer">https://example.com/page</a>',
    );
  });

  it("restores a code placeholder when immediately followed by a trailing letter (e.g. plural 's')", async () => {
    // Regression: the restore regex previously anchored with \b on the right
    // side, which fails to match a word→word transition such as IMGALT_CODE_Ns.
    // The markdown source uses `scriptPubKey`s with the s outside the closing
    // backtick to express a plural form.
    const md =
      "![Multiple `OP_RETURN` outputs in the `scriptPubKey`s carrying data.](/p.png){#fig:p}";
    const html = await markdownToHtml(md);
    expect(html).not.toMatch(/IMGALT_CODE_\d+/);
    expect(html).toContain("<code>OP_RETURN</code>");
    expect(html).toContain("<code>scriptPubKey</code>s carrying");
  });

  it("does not bleed earlier code values into later placeholder positions with 10+ spans", async () => {
    // Regression: IMGALT_CODE_1 was matching the prefix of IMGALT_CODE_10/11/12,
    // so span #1's text (`first`) appeared in spans #10+ instead of their own text.
    const md = [
      "![Spans `first` and `second` and `third` and `fourth` and `fifth`.](/a.png){#fig:a}",
      "",
      "![Spans `sixth` and `seventh` and `eighth` and `ninth` and `tenth` and `eleventh` and `twelfth`.](/b.png){#fig:b}",
    ].join("\n");
    const html = await markdownToHtml(md);
    for (const word of [
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
      "sixth",
      "seventh",
      "eighth",
      "ninth",
      "tenth",
      "eleventh",
      "twelfth",
    ]) {
      expect(html).toContain(`<code>${word}</code>`);
    }
  });

  it("renders both markdown links and inline code in the same caption", async () => {
    const md =
      "![Adapted from [Zamyatin 2017](https://example.com/z.pdf). Targets `aux_target` and `parent_target` differ.](/foo.png){#fig:combo}";
    const html = await markdownToHtml(md);
    expect(html).toContain(
      '<a href="https://example.com/z.pdf" target="_blank" rel="noopener noreferrer">Zamyatin 2017</a>',
    );
    expect(html).toContain("<code>aux_target</code>");
    expect(html).toContain("<code>parent_target</code>");
  });

  it("leaves a plain image without {#fig:id} as a normal <img> (no figure wrapper)", async () => {
    const html = await markdownToHtml("![Inline image](/foo.png)");
    expect(html).toContain('<img src="/foo.png" alt="Inline image"');
    expect(html).not.toContain('class="figure-container"');
    expect(html).not.toContain("Figure 1:");
  });

  it("assigns figure numbers in document order across images and :::plot blocks", async () => {
    const md = [
      "![First image](/a.png){#fig:a}",
      "",
      ":::plot{p1}",
      '{"data":[]}',
      ":::",
      "Plot caption {#fig:p1}",
      "",
      "![Second image](/b.png){#fig:b}",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toMatch(/id="fig-a"[\s\S]*?Figure 1:/);
    expect(html).toMatch(/id="fig-p1"[\s\S]*?Figure 2:/);
    expect(html).toMatch(/id="fig-b"[\s\S]*?Figure 3:/);
  });

  it("resolves {@fig:id} cross-references to anchor links with figure numbers", async () => {
    const md = [
      "![Diagram](/d.png){#fig:diagram}",
      "",
      "As shown in {@fig:diagram}, the flow is clear.",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain(
      '<a href="#fig-diagram" class="figure-ref">Figure 1</a>',
    );
  });
});

describe("markdownToHtml — :::plot blocks", () => {
  it("emits an interactive-plot-container div with the inline JSON in data-plot-data", async () => {
    const md = [":::plot{p1}", '{"data":[{"x":[1,2]}]}', ":::"].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('class="interactive-plot-container"');
    expect(html).toContain('data-plot-id="plot-p1"');
    expect(html).toMatch(/data-plot-data="[^"]*&quot;data&quot;/);
  });

  it("encodes a src= attribute on the plot block as a JSON pointer in data-plot-data", async () => {
    const md = [':::plot{p2 src="/data/foo.json"}', ":::"].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('data-plot-id="plot-p2"');
    expect(html).toMatch(/data-plot-data="[^"]*&quot;src&quot;:&quot;\/data\/foo\.json&quot;/);
  });

  it("wraps a plot with a caption + {#fig:id} in a numbered figure container", async () => {
    const md = [
      ":::plot{p3}",
      '{"data":[]}',
      ":::",
      "Caption for the plot {#fig:plot3}",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('id="fig-plot3"');
    expect(html).toContain("<strong>Figure 1:</strong>");
    expect(html).toContain("Caption for the plot");
  });
});

describe("markdownToHtml — tables", () => {
  it("wraps a table with a caption and {#tab:id} in a numbered table-container", async () => {
    const md = [
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "Caption text {#tab:demo}",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('id="tab-demo"');
    expect(html).toContain("<strong>Table 1:</strong>");
    expect(html).toContain("Caption text");
  });

  it("wraps a table with just {#tab:id} (no caption) showing only the table label without a colon", async () => {
    const md = [
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "{#tab:nocap}",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('id="tab-nocap"');
    expect(html).toContain("<strong>Table 1</strong>");
    expect(html).not.toContain("Table 1:");
  });

  it("resolves {@tab:id} cross-references to anchor links with table numbers", async () => {
    const md = [
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "Caption {#tab:t}",
      "",
      "See {@tab:t} for the data.",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('<a href="#tab-t" class="table-ref">Table 1</a>');
  });
});

describe("markdownToHtml — annotations", () => {
  it("renders [[text||tooltip]] as an annotation span with the tooltip in data-tooltip", async () => {
    const md = "Hover [[term||definition of the term]] here.";
    const html = await markdownToHtml(md);
    expect(html).toContain('class="annotation"');
    expect(html).toContain('data-tooltip="definition of the term"');
    expect(html).toContain(">term</span>");
  });

  it("converts inline backticks in annotation display text to <code>", async () => {
    const md = "Use [[`flag`||a CLI flag]] for that.";
    const html = await markdownToHtml(md);
    expect(html).toMatch(/class="annotation"[^>]*>\s*<code>flag<\/code>\s*<\/span>/);
  });

  it("renders *italic* and _italic_ markers in annotation display text", async () => {
    const star = await markdownToHtml("See [[*emphasis*||def]] here.");
    expect(star).toMatch(/class="annotation"[^>]*>\s*<em>emphasis<\/em>\s*<\/span>/);

    const underscore = await markdownToHtml("Note [[4-byte _side mask_||def]] field.");
    expect(underscore).toMatch(
      /class="annotation"[^>]*>\s*4-byte <em>side mask<\/em>\s*<\/span>/,
    );
  });

  it("renders **bold** and __bold__ markers in annotation display text", async () => {
    const star = await markdownToHtml("See [[**strong**||def]] here.");
    expect(star).toMatch(
      /class="annotation"[^>]*>\s*<strong>strong<\/strong>\s*<\/span>/,
    );

    const underscore = await markdownToHtml("See [[__strong__||def]] here.");
    expect(underscore).toMatch(
      /class="annotation"[^>]*>\s*<strong>strong<\/strong>\s*<\/span>/,
    );
  });

  it("does not process italic/bold markers inside an inline-code span in display text", async () => {
    const html = await markdownToHtml("See [[`*literal*`||def]] here.");
    expect(html).toMatch(
      /class="annotation"[^>]*>\s*<code>\*literal\*<\/code>\s*<\/span>/,
    );
    expect(html).not.toContain("<em>literal</em>");
  });

  it("treats **x** as bold rather than two italics in display text", async () => {
    const html = await markdownToHtml("See [[**both**||def]] here.");
    expect(html).toContain("<strong>both</strong>");
    expect(html).not.toContain("<em>");
  });

  it("renders markdown links inside an annotation tooltip", async () => {
    const md = "See [[BIP 22||defined in [BIP 22](https://example.com/bip22)]] for more.";
    const html = await markdownToHtml(md);
    expect(html).toMatch(/data-tooltip="[^"]*<a href=&quot;https:\/\/example\.com\/bip22&quot;/);
  });

  it("preserves math delimiters inside an annotation tooltip", async () => {
    const md = "Difficulty [[D||target = \\(2^{224}/D\\)]] adjusts.";
    const html = await markdownToHtml(md);
    expect(html).toMatch(/data-tooltip="[^"]*<span class=&quot;math-inline&quot;>\\\(2\^\{224\}\/D\\\)<\/span>/);
  });
});

describe("markdownToHtml — :::collapse blocks", () => {
  it("renders :::collapse{Title} ... ::: as a <details> with auto id and the title in <summary>", async () => {
    const md = [
      ":::collapse{Background}",
      "Some hidden context.",
      ":::",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('<details class="collapsible-section" id="collapse-1">');
    expect(html).toContain('<summary class="collapsible-title">Background</summary>');
    expect(html).toContain("Some hidden context.");
  });

  it("uses the {#anchor-id} suffix as the <details> id when supplied", async () => {
    const md = [
      ":::collapse{Background}{#bg-section}",
      "Hidden context.",
      ":::",
    ].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('id="bg-section"');
    expect(html).not.toContain('id="collapse-1"');
  });
});

describe("markdownToHtml — :::alert blocks", () => {
  it.each([
    ["info", "alert-info"],
    ["warning", "alert-warning"],
    ["success", "alert-success"],
    ["danger", "alert-danger"],
  ])("renders :::alert{%s} with the %s CSS class", async (type, expectedClass) => {
    const md = [`:::alert{${type}}`, "Body text.", ":::"].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain(`class="alert-box ${expectedClass}"`);
    expect(html).toContain("Body text.");
  });

  it("falls back to alert-info for an unknown alert type", async () => {
    const md = [":::alert{nonsense}", "Body text.", ":::"].join("\n");
    const html = await markdownToHtml(md);
    expect(html).toContain('class="alert-box alert-info"');
  });
});
