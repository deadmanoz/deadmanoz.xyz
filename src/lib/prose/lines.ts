// Line-level classification for the sentence-per-line checker and formatter:
// which lines are prose and which are fences, lists, tables, math or directives.

const FENCE_OPEN_PATTERN = /^(```|~~~)/;

export const LIST_PATTERN = /^([ \t]*)([-*+]|\d{1,3}[.)])[ \t]+/;

export const BLOCKQUOTE_PREFIX_PATTERN = /^( {0,3}(?:>[ \t]*)+)/;

const HEADING_PATTERN = /^ {0,3}#{1,6}(?:\s|$)/;

const HR_PATTERN = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;

const TABLE_ROW_PATTERN = /^\s*\|/;

const IMAGE_LINE_PATTERN = /^ {0,3}!\[/;

const HTML_LINE_PATTERN = /^ {0,3}<\/?[a-zA-Z]/;

export const PLOT_OPEN_PATTERN = /^:::plot\b/;

const DIRECTIVE_LINE_PATTERN = /^:::(?:collapse|alert|plot)\b|^:::\s*$/;

export function newlineOf(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

export function isFenceOpen(line: string): string | null {
  const match = FENCE_OPEN_PATTERN.exec(line);
  return match ? match[1] : null;
}

export function isListLine(line: string): boolean {
  return LIST_PATTERN.test(line);
}

export function isBlockquoteLine(line: string): boolean {
  return BLOCKQUOTE_PREFIX_PATTERN.test(line);
}

export function isBlank(line: string): boolean {
  return line.trim() === "";
}

export function isTableRow(line: string): boolean {
  return TABLE_ROW_PATTERN.test(line);
}

export function isPassthroughLine(line: string): boolean {
  return (
    HEADING_PATTERN.test(line) ||
    HR_PATTERN.test(line) ||
    IMAGE_LINE_PATTERN.test(line) ||
    HTML_LINE_PATTERN.test(line) ||
    DIRECTIVE_LINE_PATTERN.test(line)
  );
}

export function isOneLineMath(line: string): boolean {
  const trimmed = line.trim();
  return (
    (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) ||
    (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4)
  );
}

export function isMathOpen(line: string): boolean {
  const trimmed = line.trim();
  if (isOneLineMath(line)) {
    return false;
  }
  return trimmed === "\\[" || trimmed.startsWith("\\[") || trimmed === "$$";
}

export function isMathClose(line: string, opener: string): boolean {
  const trimmed = line.trim();
  if (opener === "$$") {
    return trimmed === "$$" || trimmed.endsWith("$$");
  }
  return trimmed === "\\]" || trimmed.endsWith("\\]");
}

export function isProseLine(line: string): boolean {
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
