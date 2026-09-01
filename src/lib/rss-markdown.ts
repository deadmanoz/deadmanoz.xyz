const ANNOTATION_PATTERN = /\[\[([^\|\]]+)\|\|((?:[^\[\]]|\[[^\]]*\])*)\]\]/g;

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
