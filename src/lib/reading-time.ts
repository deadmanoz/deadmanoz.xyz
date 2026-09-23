import type { Nodes, RootContent } from "mdast";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import {
  ALERT_OPENER_SOURCE,
  ANNOTATION_PATTERN,
  COLLAPSE_OPENER_SOURCE,
  COLOR_PATTERN,
  applyEdits,
  colorFor,
  findImageFigures,
  replacePlotBlocks,
  type TextEdit,
} from "./post-syntax";

const DEFAULT_WPM = 220;
const parser = remark().use(remarkGfm);

/**
 * Trailing / skippable headings. Matched after lowercasing and stripping
 * Markdown formatting and `{#id}` suffixes. A heading also matches when
 * it ends with " and <title>" (e.g. "Evidence and further reading").
 */
const NON_READING_HEADINGS = new Set([
  "acknowledgements",
  "acknowledgments",
  "bibliography",
  "changelog",
  "cite this",
  "cite this post",
  "footnotes",
  "further reading",
  "reference",
  "references",
  "resources",
  "see also",
  "works cited",
]);

function normalizeHeading(raw: string): string {
  return raw
    .replace(/\s*\{#[^}]+\}\s*$/, "")
    .trim()
    .toLowerCase();
}

function isNonReadingHeading(title: string): boolean {
  if (NON_READING_HEADINGS.has(title)) {
    return true;
  }
  for (const skip of NON_READING_HEADINGS) {
    if (title.endsWith(` and ${skip}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Drop bibliography-style sections. A matching heading removes itself and
 * following content until the next heading of the same or higher level.
 */
function stripNonReadingSections(nodes: RootContent[]): RootContent[] {
  let skipDepth = 0;
  return nodes.filter((node) => {
    if (node.type === "heading") {
      if (node.depth <= skipDepth) skipDepth = 0;
      if (!skipDepth && isNonReadingHeading(normalizeHeading(readingText(node)))) {
        skipDepth = node.depth;
      }
    }
    return !skipDepth;
  });
}

function readingText(node: Nodes): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "footnoteDefinition") return "";
  if (node.type === "break") return "\n";
  if ("children" in node) {
    // Inline formatting can split a word across nodes; blocks need a separator.
    const separator = ["root", "blockquote", "list", "listItem", "table", "tableRow"].includes(node.type)
      ? "\n"
      : "";
    return node.children.map(readingText).join(separator);
  }
  return "";
}

function prepareReadingText(markdown: string): string {
  // Remove code by source position before custom syntax can reinterpret it.
  const edits: TextEdit[] = [];
  function collectCode(node: Nodes) {
    if (node.type === "code") {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) edits.push({ start, end, text: "\n\n" });
    } else if ("children" in node) {
      node.children.forEach(collectCode);
    }
  }
  collectCode(parser.parse(markdown));
  let text = replacePlotBlocks(applyEdits(markdown, edits), () => "\n\n");
  text = text.replace(ANNOTATION_PATTERN, "$1");
  text = applyEdits(text, findImageFigures(text).map((figure) => ({
    start: figure.start,
    end: figure.end,
    text: figure.alt,
  })));

  return text
    .replace(new RegExp(COLLAPSE_OPENER_SOURCE, "g"), "\n\n$1\n\n")
    .replace(new RegExp(ALERT_OPENER_SOURCE, "g"), "\n\n")
    .replace(/^:::[ \t]*$/gm, "\n\n")
    .replace(COLOR_PATTERN, (match, name: string, label: string) => colorFor(name) ? label : match)
    .replace(/\{#(?:fig|tab):[^}]+\}/g, "")
    .replace(/\{@(fig|tab):[^}]+\}/g, (_match, kind: string) => kind === "fig" ? "Figure" : "Table");
}

/** Count readable text, including collapsed detail, at 220 WPM by default.
 * Code, plot data, hover tooltips and bibliography sections are excluded.
 */
export function estimateReadingMinutes(
  markdown: string,
  wpm: number = DEFAULT_WPM,
): number {
  const tree = parser.parse(prepareReadingText(markdown));
  tree.children = stripNonReadingSections(tree.children);
  const wordCount = readingText(tree).split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.round(wordCount / wpm));
}

export function formatReadingTime(
  markdown: string,
  wpm: number = DEFAULT_WPM,
): string {
  return `${estimateReadingMinutes(markdown, wpm)} min read`;
}
