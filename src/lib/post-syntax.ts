/**
 * The custom post syntax, parsed in one place.
 *
 * The site renderer (markdownToHtml.ts), the feed converter (rss-markdown.ts),
 * the reading-time estimator and the sentence-per-line checker all import
 * their patterns and finders from here, so a change to the syntax is made once
 * and the outputs cannot drift apart. See agent_docs/markdown-syntax.md for
 * the syntax itself.
 */

import { proseColors } from "./colors";

// ---------------------------------------------------------------------------
// Positional edits
// ---------------------------------------------------------------------------

export interface TextEdit {
  start: number;
  end: number;
  text: string;
}

/** Apply non-overlapping edits to `source`, from the end so offsets stay valid. */
export function applyEdits(source: string, edits: TextEdit[]): string {
  let result = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Inline syntax
// ---------------------------------------------------------------------------

/**
 * Hover annotation `[[display||tooltip]]`. The tooltip may contain one level
 * of square brackets (a Markdown link). Global; use it with `replace`, which
 * is stateless, rather than `exec` or `test`.
 */
export const ANNOTATION_PATTERN = /\[\[([^\|\]]+)\|\|((?:[^\[\]]|\[[^\]]*\])*)\]\]/g;

/**
 * Coloured text `{{colour:text}}`. Group 1 is the colour name, group 2 the
 * text. Every consumer leaves an unknown colour name literal.
 */
export const COLOR_PATTERN = /\{\{([A-Za-z]+):([^{}]+)\}\}/g;

/** The colour for a `{{name:text}}` name, from the shared palette; undefined for an unknown name. */
export function colorFor(name: string): string | undefined {
  return proseColors[name.toLowerCase()];
}

// ---------------------------------------------------------------------------
// Block directives
// ---------------------------------------------------------------------------

/**
 * Regex source for a collapse opener `:::collapse{Title}{#anchor}?`. The title
 * allows one nested brace pair so a `{@fig:id}` or `{@tab:id}` reference can
 * sit inside it. Group 1 is the title, group 2 the optional anchor id. The
 * renderer composes it against remark's HTML and the feed against Markdown,
 * which is why the body and closer are left to the consumer.
 */
export const COLLAPSE_OPENER_SOURCE = String.raw`:::collapse\{((?:[^{}]|\{[^{}]*\})+)\}(?:\{#([^}]+)\})?`;

/** Regex source for an alert opener `:::alert{type}`. Group 1 is the type. */
export const ALERT_OPENER_SOURCE = String.raw`:::alert\{([^}]+)\}`;

// ---------------------------------------------------------------------------
// Plot blocks
// ---------------------------------------------------------------------------

export interface PlotCaption {
  /** Start of the caption line. */
  start: number;
  /** Index just past the closing `}` of `{#fig:id}`. */
  end: number;
  /** Caption text without the trailing `{#fig:id}`. */
  text: string;
  figId: string;
}

export interface PlotBlockMatch {
  /** Index of the leading `:::plot`. */
  start: number;
  /** Index just past the closing `:::` (its newline is not included). */
  end: number;
  /** Everything inside the opener's braces: the id and optional attributes. */
  idAndAttrs: string;
  /** Raw body between the opener line and the closing `:::`. */
  body: string;
  /** The caption line that follows, when it carries a `{#fig:id}`. */
  caption?: PlotCaption;
}

const PLOT_BLOCK_PATTERN = /:::plot\{([^}]+)\}\s*\n((?:(?!^:::$)[\s\S])*?)^:::$/gm;
const PLOT_CAPTION_PATTERN = /^(\s*\n)([^\n]*?)[ \t]*\{#fig:([^}]+)\}/;

/**
 * Find every `:::plot{...}` block. The body stops at the first `:::` line, and
 * the first non-blank line after it counts as the caption only when it carries
 * a `{#fig:id}`, which is what the renderer wraps in a numbered figure.
 */
export function findPlotBlocks(markdown: string): PlotBlockMatch[] {
  const blocks: PlotBlockMatch[] = [];
  const pattern = new RegExp(PLOT_BLOCK_PATTERN.source, PLOT_BLOCK_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
    const end = match.index + match[0].length;
    const block: PlotBlockMatch = {
      start: match.index,
      end,
      idAndAttrs: match[1],
      body: match[2],
    };
    const captionMatch = markdown.slice(end).match(PLOT_CAPTION_PATTERN);
    if (captionMatch) {
      block.caption = {
        start: end + captionMatch[1].length,
        end: end + captionMatch[0].length,
        text: captionMatch[2].trim(),
        figId: captionMatch[3],
      };
    }
    blocks.push(block);
  }

  return blocks;
}

/**
 * Replace each plot block with `replacer(block)`. The caption line is left in
 * place by default (the feed and the reading-time estimator want it); pass
 * `includeCaption` to replace it together with the block.
 */
export function replacePlotBlocks(
  markdown: string,
  replacer: (block: PlotBlockMatch) => string,
  options: { includeCaption?: boolean } = {},
): string {
  const edits = findPlotBlocks(markdown).map((block) => ({
    start: block.start,
    end: options.includeCaption && block.caption ? block.caption.end : block.end,
    text: replacer(block),
  }));
  return applyEdits(markdown, edits);
}

// ---------------------------------------------------------------------------
// Figures and tables
// ---------------------------------------------------------------------------

export interface ImageFigureMatch {
  /** Index of the leading `![` in the source. */
  start: number;
  /** Index just past the closing `}` of `{#fig:id}`. */
  end: number;
  alt: string;
  src: string;
  id: string;
}

/**
 * Find every `![alt](src){#fig:id}` image figure.
 *
 * Alt text may contain nested square brackets (a Markdown link inside a
 * caption) and the source may contain parentheses, so this scans with bracket
 * counting rather than a single regex.
 */
export function findImageFigures(markdown: string): ImageFigureMatch[] {
  const matches: ImageFigureMatch[] = [];
  let searchIndex = 0;

  while (searchIndex < markdown.length) {
    const imgStart = markdown.indexOf("![", searchIndex);
    if (imgStart === -1) break;
    searchIndex = imgStart + 1;

    let bracketDepth = 1;
    let altEnd = imgStart + 2;
    while (altEnd < markdown.length && bracketDepth > 0) {
      if (markdown[altEnd] === "[") bracketDepth++;
      else if (markdown[altEnd] === "]") bracketDepth--;
      altEnd++;
    }
    if (bracketDepth !== 0 || markdown[altEnd] !== "(") continue;

    let parenDepth = 1;
    let srcEnd = altEnd + 1;
    while (srcEnd < markdown.length && parenDepth > 0) {
      if (markdown[srcEnd] === "(") parenDepth++;
      else if (markdown[srcEnd] === ")") parenDepth--;
      srcEnd++;
    }
    if (parenDepth !== 0) continue;

    const figId = markdown.slice(srcEnd).match(/^\s*\{#fig:([^}]+)\}/);
    if (!figId) continue;

    matches.push({
      start: imgStart,
      end: srcEnd + figId[0].length,
      alt: markdown.slice(imgStart + 2, altEnd - 1),
      src: markdown.slice(altEnd + 1, srcEnd - 1),
      id: figId[1],
    });
    searchIndex = srcEnd + figId[0].length;
  }

  return matches;
}

export interface PlotFigureMatch {
  /** Index of the leading `:::plot` in the source. */
  start: number;
  /** Start of the caption line that follows the closing `:::`. */
  captionStart: number;
  /** Index just past the closing `}` of `{#fig:id}` on that line. */
  captionEnd: number;
  /** Caption text without the trailing `{#fig:id}`. */
  caption: string;
  id: string;
}

/** The plot blocks that carry a `{#fig:id}` caption, in the shape numbering uses. */
export function findPlotFigures(markdown: string): PlotFigureMatch[] {
  return findPlotBlocks(markdown).flatMap((block) =>
    block.caption
      ? [
          {
            start: block.start,
            captionStart: block.caption.start,
            captionEnd: block.caption.end,
            caption: block.caption.text,
            id: block.caption.figId,
          },
        ]
      : [],
  );
}

/**
 * Map each figure id to its number, counting image and plot figures together
 * in the order they appear in the source. A repeated id keeps its first number.
 */
export function collectFigureNumbers(markdown: string): Map<string, number> {
  const positions = [
    ...findImageFigures(markdown).map(({ id, start }) => ({ id, position: start })),
    ...findPlotFigures(markdown).map(({ id, start }) => ({ id, position: start })),
  ].sort((a, b) => a.position - b.position);

  const numbers = new Map<string, number>();
  for (const { id } of positions) {
    if (!numbers.has(id)) numbers.set(id, numbers.size + 1);
  }
  return numbers;
}

/** Map each `{#tab:id}` to its number in source order. A repeated id keeps its first number. */
export function collectTableNumbers(markdown: string): Map<string, number> {
  const numbers = new Map<string, number>();
  const pattern = /\{#tab:([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    if (!numbers.has(match[1])) numbers.set(match[1], numbers.size + 1);
  }
  return numbers;
}

// ---------------------------------------------------------------------------
// Math delimiters (shielded from remark, restored on the HTML side)
// ---------------------------------------------------------------------------

/** Replace `\[...\]` and `\(...\)` with placeholders remark leaves alone. */
export function preserveMathDelimiters(markdown: string): string {
  return markdown
    .replace(/\\\[([^\]]+?)\\\]/g, (_match, math) => `MATH_DISPLAY_START${math}MATH_DISPLAY_END`)
    .replace(/\\\((.*?)\\\)/g, (_match, math) => `MATH_INLINE_START${math}MATH_INLINE_END`);
}

/**
 * Turn the placeholders back into MathJax containers. rehype-stringify emits
 * hex numeric entities (e.g. `&#x3C;`) for special characters and named
 * entities arrive via other paths, so both are decoded for MathJax.
 */
export function restoreMathDelimiters(html: string): string {
  const decodeHtmlEntities = (text: string): string =>
    text
      .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&percnt;/g, "%");

  return html
    .replace(
      /MATH_DISPLAY_START(.*?)MATH_DISPLAY_END/g,
      (_match, math) => `<div class="math-display">\\[${decodeHtmlEntities(math)}\\]</div>`,
    )
    .replace(
      /MATH_INLINE_START(.*?)MATH_INLINE_END/g,
      (_match, math) => `<span class="math-inline">\\(${decodeHtmlEntities(math)}\\)</span>`,
    );
}

// ---------------------------------------------------------------------------
// Inline formatting applied to remark's HTML
// ---------------------------------------------------------------------------

const MATH_CONTAINER_SPLIT = /(<(?:div class="math-display"|span class="math-inline")>.*?<\/(?:div|span)>)/;

/** Apply `transform` to the parts of `html` outside MathJax containers. */
function outsideMath(html: string, transform: (part: string) => string): string {
  return html
    .split(MATH_CONTAINER_SPLIT)
    .map((part, index) =>
      index % 2 === 0 && !part.includes('class="math-') ? transform(part) : part,
    )
    .join("");
}

/** `^text^` becomes `<sup>`, leaving math untouched. */
export function renderSuperscript(html: string): string {
  return outsideMath(html, (part) => part.replace(/\^([^\^]+)\^/g, "<sup>$1</sup>"));
}

/** `~~text~~` becomes `<del>`, leaving math untouched. */
export function renderStrikethrough(html: string): string {
  return outsideMath(html, (part) => part.replace(/~~([^~]+)~~/g, "<del>$1</del>"));
}
