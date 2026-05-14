/**
 * Estimate reading time from a markdown post body.
 *
 * Strips fenced code blocks and `:::plot{...}` JSON blocks before counting,
 * because both tend to be skimmed rather than read line by line and otherwise
 * inflate the estimate by hundreds of words. Everything else (prose, captions,
 * inline code, math, annotations) counts as normal.
 *
 * Defaults to 220 WPM — a touch under the 240-265 WPM industry standard, to
 * reflect that the posts here are technical (Bitcoin protocol, mining, network
 * monitoring) and reward slower reading.
 */
const DEFAULT_WPM = 220;

export function estimateReadingMinutes(
  markdown: string,
  wpm: number = DEFAULT_WPM,
): number {
  const stripped = markdown
    // Fenced code blocks ```lang\n...\n```
    .replace(/```[\s\S]*?```/g, " ")
    // Plot JSON blocks :::plot{id}\n...\n:::
    .replace(/:::plot\{[^}]+\}[\s\S]*?^:::\s*$/gm, " ");
  const wordCount = stripped.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / wpm));
}

export function formatReadingTime(
  markdown: string,
  wpm: number = DEFAULT_WPM,
): string {
  return `${estimateReadingMinutes(markdown, wpm)} min read`;
}
