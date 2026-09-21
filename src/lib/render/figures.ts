// Numbered figures and tables, and their cross-references.

import { collectFigureNumbers, collectTableNumbers } from "../post-syntax";
import { processCaptionLinks } from "./inline";

// A figure or table found in the HTML but missed by the source scan would otherwise be
// numbered silently; warn at build time so the mismatch is visible, then number it last.
function fallbackNumber(kind: string, id: string, refs: Map<string, number>): number {
  const number = refs.size + 1;
  console.warn(`markdownToHtml: ${kind} "${id}" was not found by the source scan; numbering it ${number}.`);
  refs.set(id, number);
  return number;
}

// Process figures with captions and automatic numbering
// Returns both the processed HTML and the figure reference map for use by plots
export function processFigures(markdown: string, htmlString: string): { html: string; figureRefs: Map<string, number> } {
  // Numbering is shared with the feed converter (post-syntax.ts) so both label
  // image and plot figures identically, interleaved in document order.
  const figureRefs = collectFigureNumbers(markdown);

  // Process images with figure syntax
  htmlString = htmlString.replace(
    /<p><img src="([^"]+)" alt="([^"]+)">\s*\{#fig:([^}]+)\}<\/p>/g,
    (_match, src, alt, id) => {
      const figNum = figureRefs.get(id) ?? fallbackNumber("Figure", id, figureRefs);
      // Check if alt text starts with "Figure:" to use as caption
      const rawCaption = alt.startsWith('Figure:') ? alt.substring(7).trim() : alt;
      const caption = processCaptionLinks(rawCaption);
      return `<figure class="figure-container" id="fig-${id}">
        <img src="${src}" alt="${alt}" />
        <figcaption><strong>Figure ${figNum}:</strong> ${caption}</figcaption>
      </figure>`;
    }
  );

  // Replace figure references (works for both image and plot figures)
  htmlString = htmlString.replace(/\{@fig:([^}]+)\}/g, (match, id) => {
    const figNum = figureRefs.get(id);
    if (figNum) {
      return `<a href="#fig-${id}" class="figure-ref">Figure ${figNum}</a>`;
    }
    return match;
  });

  return { html: htmlString, figureRefs };
}

// Process tables with captions and automatic numbering
export function processTables(markdown: string, htmlString: string): string {
  // Numbering is shared with the feed converter so both label tables identically.
  const tableRefs = collectTableNumbers(markdown);

  // Wrap a table followed by an optional caption and {#tab:id} in a numbered
  // container. The caption capture may be empty; if so, omit the trailing
  // colon and render just the table label.
  htmlString = htmlString.replace(
    /(<table>[\s\S]*?<\/table>)\s*<p>([^{]*?)\s*\{#tab:([^}]+)\}<\/p>/g,
    (_match, tableHtml, caption, id) => {
      const tableNum = tableRefs.get(id) ?? fallbackNumber("Table", id, tableRefs);
      const cleanCaption = caption.trim();
      const label = cleanCaption
        ? `<strong>Table ${tableNum}:</strong> ${cleanCaption}`
        : `<strong>Table ${tableNum}</strong>`;
      return `<div class="table-container" id="tab-${id}">
        ${tableHtml}
        <div class="table-caption">
          ${label}
        </div>
      </div>`;
    }
  );

  // Replace table references
  htmlString = htmlString.replace(/\{@tab:([^}]+)\}/g, (match, id) => {
    const tableNum = tableRefs.get(id);
    if (tableNum) {
      return `<a href="#tab-${id}" class="table-ref">Table ${tableNum}</a>`;
    }
    return match;
  });

  return htmlString;
}
