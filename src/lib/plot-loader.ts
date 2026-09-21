import type { Annotations, Data, Layout, Shape } from "plotly.js-basic-dist";

import {
  applyAnnotationsToLayout,
  filterAnnotations,
  loadAnnotationsFromFile,
} from "./annotation-utils";
import { parsePlotData } from "./plot-utils";

export interface LoadedPlot {
  data: Data[];
  layout: Partial<Layout>;
}

interface PlotDescriptor {
  src?: string;
  annotationsSrc?: string;
  annotationIds?: string;
}

type ExternalPlotFile = PlotDescriptor & { data: Data[]; layout?: Partial<Layout> };

/** Reverse the entity escaping the renderer applies when it stores JSON in `data-plot-data`. */
export function decodePlotAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function fetchExternalPlot(src: string, plotId: string): Promise<ExternalPlotFile | null> {
  try {
    const response = await fetch(src);
    if (!response.ok) {
      console.error(`Failed to fetch plot data for ${plotId} from ${src}: ${response.status}`);
      return null;
    }
    const external = (await response.json()) as Partial<ExternalPlotFile>;
    if (!Array.isArray(external?.data)) {
      console.error(`Plot data for ${plotId} from ${src} must include a 'data' array`);
      return null;
    }
    return external as ExternalPlotFile;
  } catch (error) {
    console.error(`Failed to fetch plot data for ${plotId} from ${src}:`, error);
    return null;
  }
}

/**
 * Turn the JSON the renderer stored in a plot container into plot data.
 *
 * Inline data is parsed directly; `{"src": "..."}` is fetched. Either form may
 * name an annotations file (inline `annotationsSrc`, or the same key inside the
 * fetched file), whose entries are filtered by `annotationIds` when given and
 * merged into the layout. Returns null after logging when the data is unusable.
 */
export async function loadPlot(encodedAttribute: string, plotId: string): Promise<LoadedPlot | null> {
  const decoded = decodePlotAttribute(encodedAttribute);

  let descriptor: PlotDescriptor;
  try {
    descriptor = JSON.parse(decoded);
  } catch (error) {
    console.error(`Failed to parse plot data for ${plotId}:`, error);
    return null;
  }

  let plot: LoadedPlot;
  let annotationsSrc = descriptor.annotationsSrc;
  let annotationIds = descriptor.annotationIds;

  if (descriptor.src) {
    const external = await fetchExternalPlot(descriptor.src, plotId);
    if (!external) return null;
    plot = { data: external.data, layout: external.layout ?? {} };
    annotationsSrc ??= external.annotationsSrc;
    annotationIds ??= external.annotationIds;
  } else {
    const parsed = parsePlotData(decoded);
    if (!parsed) {
      console.error(`Failed to parse plot data for ${plotId}`);
      return null;
    }
    plot = { data: parsed.data, layout: parsed.layout ?? {} };
  }

  if (annotationsSrc) {
    const annotations = await loadAnnotationsFromFile(annotationsSrc);
    const selected = annotationIds ? filterAnnotations(annotations, annotationIds) : annotations;
    if (selected.length > 0) {
      const merged = applyAnnotationsToLayout(
        selected,
        plot.layout.shapes as Partial<Shape>[] | undefined,
        plot.layout.annotations as Partial<Annotations>[] | undefined,
      );
      plot.layout = {
        ...plot.layout,
        shapes: merged.shapes as Partial<Layout>["shapes"],
        annotations: merged.annotations as Partial<Layout>["annotations"],
      };
    }
  }

  return plot;
}
