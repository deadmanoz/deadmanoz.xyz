import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  checkMarkdown,
  formatMarkdown,
  formatProse,
  maskInline,
  splitSentences,
} from "./sentence-per-line";

function walkMarkdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkMarkdown(fullPath);
    }
    return entry.name.endsWith(".md") ? [fullPath] : [];
  });
}

describe("splitSentences", () => {
  it("splits on a period followed by a capital letter", () => {
    expect(splitSentences("One sentence. Two sentence.")).toEqual([
      "One sentence.",
      "Two sentence.",
    ]);
  });

  it("does not split after e.g. or i.e.", () => {
    expect(splitSentences("Run auxiliary-chain software (e.g., a Namecoin node).")).toEqual([
      "Run auxiliary-chain software (e.g., a Namecoin node).",
    ]);
    expect(splitSentences("The target is larger (i.e., easier to satisfy), so blocks arrive faster.")).toEqual([
      "The target is larger (i.e., easier to satisfy), so blocks arrive faster.",
    ]);
  });

  it("does not split decimals or version numbers", () => {
    expect(splitSentences("The stale rate was 0.41% during that window.")).toEqual([
      "The stale rate was 0.41% during that window.",
    ]);
    expect(splitSentences("Bitcoin Core v0.13.0 shipped compact blocks.")).toEqual([
      "Bitcoin Core v0.13.0 shipped compact blocks.",
    ]);
  });

  it("does not treat ellipsis as a boundary", () => {
    expect(
      splitSentences("A place for ideas, data, tools, and more... A collective to share them."),
    ).toEqual([
      "A place for ideas, data, tools, and more... A collective to share them.",
    ]);
  });

  it("splits after closing quotes, parens, and markdown emphasis", () => {
    expect(splitSentences('He said "it works." The next day it shipped.')).toEqual([
      'He said "it works."',
      "The next day it shipped.",
    ]);
    expect(splitSentences("**The value overflow.** A transaction created two outputs.")).toEqual([
      "**The value overflow.**",
      "A transaction created two outputs.",
    ]);
  });

  it("treats an uppercase initial as an abbreviation", () => {
    expect(splitSentences("See J. Smith for the original write-up.")).toEqual([
      "See J. Smith for the original write-up.",
    ]);
  });

  it("splits after a lowercase letter that is not an initial", () => {
    expect(splitSentences("Output `scriptPubKey`s. Bitcoin block 948,433 illustrates this.")).toEqual([
      "Output `scriptPubKey`s.",
      "Bitcoin block 948,433 illustrates this.",
    ]);
  });

  it("does not split J.R. style initials", () => {
    expect(splitSentences("Created by J.R. Willett in 2012.")).toEqual([
      "Created by J.R. Willett in 2012.",
    ]);
  });
});

describe("maskInline", () => {
  it("hides tooltip periods so they cannot split the surrounding sentence", () => {
    const text =
      "A [[stale block||A valid block that lost a race. Historically called an orphan.]] is still valid.";
    const { masked, restore } = maskInline(text);
    expect(splitSentences(masked)).toHaveLength(1);
    expect(restore(masked)).toBe(text);
  });

  it("hides URL and inline-code periods", () => {
    const text = "See [the post](https://example.com/foo.html) and `v0.13.0` today.";
    const { masked } = maskInline(text);
    expect(splitSentences(masked)).toHaveLength(1);
  });
});

describe("formatProse", () => {
  it("joins a wrapped sentence and then emits one line per sentence", () => {
    expect(
      formatProse("These blocks are rare enough that they are investigated.\n[b10c](https://b10c.me/) published two cases."),
    ).toEqual([
      "These blocks are rare enough that they are investigated.",
      "[b10c](https://b10c.me/) published two cases.",
    ]);
  });

  it("splits after an annotation whose display text already ends the sentence", () => {
    expect(
      formatProse(
        "Even looking at these keys, [[not a real pubkey!||The leading `1c` is the giveaway.]] If we decode it we see CNTRPRTY.",
      ),
    ).toEqual([
      "Even looking at these keys, [[not a real pubkey!||The leading `1c` is the giveaway.]]",
      "If we decode it we see CNTRPRTY.",
    ]);
  });

  it("keeps a multiline annotation inside its sentence", () => {
    const input = `including [["the only two publicly
available methods"||Tooltip with two sentences. Second stays inside.]], across 344 series.`;
    expect(formatProse(input)).toEqual([
      'including [["the only two publicly available methods"||Tooltip with two sentences. Second stays inside.]], across 344 series.',
    ]);
  });
});

describe("formatMarkdown", () => {
  it("leaves frontmatter, headings, tables, and fences untouched", () => {
    const source = [
      "---",
      "title: 'Canary'",
      "status: published",
      "---",
      "",
      "## Heading",
      "",
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "```ts",
      "const n = 1.23;",
      "```",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("splits packed prose and list items", () => {
    const source = [
      "Proof-of-work makes a candidate. Consensus makes it eligible.",
      "",
      "- First sentence. Second sentence.",
      "1. Ordered first. Ordered second.",
      "",
    ].join("\n");

    expect(formatMarkdown(source)).toBe(
      [
        "Proof-of-work makes a candidate.",
        "Consensus makes it eligible.",
        "",
        "- First sentence.",
        "  Second sentence.",
        "1. Ordered first.",
        "   Ordered second.",
        "",
      ].join("\n"),
    );
  });

  it("splits blockquote sentences and keeps the quote prefix", () => {
    const source = [
      "> The networks wouldn't need any coordination. Miners would subscribe to both.",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(
      [
        "> The networks wouldn't need any coordination.",
        "> Miners would subscribe to both.",
        "",
      ].join("\n"),
    );
  });

  it("treats 1) markers as list items and does not join them", () => {
    const source = [
      "That is, I initially:",
      "1) Disabled password login",
      "2) Enabled SSH key-only authentication",
      "3) Changed the SSH port",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("does not absorb a flush-left paragraph into the preceding list", () => {
    const source = [
      "- **Side mask**: the four bytes hold this chain's slot index.",
      "The mask is chain-specific: every other chain carries its own branch.",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("does not join a colon lead-in into the following list", () => {
    const source = [
      "A good place to start because:",
      "- It is the legacy script type.",
      "- It is still used for data carriage.",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("keeps a multi-sentence plot caption on one line", () => {
    const source = [
      ":::plot{spendability}",
      ":::",
      "Spendability over time. As of height 918,997. {#fig:spendability}",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("skips :::plot JSON bodies", () => {
    const source = [
      "See the trend below.",
      "",
      ":::plot{hashrate}",
      '{ "title": "Hash rate. Not a sentence split." }',
      ":::",
      "Bitcoin network hash rate over 2023-2025. {#fig:hashrate}",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("preserves colour spans that contain inline code", () => {
    const source = [
      "**{{orange:With `nixos-anywhere`, the target machine has no source configuration}}**",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("does not join a finished sentence onto a following lowercase sentence", () => {
    const source = [
      "I've started contributing to the peer-observer ecosystem.",
      "peer-observer is a set of tooling for monitoring the Bitcoin network.",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });

  it("is idempotent", () => {
    const source = [
      "Merge mining lets another chain reuse Bitcoin's proof-of-work.",
      "It is one-sided: Bitcoin is unchanged.",
      "",
      "[[In practice every Namecoin block||Tooltip one. Tooltip two.]] from that height onwards carries AuxPoW.",
      "",
    ].join("\n");
    const once = formatMarkdown(source);
    expect(formatMarkdown(once)).toBe(once);
  });

  it("preserves display math blocks", () => {
    const source = [
      "A ratio of 1.0 means the pool matches its hashrate.",
      "",
      "\\[",
      "\\text{obs/exp} = 1.0",
      "\\]",
      "",
    ].join("\n");
    expect(formatMarkdown(source)).toBe(source);
  });
});

describe("checkMarkdown", () => {
  it("reports multiple sentences on one line", () => {
    const report = checkMarkdown("One. Two.\n");
    expect(report.changed).toBe(true);
    expect(report.violations.some((item) => item.kind === "multiple-sentences")).toBe(true);
  });

  it("reports a wrapped sentence", () => {
    const report = checkMarkdown("These blocks are rare enough that they are\ninvestigated and reported.\n");
    expect(report.violations.some((item) => item.kind === "wrapped-sentence")).toBe(true);
  });

  it("does not flag frontmatter or numbered list markers", () => {
    const source = [
      "---",
      "title: 'Merge mining and AuxPoW: how it works'",
      "excerpt: 'A walkthrough of the AuxPoW mechanism.'",
      "tags:",
      "  - bitcoin",
      "  - explainer",
      "---",
      "",
      "1. If the hash exceeds the target, discard it.",
      "2. If the hash meets only aux_target, the auxiliary chain accepts it.",
      "",
    ].join("\n");
    const report = checkMarkdown(source);
    expect(report.changed).toBe(false);
    expect(report.violations).toEqual([]);
  });

  it("keeps every _posts markdown file in sentence-per-line form", () => {
    const failures: string[] = [];
    for (const file of walkMarkdown(join(process.cwd(), "_posts"))) {
      const report = checkMarkdown(readFileSync(file, "utf8"), file);
      if (report.changed || report.violations.length > 0) {
        failures.push(
          `${file}: ${
            report.violations.map((item) => `${item.kind}@${item.line}`).join(", ") ||
            "needs format"
          }`,
        );
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("accepts a clean sentence-per-line document", () => {
    const source = [
      "---",
      "title: 'Clean'",
      "---",
      "",
      "One sentence on this line.",
      "Another sentence on the next line.",
      "",
      "A [[term||Definition. Second tooltip sentence.]] stays in its sentence.",
      "",
    ].join("\n");
    const report = checkMarkdown(source);
    expect(report.changed).toBe(false);
    expect(report.violations).toEqual([]);
  });
});
