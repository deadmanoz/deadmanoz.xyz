// Masking of inline constructs (code, links, math, annotations, colour and
// figure tokens) so sentence splitting never cuts inside them.

import { ANNOTATION_PATTERN, COLOR_PATTERN } from "../post-syntax";

const INLINE_CODE_PATTERN = /`[^`]+`/g;

const IMAGE_PATTERN = /!\[[^\]]*\]\([^)]+\)/g;

const LINK_PATTERN = /\[[^\]]*\]\([^)]+\)/g;

const AUTOLINK_PATTERN = /<https?:\/\/[^>]+>/g;

const BARE_URL_PATTERN = /https?:\/\/[^\s<>[\]{}]+/g;

const INLINE_MATH_PAREN_PATTERN = /\\\([\s\S]*?\\\)/g;

const INLINE_MATH_DOLLAR_PATTERN = /(?<!\$)\$(?!\$)(?:\\\$|[^$\n])+\$(?!\$)/g;

const FIGURE_TOKEN_PATTERN = /\{[#@](?:fig|tab):[^}]+\}/g;

interface MaskResult {
  masked: string;
  restore: (value: string) => string;
}

export const STARTABLE_OPEN = "\uE000";

const STARTABLE_CLOSE = "\uE001";

const SILENT_OPEN = "\uE002";

const SILENT_CLOSE = "\uE003";

export const TERM_OPEN = "\uE004";

export const TERM_CLOSE = "\uE005";

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
