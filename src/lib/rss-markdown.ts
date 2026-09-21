import {
  ALERT_OPENER_SOURCE,
  ANNOTATION_PATTERN,
  COLLAPSE_OPENER_SOURCE,
  COLOR_PATTERN,
  applyEdits,
  collectFigureNumbers,
  collectTableNumbers,
  colorFor,
  findImageFigures,
  findPlotFigures,
  preserveMathDelimiters,
  renderStrikethrough,
  renderSuperscript,
  replacePlotBlocks,
  restoreMathDelimiters,
} from "./post-syntax";
import { renderMarkdown } from "./remark-pipeline";

const ALERT_BLOCK_PATTERN = new RegExp(`${ALERT_OPENER_SOURCE}\\s*([\\s\\S]*?)\\s*:::`, "g");
const COLLAPSE_BLOCK_PATTERN = new RegExp(`${COLLAPSE_OPENER_SOURCE}\\s*([\\s\\S]*?)\\s*:::`, "g");

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Reduce hover annotations to their visible text for feed readers.
 *
 * Feed readers cannot reproduce the site's interactive tooltip, but the
 * tooltip may itself contain Markdown links. The pattern therefore accepts
 * one level of square brackets inside the tooltip before removing it.
 */
export function stripAnnotationsForFeed(markdown: string): string {
  return markdown.replace(ANNOTATION_PATTERN, "$1");
}

/** Reduce `{{colour:text}}` to its text. An unknown colour name stays literal, as on the site. */
export function stripColorsForFeed(markdown: string): string {
  return markdown.replace(COLOR_PATTERN, (match, name: string, text: string) =>
    colorFor(name) ? text : match,
  );
}

/** Prepend a post cover to feed HTML using a reader-safe absolute URL. */
export function prependCoverImageForFeed(
  html: string,
  coverImage: string | undefined,
  title: string,
  siteUrl: string,
): string {
  if (!coverImage) {
    return html;
  }

  const coverUrl = new URL(coverImage, siteUrl).toString();
  const alt = `${title} cover image`;

  return `<p><img src="${escapeHtmlAttribute(coverUrl)}" alt="${escapeHtmlAttribute(alt)}"></p>\n${html}`;
}

/**
 * Number figures for feed readers with the same document-order scheme as the
 * site: image and plot figures interleaved by source position.
 *
 * Image figures become `![Figure N: caption](src)`, a plot's caption line
 * becomes `**Figure N:** caption` (the plot block itself is replaced by the
 * caller), and `{@fig:id}` references become `Figure N`.
 */
export function numberFiguresForFeed(markdown: string): string {
  const numbers = collectFigureNumbers(markdown);

  const imageEdits = findImageFigures(markdown).map((figure) => {
    const num = numbers.get(figure.id);
    const prefix = num ? `Figure ${num}: ` : "";
    // Drop a literal "Figure:" prefix from the caption so it is not doubled.
    const caption = figure.alt.replace(/^Figure:\s*/i, "");
    return { start: figure.start, end: figure.end, text: `![${prefix}${caption}](${figure.src})` };
  });

  const plotEdits = findPlotFigures(markdown).map((plot) => {
    const num = numbers.get(plot.id);
    const prefix = num ? `**Figure ${num}:** ` : "";
    return { start: plot.captionStart, end: plot.captionEnd, text: `${prefix}${plot.caption}` };
  });

  return applyEdits(markdown, [...imageEdits, ...plotEdits]).replace(
    /\{@fig:([^}]+)\}/g,
    (_match, id: string) => {
      const num = numbers.get(id);
      return num ? `Figure ${num}` : "figure";
    },
  );
}

/**
 * Number tables like the site. A caption line ending in `{#tab:id}` becomes
 * `**Table N:** caption`, or `**Table N**` when the caption is empty, and
 * `{@tab:id}` references become `Table N`.
 */
export function numberTablesForFeed(markdown: string): string {
  const numbers = collectTableNumbers(markdown);

  return markdown
    // The id may follow the caption on the same line or, as the site also accepts, on
    // the next line of the same paragraph; a newline is only consumed after a non-empty
    // caption so an id on its own line keeps the blank line before it.
    .replace(/^([^\n|{]*?)(?:[ \t]*|(?<=\S)[ \t]*\n)\{#tab:([^}]+)\}[ \t]*$/gm, (_match, caption: string, id: string) => {
      const num = numbers.get(id);
      const text = caption.trim();
      if (!num) return text;
      return text ? `**Table ${num}:** ${text}` : `**Table ${num}**`;
    })
    .replace(/\{@tab:([^}]+)\}/g, (_match, id: string) => {
      const num = numbers.get(id);
      return num ? `Table ${num}` : "table";
    });
}

/** Point root-relative `src` and `href` attributes at the site so readers resolve them. */
export function absolutizeUrls(html: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return html
    .replace(/src="\/([^"]+)"/g, `src="${base}/$1"`)
    .replace(/href="\/([^"]+)"/g, `href="${base}/$1"`);
}

/**
 * Convert a post's Markdown to feed-reader HTML.
 *
 * Feed readers cannot run the site's client-side code, so interactive plots
 * become a pointer to the website, collapses flatten to a bold title plus
 * body, alerts become blockquotes, annotations keep their visible text and
 * colours are dropped. Figures and tables carry the same numbers as the site,
 * and math keeps its delimiters so the TeX source is at least readable.
 */
export async function markdownToFeedHtml(markdown: string, siteUrl: string): Promise<string> {
  let processed = numberFiguresForFeed(markdown);
  processed = numberTablesForFeed(processed);
  processed = preserveMathDelimiters(processed);
  processed = replacePlotBlocks(processed, () => "\n\n**[Interactive plot - view on website]**\n\n");
  processed = processed.replace(
    ALERT_BLOCK_PATTERN,
    (_match, _type: string, content: string) => `> ${content.trim().replace(/\n/g, "\n> ")}`,
  );
  processed = processed.replace(
    COLLAPSE_BLOCK_PATTERN,
    (_match, title: string, _anchor: string | undefined, content: string) =>
      `**${title}**\n\n${content.trim()}`,
  );
  processed = stripColorsForFeed(processed);
  processed = stripAnnotationsForFeed(processed);
  // Safety net for an id the numbering passes did not consume, such as a
  // figure id on a line the site would not recognise either.
  processed = processed.replace(/\{#(?:fig|tab):[^}]+\}/g, "");

  let html = await renderMarkdown(processed);
  html = restoreMathDelimiters(html);
  html = renderSuperscript(html);
  html = renderStrikethrough(html);
  return absolutizeUrls(html, siteUrl);
}
