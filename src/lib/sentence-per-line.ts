/**
 * Sentence-per-line layout for blog post markdown.
 *
 * Prose in `_posts` markdown keeps one sentence on each source line. A single
 * newline still renders as a space in HTML, so this is a source convention
 * (diffs, reviews, edits) rather than a typesetting change.
 *
 * Hover annotations (`[[display||tooltip]]`) are opaque. Periods inside a
 * tooltip do not count as sentence boundaries and must not be used to wrap
 * or split the surrounding sentence. The same applies to links, images,
 * inline code, inline math, and colour spans.
 */

const ABBREVIATIONS = new Set([
  "a.k.a",
  "al",
  "approx",
  "ca",
  "cf",
  "dr",
  "e.g",
  "eq",
  "est",
  "fig",
  "i.e",
  "inc",
  "jr",
  "ltd",
  "mr",
  "mrs",
  "ms",
  "n.b",
  "p.s",
  "pp",
  "prof",
  "sr",
  "u.k",
  "u.s",
  "viz",
  "vol",
  "vs",
  "w.r.t",
]);

/** Same shape as the markdown processor: one level of brackets in the tooltip. */
const ANNOTATION_PATTERN =
  /\[\[([^\|\]]+)\|\|((?:[^\[\]]|\[[^\]]*\])*)\]\]/g;

const INLINE_CODE_PATTERN = /`[^`]+`/g;
const IMAGE_PATTERN = /!\[[^\]]*\]\([^)]+\)/g;
const LINK_PATTERN = /\[[^\]]*\]\([^)]+\)/g;
const AUTOLINK_PATTERN = /<https?:\/\/[^>]+>/g;
const BARE_URL_PATTERN = /https?:\/\/[^\s<>[\]{}]+/g;
const INLINE_MATH_PAREN_PATTERN = /\\\([\s\S]*?\\\)/g;
const INLINE_MATH_DOLLAR_PATTERN = /(?<!\$)\$(?!\$)(?:\\\$|[^$\n])+\$(?!\$)/g;
const COLOR_PATTERN = /\{\{[a-z]+:[^{}]+\}\}/g;
const FIGURE_TOKEN_PATTERN = /\{[#@](?:fig|tab):[^}]+\}/g;

const FENCE_OPEN_PATTERN = /^(```|~~~)/;
const LIST_PATTERN = /^([ \t]*)([-*+]|\d{1,3}[.)])[ \t]+/;
const BLOCKQUOTE_PREFIX_PATTERN = /^( {0,3}(?:>[ \t]*)+)/;
const HEADING_PATTERN = /^ {0,3}#{1,6}(?:\s|$)/;
const HR_PATTERN = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_ROW_PATTERN = /^\s*\|/;
const IMAGE_LINE_PATTERN = /^ {0,3}!\[/;
const HTML_LINE_PATTERN = /^ {0,3}<\/?[a-zA-Z]/;
const PLOT_OPEN_PATTERN = /^:::plot\b/;
const DIRECTIVE_LINE_PATTERN = /^:::(?:collapse|alert|plot)\b|^:::\s*$/;

export type ViolationKind = "multiple-sentences" | "wrapped-sentence" | "needs-format";

export interface SentencePerLineViolation {
  line: number;
  kind: ViolationKind;
  text: string;
  detail: string;
}

export interface SentencePerLineReport {
  path?: string;
  violations: SentencePerLineViolation[];
  formatted: string;
  changed: boolean;
}

function newlineOf(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function isFenceOpen(line: string): string | null {
  const match = FENCE_OPEN_PATTERN.exec(line);
  return match ? match[1] : null;
}

function isListLine(line: string): boolean {
  return LIST_PATTERN.test(line);
}

function isBlockquoteLine(line: string): boolean {
  return BLOCKQUOTE_PREFIX_PATTERN.test(line);
}

function isBlank(line: string): boolean {
  return line.trim() === "";
}

function isTableRow(line: string): boolean {
  return TABLE_ROW_PATTERN.test(line);
}

function isPassthroughLine(line: string): boolean {
  return (
    HEADING_PATTERN.test(line) ||
    HR_PATTERN.test(line) ||
    IMAGE_LINE_PATTERN.test(line) ||
    HTML_LINE_PATTERN.test(line) ||
    DIRECTIVE_LINE_PATTERN.test(line)
  );
}

function isOneLineMath(line: string): boolean {
  const trimmed = line.trim();
  return (
    (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) ||
    (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4)
  );
}

function isMathOpen(line: string): boolean {
  const trimmed = line.trim();
  if (isOneLineMath(line)) {
    return false;
  }
  return trimmed === "\\[" || trimmed.startsWith("\\[") || trimmed === "$$";
}

function isMathClose(line: string, opener: string): boolean {
  const trimmed = line.trim();
  if (opener === "$$") {
    return trimmed === "$$" || trimmed.endsWith("$$");
  }
  return trimmed === "\\]" || trimmed.endsWith("\\]");
}

function isProseLine(line: string): boolean {
  if (isBlank(line)) return false;
  if (isFenceOpen(line)) return false;
  if (PLOT_OPEN_PATTERN.test(line)) return false;
  if (isTableRow(line)) return false;
  if (isPassthroughLine(line)) return false;
  if (isOneLineMath(line) || isMathOpen(line)) return false;
  if (isBlockquoteLine(line)) return false;
  if (isListLine(line)) return false;
  return true;
}

function isCloser(char: string): boolean {
  return (
    char === '"' ||
    char === "'" ||
    char === "”" ||
    char === "’" ||
    char === ")" ||
    char === "]" ||
    char === "*" ||
    char === "_"
  );
}

function startsSentence(text: string, index: number): boolean {
  const first = text[index];
  // Masked links, annotations, code, and math all start with the placeholder
  // sentinel. Treat those as a new sentence so "end. [b10c](...)" still splits
  // after masking.
  if (first === STARTABLE_OPEN || first === "[" || first === "`") {
    return true;
  }
  if (first === "{" && (text[index + 1] === "@" || text[index + 1] === "#")) {
    return true;
  }

  let i = index;
  while (
    i < text.length &&
    (text[i] === "*" ||
      text[i] === "_" ||
      text[i] === '"' ||
      text[i] === "“" ||
      text[i] === "'" ||
      text[i] === "‘" ||
      text[i] === "(")
  ) {
    i += 1;
  }
  if (i >= text.length) {
    return false;
  }
  return /[A-Z]/.test(text[i]);
}

function isAbbreviation(text: string, periodIndex: number): boolean {
  const before = text.slice(0, periodIndex);
  const match = /([A-Za-z](?:\.[A-Za-z])*|[A-Za-z]+)$/.exec(before);
  if (!match) {
    return false;
  }
  const token = match[1];
  // Initials: "J. Smith". A lowercase letter is usually the end of a word
  // ("`scriptPubKey`s. Bitcoin") rather than an initial.
  if (token.length === 1) {
    return /[A-Z]/.test(token);
  }
  // "J.R." / "U.S.A." style initials
  if (/^(?:[A-Z]\.)+[A-Z]$/.test(token)) {
    return true;
  }
  return ABBREVIATIONS.has(token.toLowerCase());
}

export function splitSentences(text: string): string[] {
  if (text.length === 0) {
    return [];
  }

  const parts: string[] = [];
  let start = 0;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (char === TERM_OPEN) {
      const closeAt = text.indexOf(TERM_CLOSE, i + 1);
      if (closeAt === -1) {
        i += 1;
        continue;
      }
      let j = closeAt + 1;
      while (j < text.length && isCloser(text[j])) {
        j += 1;
      }
      if (j < text.length && /\s/.test(text[j])) {
        let k = j;
        while (k < text.length && /\s/.test(text[k])) {
          k += 1;
        }
        if (k < text.length && startsSentence(text, k)) {
          parts.push(text.slice(start, j).trimEnd());
          start = k;
          i = k;
          continue;
        }
      }
      i = closeAt + 1;
      continue;
    }
    if (char === "." || char === "!" || char === "?") {
      if (char === "." && text[i - 1] === ".") {
        i += 1;
        continue;
      }
      if (char === "." && isAbbreviation(text, i)) {
        i += 1;
        continue;
      }

      let j = i + 1;
      while (j < text.length && isCloser(text[j])) {
        j += 1;
      }
      if (j < text.length && /\s/.test(text[j])) {
        let k = j;
        while (k < text.length && /\s/.test(text[k])) {
          k += 1;
        }
        if (k < text.length && startsSentence(text, k)) {
          parts.push(text.slice(start, j).trimEnd());
          start = k;
          i = k;
          continue;
        }
      }
    }
    i += 1;
  }

  if (start < text.length) {
    const tail = text.slice(start).trim();
    if (tail.length > 0) {
      parts.push(tail);
    }
  }

  return parts
    .map((part) => part.replace(/[ \t]+$/g, "").trim())
    .filter((part) => part.length > 0);
}

interface MaskResult {
  masked: string;
  restore: (value: string) => string;
}

const STARTABLE_OPEN = "\uE000";
const STARTABLE_CLOSE = "\uE001";
const SILENT_OPEN = "\uE002";
const SILENT_CLOSE = "\uE003";
const TERM_OPEN = "\uE004";
const TERM_CLOSE = "\uE005";

function replaceWithPlaceholders(
  input: string,
  pattern: RegExp,
  store: string[],
  open: string,
  close: string,
): string {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return input.replace(new RegExp(pattern.source, flags), (match) => {
    const index = store.length;
    store.push(match);
    return `${open}${index}${close}`;
  });
}

function annotationDisplayEndsSentence(display: string): boolean {
  const trimmed = display.trim().replace(/[*_`]+$/g, "").trim();
  return /[.!?]$/.test(trimmed);
}

export function maskInline(text: string): MaskResult {
  const store: string[] = [];
  let masked = text;
  masked = masked.replace(ANNOTATION_PATTERN, (match, display: string) => {
    const index = store.length;
    store.push(match);
    if (annotationDisplayEndsSentence(display)) {
      return `${TERM_OPEN}${index}${TERM_CLOSE}`;
    }
    return `${STARTABLE_OPEN}${index}${STARTABLE_CLOSE}`;
  });
  masked = replaceWithPlaceholders(masked, IMAGE_PATTERN, store, STARTABLE_OPEN, STARTABLE_CLOSE);
  masked = replaceWithPlaceholders(masked, COLOR_PATTERN, store, SILENT_OPEN, SILENT_CLOSE);
  masked = replaceWithPlaceholders(masked, LINK_PATTERN, store, STARTABLE_OPEN, STARTABLE_CLOSE);
  masked = replaceWithPlaceholders(masked, INLINE_CODE_PATTERN, store, STARTABLE_OPEN, STARTABLE_CLOSE);
  masked = replaceWithPlaceholders(masked, INLINE_MATH_PAREN_PATTERN, store, STARTABLE_OPEN, STARTABLE_CLOSE);
  masked = replaceWithPlaceholders(masked, INLINE_MATH_DOLLAR_PATTERN, store, STARTABLE_OPEN, STARTABLE_CLOSE);
  masked = replaceWithPlaceholders(masked, FIGURE_TOKEN_PATTERN, store, SILENT_OPEN, SILENT_CLOSE);
  masked = replaceWithPlaceholders(masked, AUTOLINK_PATTERN, store, STARTABLE_OPEN, STARTABLE_CLOSE);
  masked = replaceWithPlaceholders(masked, BARE_URL_PATTERN, store, STARTABLE_OPEN, STARTABLE_CLOSE);

  return {
    masked,
    restore(value: string): string {
      const expand = (input: string): string =>
        input
          .replace(/\uE000(\d+)\uE001/g, (_, index) => store[Number(index)] ?? "")
          .replace(/\uE002(\d+)\uE003/g, (_, index) => store[Number(index)] ?? "")
          .replace(/\uE004(\d+)\uE005/g, (_, index) => store[Number(index)] ?? "");
      let current = value;
      let previous = "";
      while (current !== previous) {
        previous = current;
        current = expand(current);
      }
      return current;
    },
  };
}

export function formatProse(text: string): string[] {
  const collapsed = text.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
  if (collapsed.length === 0) {
    return [];
  }
  // Plot captions must stay on one line: the markdown processor reads
  // `{#fig:id}` from the single line immediately after `:::`.
  if (/\{#fig:[^}]+\}/.test(collapsed)) {
    return [collapsed];
  }
  const { masked, restore } = maskInline(collapsed);
  const sentences: string[] = [];
  for (const piece of splitSentences(masked).map((sentence) => restore(sentence).trimEnd())) {
    if (sentences.length > 0 && /^\{[#@](?:fig|tab):[^}]+\}$/.test(piece)) {
      sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${piece}`;
      continue;
    }
    sentences.push(piece);
  }
  return sentences;
}

function formatProseParagraph(lines: string[]): string[] {
  const out: string[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) {
      return;
    }
    out.push(...formatProse(buffer.join("\n")));
    buffer = [];
  };

  for (const line of lines) {
    if (buffer.length > 0 && lineEndsSentence(buffer[buffer.length - 1])) {
      flush();
    }
    buffer.push(line);
  }
  flush();
  return out;
}

function hangingIndentFor(marker: string): string {
  return marker.replace(/\S/g, " ");
}

function formatListItem(marker: string, bodyLines: string[]): string[] {
  const body = bodyLines.join("\n").replace(/^[ \t]+/gm, "").trim();
  const sentences = formatProse(body);
  if (sentences.length === 0) {
    return [`${marker}${bodyLines[0] ?? ""}`.trimEnd()];
  }
  const indent = hangingIndentFor(marker);
  return sentences.map((sentence, index) =>
    index === 0 ? `${marker}${sentence}` : `${indent}${sentence}`,
  );
}

function collectListBlock(lines: string[], start: number): { end: number; rendered: string[] } {
  const items: { marker: string; body: string[] }[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const listMatch = LIST_PATTERN.exec(line);
    if (listMatch) {
      items.push({
        marker: listMatch[0],
        body: [line.slice(listMatch[0].length)],
      });
      i += 1;
      continue;
    }

    const current = items[items.length - 1];
    if (!current) {
      break;
    }
    // A flush-left line ends the list (CommonMark). Only indented lines
    // continue the current item.
    if (!/^[ \t]/.test(line)) {
      break;
    }
    if (isBlank(line) || isPassthroughLine(line) || isFenceOpen(line) || PLOT_OPEN_PATTERN.test(line) || isTableRow(line) || isMathOpen(line) || isOneLineMath(line) || isBlockquoteLine(line)) {
      break;
    }
    if (isListLine(line)) {
      break;
    }
    current.body.push(line);
    i += 1;
  }

  return {
    end: i,
    rendered: items.flatMap((item) => formatListItem(item.marker, item.body)),
  };
}

function quotePrefix(line: string): string {
  const match = BLOCKQUOTE_PREFIX_PATTERN.exec(line);
  if (!match) {
    return "> ";
  }
  const raw = match[1];
  const depth = (raw.match(/>/g) ?? []).length;
  return `${"> ".repeat(depth)}`;
}

function stripQuotePrefix(line: string): string {
  return line.replace(BLOCKQUOTE_PREFIX_PATTERN, "");
}

function isEmptyQuoteLine(line: string): boolean {
  return stripQuotePrefix(line).trim() === "";
}

function collectQuoteBlock(lines: string[], start: number): { end: number; rendered: string[] } {
  let i = start;
  const rendered: string[] = [];
  let paragraph: string[] = [];
  let prefix = quotePrefix(lines[start]);

  const flush = () => {
    if (paragraph.length === 0) {
      return;
    }
    const sentences = formatProse(paragraph.map(stripQuotePrefix).join("\n"));
    if (sentences.length === 0) {
      rendered.push(`${prefix}${paragraph.map(stripQuotePrefix).join(" ")}`.trimEnd());
    } else {
      for (const sentence of sentences) {
        rendered.push(`${prefix}${sentence}`);
      }
    }
    paragraph = [];
  };

  while (i < lines.length && isBlockquoteLine(lines[i])) {
    const line = lines[i];
    if (isEmptyQuoteLine(line)) {
      flush();
      rendered.push(line.trimEnd() === "" ? line : line.replace(/[ \t]+$/, ""));
      i += 1;
      if (i < lines.length && isBlockquoteLine(lines[i])) {
        prefix = quotePrefix(lines[i]);
      }
      continue;
    }
    if (paragraph.length === 0) {
      prefix = quotePrefix(line);
    }
    paragraph.push(line);
    i += 1;
  }
  flush();

  return { end: i, rendered };
}

function copyUntil(
  lines: string[],
  start: number,
  shouldStop: (line: string, index: number) => boolean,
): { end: number; copied: string[] } {
  const copied = [lines[start]];
  let i = start + 1;
  while (i < lines.length && !shouldStop(lines[i], i)) {
    copied.push(lines[i]);
    i += 1;
  }
  if (i < lines.length && shouldStop(lines[i], i)) {
    copied.push(lines[i]);
    i += 1;
  }
  return { end: i, copied };
}

export function formatMarkdown(source: string): string {
  const newline = newlineOf(source);
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  if (lines[0] === "---") {
    out.push(lines[0]);
    i = 1;
    while (i < lines.length) {
      out.push(lines[i]);
      if (lines[i] === "---") {
        i += 1;
        break;
      }
      i += 1;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      out.push(line);
      i += 1;
      continue;
    }

    const fence = isFenceOpen(line);
    if (fence) {
      const marker = fence;
      const block = copyUntil(lines, i, (candidate, index) => index > i && candidate.startsWith(marker));
      out.push(...block.copied);
      i = block.end;
      continue;
    }

    if (PLOT_OPEN_PATTERN.test(line)) {
      const block = copyUntil(lines, i, (candidate, index) => index > i && /^:::\s*$/.test(candidate));
      out.push(...block.copied);
      i = block.end;
      continue;
    }

    if (isOneLineMath(line)) {
      out.push(line);
      i += 1;
      continue;
    }

    if (isMathOpen(line)) {
      const opener = line.trim().startsWith("$$") ? "$$" : "\\[";
      const block = copyUntil(lines, i, (candidate, index) => index > i && isMathClose(candidate, opener));
      out.push(...block.copied);
      i = block.end;
      continue;
    }

    if (isTableRow(line)) {
      while (i < lines.length && isTableRow(lines[i])) {
        out.push(lines[i]);
        i += 1;
      }
      continue;
    }

    if (isPassthroughLine(line)) {
      out.push(line);
      i += 1;
      continue;
    }

    if (isBlockquoteLine(line)) {
      const block = collectQuoteBlock(lines, i);
      out.push(...block.rendered);
      i = block.end;
      continue;
    }

    if (isListLine(line)) {
      const block = collectListBlock(lines, i);
      out.push(...block.rendered);
      i = block.end;
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && isProseLine(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    if (paragraph.length > 0) {
      out.push(...formatProseParagraph(paragraph));
    }
  }

  let result = out.join(newline);
  const sourceEndsWithNewline = source.endsWith("\n") || source.endsWith("\r\n");
  if (sourceEndsWithNewline && !result.endsWith(newline)) {
    result += newline;
  }
  if (!sourceEndsWithNewline && result.endsWith(newline)) {
    result = result.slice(0, -newline.length);
  }
  return result;
}

function stripTrailingMaskTokens(text: string): { text: string; endsWithTerm: boolean } {
  let current = text.replace(/\s+$/, "");
  let endsWithTerm = false;
  while (current.length > 0) {
    const term = /\uE004\d+\uE005$/.exec(current);
    if (term) {
      endsWithTerm = true;
      current = current.slice(0, -term[0].length);
      continue;
    }
    const silent = /\uE002\d+\uE003$/.exec(current);
    if (silent) {
      current = current.slice(0, -silent[0].length);
      continue;
    }
    const startable = /\uE000\d+\uE001$/.exec(current);
    if (startable) {
      current = current.slice(0, -startable[0].length);
      continue;
    }
    break;
  }
  return { text: current, endsWithTerm };
}

function lineEndsSentence(line: string): boolean {
  const { masked } = maskInline(line.replace(/[ \t]+$/, ""));
  const stripped = stripTrailingMaskTokens(masked);
  if (stripped.endsWithTerm) {
    return true;
  }
  const trimmed = stripped.text.replace(/\s+$/, "");
  if (trimmed.length === 0) {
    return true;
  }
  if (/[:：]$/.test(trimmed)) {
    return true;
  }
  let i = trimmed.length - 1;
  while (i >= 0 && isCloser(trimmed[i])) {
    i -= 1;
  }
  if (i < 0) {
    return false;
  }
  return trimmed[i] === "." || trimmed[i] === "!" || trimmed[i] === "?";
}

function stripStructuralPrefix(line: string): string {
  const quote = BLOCKQUOTE_PREFIX_PATTERN.exec(line);
  if (quote) {
    return line.slice(quote[0].length);
  }
  const list = LIST_PATTERN.exec(line);
  if (list) {
    return line.slice(list[0].length);
  }
  return line;
}

function analyzeCheckableLine(line: string, lineNumber: number): SentencePerLineViolation[] {
  if (/\{#fig:[^}]+\}/.test(line)) {
    return [];
  }
  const body = stripStructuralPrefix(line);
  const { masked, restore } = maskInline(body);
  const sentences = splitSentences(masked);
  if (sentences.length <= 1) {
    return [];
  }
  return [
    {
      line: lineNumber,
      kind: "multiple-sentences",
      text: line.trim(),
      detail: `contains ${sentences.length} sentences; split after: ${restore(sentences[0]).slice(0, 80)}`,
    },
  ];
}

function classifyForCheck(line: string): "skip" | "check" | "blank" {
  if (isBlank(line)) return "blank";
  if (isFenceOpen(line) || PLOT_OPEN_PATTERN.test(line) || isTableRow(line) || isPassthroughLine(line) || isOneLineMath(line) || isMathOpen(line)) {
    return "skip";
  }
  return "check";
}

export function checkMarkdown(source: string, path?: string): SentencePerLineReport {
  const formatted = formatMarkdown(source);
  const lines = source.split(/\r?\n/);
  const violations: SentencePerLineViolation[] = [];
  let inFence = false;
  let fenceMarker = "";
  let inPlot = false;
  let inMath = false;
  let mathOpener = "";
  let inFrontmatter = lines[0] === "---";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (inFrontmatter) {
      if (index > 0 && line === "---") {
        inFrontmatter = false;
      }
      continue;
    }

    if (inFence) {
      if (line.startsWith(fenceMarker)) {
        inFence = false;
        fenceMarker = "";
      }
      continue;
    }
    if (inPlot) {
      if (/^:::\s*$/.test(line)) {
        inPlot = false;
      }
      continue;
    }
    if (inMath) {
      if (isMathClose(line, mathOpener)) {
        inMath = false;
        mathOpener = "";
      }
      continue;
    }

    const fence = isFenceOpen(line);
    if (fence) {
      inFence = true;
      fenceMarker = fence;
      continue;
    }
    if (PLOT_OPEN_PATTERN.test(line)) {
      inPlot = true;
      continue;
    }
    if (isMathOpen(line)) {
      inMath = true;
      mathOpener = line.trim().startsWith("$$") ? "$$" : "\\[";
      continue;
    }

    const kind = classifyForCheck(line);
    if (kind !== "check") {
      continue;
    }

    if (isEmptyQuoteLine(line)) {
      continue;
    }

    violations.push(...analyzeCheckableLine(line, lineNumber));

    const next = lines[index + 1];
    if (
      next !== undefined &&
      classifyForCheck(next) === "check" &&
      !isListLine(next) &&
      !isEmptyQuoteLine(next) &&
      !lineEndsSentence(stripStructuralPrefix(line))
    ) {
      violations.push({
        line: lineNumber,
        kind: "wrapped-sentence",
        text: line.trim(),
        detail: "sentence continues on the next line; keep it on one line",
      });
    }
  }

  if (formatted !== source && violations.length === 0) {
    violations.push({
      line: 1,
      kind: "needs-format",
      text: "",
      detail: "source is not in canonical sentence-per-line form (trailing space or wrap normalisation)",
    });
  }

  return {
    path,
    violations,
    formatted,
    changed: formatted !== source,
  };
}

export function formatViolation(violation: SentencePerLineViolation, path = ""): string {
  const location = path ? `${path}:${violation.line}` : `line ${violation.line}`;
  const preview = violation.text.length > 0 ? `\n  ${violation.text.slice(0, 160)}` : "";
  return `${location}: ${violation.kind}: ${violation.detail}${preview}`;
}

export function formatReport(reports: SentencePerLineReport[]): string {
  const lines: string[] = [];
  for (const report of reports) {
    for (const violation of report.violations) {
      lines.push(formatViolation(violation, report.path));
    }
  }
  return lines.join("\n");
}
