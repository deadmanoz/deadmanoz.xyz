/**
 * Render a post's Markdown to HTML.
 *
 * The custom syntax is handled by the passes under ./render, in the order
 * below; the patterns they share with the feed converter live in
 * ./post-syntax. Pre-remark passes replace constructs remark would mangle with
 * placeholders, remark renders the Markdown, and post-remark passes turn the
 * placeholders and remark's output into the final markup.
 */

import { preserveMathDelimiters, renderStrikethrough, renderSuperscript, restoreMathDelimiters } from "./post-syntax";
import { renderMarkdown } from "./remark-pipeline";
import { postProcessAnnotations, processAnnotations } from "./render/annotations";
import { createRenderContext } from "./render/context";
import { processAlertBoxes, processCollapsibleSections } from "./render/directives";
import { processFigures, processTables } from "./render/figures";
import { preserveImageAltLinks, restoreImageAltLinks } from "./render/image-alt";
import { processColoredText } from "./render/inline";
import { postProcessPlots, processPlotBlocks } from "./render/plots";

export default async function markdownToHtml(markdown: string) {
  // Pre-process to preserve markdown links in image alt text
  const ctx = createRenderContext();
  let processedMarkdown = preserveImageAltLinks(markdown, ctx);

  // Pre-process to preserve math delimiters using placeholders
  processedMarkdown = preserveMathDelimiters(processedMarkdown);

  // Process plot blocks BEFORE remark to preserve JSON data
  processedMarkdown = processPlotBlocks(processedMarkdown, ctx);

  // Process annotations BEFORE remark to avoid conflicts
  processedMarkdown = processAnnotations(processedMarkdown, ctx);

  let htmlString = await renderMarkdown(processedMarkdown);

  // Restore math delimiters FIRST, before any other processing
  htmlString = restoreMathDelimiters(htmlString);

  // Restore preserved links in image alt text (before figure processing)
  htmlString = restoreImageAltLinks(htmlString, ctx);

  // Post-process transformations
  htmlString = renderSuperscript(htmlString);
  htmlString = renderStrikethrough(htmlString);
  htmlString = processColoredText(htmlString);

  // Process figures first to get the figure reference map
  const { html: figuresHtml, figureRefs } = processFigures(markdown, htmlString);
  htmlString = figuresHtml;

  htmlString = processTables(markdown, htmlString);
  htmlString = processCollapsibleSections(htmlString);
  htmlString = processAlertBoxes(htmlString);

  // Process plots with the figure reference map
  htmlString = postProcessPlots(htmlString, figureRefs, ctx);

  htmlString = await postProcessAnnotations(htmlString, ctx);

  return htmlString;
}
