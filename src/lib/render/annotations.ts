// Hover annotations: placeholders before remark, tooltip spans after.

import { ANNOTATION_PATTERN, preserveMathDelimiters, renderStrikethrough, renderSuperscript, restoreMathDelimiters } from "../post-syntax";
import { renderMarkdownFragment } from "../remark-pipeline";
import type { RenderContext } from "./context";
import { processColoredText } from "./inline";

// Process annotations before remark to handle markdown in tooltips
export function processAnnotations(markdownString: string, ctx: RenderContext): string {
  let counter = 0;

  // Process [[text||tooltip]] pattern in markdown
  // Tooltip capture allows one level of [...] nesting (for markdown links)
  return markdownString.replace(ANNOTATION_PATTERN, (match, text, tooltip) => {
    counter++;
    const id = `annotation-${counter}`;

    // Store the annotation data
    ctx.annotations.set(id, { text, tooltip });

    // Use a simple placeholder that won't be processed by remark
    return `ANNOTATION_PLACEHOLDER_${id}`;
  });
}

// Post-process annotations after remark HTML conversion
export async function postProcessAnnotations(htmlString: string, ctx: RenderContext): Promise<string> {
  let processed = htmlString;

  // Process each stored annotation
  for (const [id, data] of ctx.annotations.entries()) {
    const placeholder = `ANNOTATION_PLACEHOLDER_${id}`;

    if (processed.includes(placeholder)) {
      // Pre-process tooltip markdown with math delimiters
      const tooltipMarkdown = preserveMathDelimiters(data.tooltip);

      // Process tooltip content as markdown to HTML
      let tooltipHtml = await renderMarkdownFragment(tooltipMarkdown);

      // Apply all post-processing transformations to tooltip content
      tooltipHtml = restoreMathDelimiters(tooltipHtml);
      tooltipHtml = renderSuperscript(tooltipHtml);
      tooltipHtml = renderStrikethrough(tooltipHtml);
      tooltipHtml = processColoredText(tooltipHtml);

      // Remove wrapping <p> tags if present and trim
      tooltipHtml = tooltipHtml.replace(/^<p>|<\/p>$/g, '').trim();

      // Only escape quotes (not HTML entities) for HTML attribute
      // We need to preserve HTML tags like <span> for styled content
      const escapedTooltip = tooltipHtml.replace(/"/g, '&quot;');

      // Render a small inline subset of markdown in the annotation display
      // text: backticks, bold, italics. Splits on backticks first so formatting
      // markers inside code (e.g. `*foo*`) stay literal. Bold is processed
      // before italics so **x** isn't mis-matched as two italics.
      const renderInline = (s: string): string =>
        s
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/__([^_]+)__/g, "<strong>$1</strong>")
          .replace(/\*([^*]+)\*/g, "<em>$1</em>")
          .replace(/_([^_]+)_/g, "<em>$1</em>");
      const displayText = data.text
        .split(/(`[^`]+`)/g)
        .map((part) =>
          part.startsWith("`") && part.endsWith("`") && part.length >= 2
            ? `<code>${part.slice(1, -1)}</code>`
            : renderInline(part),
        )
        .join("");

      // Replace placeholder with annotation span
      const annotationSpan = `<span class="annotation" data-tooltip="${escapedTooltip}" id="${id}" tabindex="0" role="button" aria-describedby="tooltip-${id}">${displayText}</span>`;

      processed = processed.replace(placeholder, annotationSpan);
    }
  }

  return processed;
}
