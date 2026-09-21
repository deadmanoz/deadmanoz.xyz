// Sentence boundary detection: where one sentence ends and the next begins,
// allowing for abbreviations, closers and inline placeholders.

import { STARTABLE_OPEN, TERM_CLOSE, TERM_OPEN, maskInline } from "./mask";

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

export function lineEndsSentence(line: string): boolean {
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
