// Interactive plots: placeholders before remark, plot containers (numbered figures) after.

import { replacePlotBlocks } from "../post-syntax";
import type { RenderContext } from "./context";
import { processCaptionLinks } from "./inline";

// Process plot blocks before remark to preserve JSON data
export function processPlotBlocks(markdownString: string, ctx: RenderContext): string {
  // Each block, together with its {#fig:id} caption line when present, becomes a
  // placeholder that survives remark; postProcessPlots swaps it for the plot markup.
  return replacePlotBlocks(
    markdownString,
    (block) => {
      // Parse id and optional attributes (src, annotations, annotationIds)
      const idMatch = block.idAndAttrs.match(/^([^\s]+)/);
      const plotId = idMatch ? `plot-${idMatch[1]}` : 'plot-unnamed';

      const srcMatch = block.idAndAttrs.match(/src="([^"]+)"/);
      const annotationsMatch = block.idAndAttrs.match(/annotations="([^"]+)"/);
      const annotationIdsMatch = block.idAndAttrs.match(/annotationIds="([^"]+)"/);

      let dataToStore: string;

      if (srcMatch) {
        // External file: :::plot{id src="/path/to/data.json"}
        dataToStore = `{"src":"${srcMatch[1]}"}`;
      } else {
        // Inline JSON: :::plot{id}
        dataToStore = block.body.trim();
      }

      // Add annotation metadata to the stored data
      if (annotationsMatch || annotationIdsMatch) {
        try {
          const parsed = JSON.parse(dataToStore);
          if (annotationsMatch) {
            parsed.annotationsSrc = annotationsMatch[1];
          }
          if (annotationIdsMatch) {
            parsed.annotationIds = annotationIdsMatch[1];
          }
          dataToStore = JSON.stringify(parsed);
        } catch (e) {
          console.error('Failed to parse plot data for annotation metadata:', e);
        }
      }

      // Store the plot data, caption, and optional figure ID
      ctx.plots.set(plotId, {
        data: dataToStore,
        caption: block.caption?.text,
        ...(block.caption && { figId: block.caption.figId }),
      });

      // Use a simple placeholder that won't be processed by remark
      return `PLOT_PLACEHOLDER_${plotId}`;
    },
    { includeCaption: true },
  );
}

// Post-process plot placeholders after remark HTML conversion
// This needs to be called AFTER processFigures to get the figure number
export function postProcessPlots(htmlString: string, figureRefs: Map<string, number>, ctx: RenderContext): string {
  let processed = htmlString;

  // Process each stored plot
  for (const [id, plotInfo] of ctx.plots.entries()) {
    const placeholder = `PLOT_PLACEHOLDER_${id}`;

    if (processed.includes(placeholder)) {
      // Escape the JSON data for HTML attribute
      const escapedJson = plotInfo.data
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Create the plot div
      const plotDiv = `<div class="interactive-plot-container" data-plot-id="${id}" data-plot-data="${escapedJson}"></div>`;

      // If there's a caption or figId, wrap in figure container
      if (plotInfo.caption || plotInfo.figId) {
        const figId = plotInfo.figId || id.replace('plot-', '');
        const figNum = figureRefs.get(figId);

        const processedCaption = plotInfo.caption ? processCaptionLinks(plotInfo.caption) : '';
        const figureWrapper = `<figure class="figure-container" id="fig-${figId}">
          ${plotDiv}
          <figcaption><strong>Figure ${figNum}:</strong> ${processedCaption}</figcaption>
        </figure>`;

        processed = processed.replace(new RegExp(`<p>${placeholder}</p>`, 'g'), figureWrapper);
        processed = processed.replace(new RegExp(placeholder, 'g'), figureWrapper);
      } else {
        // No caption, just the plot
        processed = processed.replace(new RegExp(`<p>${placeholder}</p>`, 'g'), plotDiv);
        processed = processed.replace(new RegExp(placeholder, 'g'), plotDiv);
      }
    }
  }

  return processed;
}
