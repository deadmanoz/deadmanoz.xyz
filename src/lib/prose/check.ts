// Checking a Markdown source for sentence-per-line violations and reporting them.

import { formatMarkdown, isEmptyQuoteLine } from "./format";
import { BLOCKQUOTE_PREFIX_PATTERN, LIST_PATTERN, PLOT_OPEN_PATTERN, isBlank, isFenceOpen, isListLine, isMathClose, isMathOpen, isOneLineMath, isPassthroughLine, isTableRow } from "./lines";
import { maskInline } from "./mask";
import { lineEndsSentence, splitSentences } from "./sentences";

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
