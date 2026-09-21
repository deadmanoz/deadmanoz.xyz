// Rewriting Markdown prose to one sentence per line, including list items
// and blockquotes, while leaving non-prose blocks untouched.

import { BLOCKQUOTE_PREFIX_PATTERN, LIST_PATTERN, PLOT_OPEN_PATTERN, isBlank, isBlockquoteLine, isFenceOpen, isListLine, isMathClose, isMathOpen, isOneLineMath, isPassthroughLine, isProseLine, isTableRow, newlineOf } from "./lines";
import { maskInline } from "./mask";
import { lineEndsSentence, splitSentences } from "./sentences";

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

export function isEmptyQuoteLine(line: string): boolean {
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
