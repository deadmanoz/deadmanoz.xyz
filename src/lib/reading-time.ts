/**
 * Estimate reading time from a markdown post body.
 *
 * Strips fenced code blocks and `:::plot{...}` JSON blocks before counting,
 * because both tend to be skimmed rather than read line by line and otherwise
 * inflate the estimate by hundreds of words. Also drops bibliography-style
 * sections (References, Changelog, Cite this post, and similar) that readers
 * typically skip. The site's Cite-this-post widget is a separate React
 * component and is already outside this count. Everything else (prose,
 * captions, inline code, math, annotations) counts as normal.
 *
 * Defaults to 220 WPM — a touch under the 240-265 WPM industry standard, to
 * reflect that the posts here are technical (Bitcoin protocol, mining, network
 * monitoring) and reward slower reading.
 */
import { replacePlotBlocks } from "./post-syntax";

const DEFAULT_WPM = 220;

const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*$/;

/**
 * Trailing / skippable headings. Matched after lowercasing and stripping
 * markdown emphasis, links, and `{#id}` suffixes. A heading also matches when
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
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
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
function stripNonReadingSections(markdown: string): string {
  const lines = markdown.split("\n");
  const kept: string[] = [];
  let skipping = false;
  let skipLevel = 0;

  for (const line of lines) {
    const heading = line.match(ATX_HEADING);
    if (heading) {
      const level = heading[1].length;
      const title = normalizeHeading(heading[2]);
      if (isNonReadingHeading(title)) {
        skipping = true;
        skipLevel = level;
        continue;
      }
      if (skipping && level <= skipLevel) {
        skipping = false;
      }
    }
    if (!skipping) {
      kept.push(line);
    }
  }

  return kept.join("\n");
}

export function estimateReadingMinutes(
  markdown: string,
  wpm: number = DEFAULT_WPM,
): number {
  const stripped = stripNonReadingSections(
    replacePlotBlocks(
      // Fenced code blocks ```lang\n...\n```
      markdown.replace(/```[\s\S]*?```/g, " "),
      // Plot JSON blocks; their caption line still counts as prose
      () => " ",
    ),
  );
  const wordCount = stripped.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / wpm));
}

export function formatReadingTime(
  markdown: string,
  wpm: number = DEFAULT_WPM,
): string {
  return `${estimateReadingMinutes(markdown, wpm)} min read`;
}
