import type { Shape, Annotations } from "plotly.js-basic-dist";
import { synthwaveColors } from "./colors";

/**
 * Annotation definition for vertical timeline markers
 */
export interface PlotAnnotation {
  id: string;
  date: string;
  label: string;
  color?: string;
  description?: string;
  position?: "top" | "bottom" | "auto";
}

/**
 * Annotation collection with metadata
 */
export interface AnnotationCollection {
  annotations: PlotAnnotation[];
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
  };
}

/**
 * Default color palette for annotations
 */
export const annotationColors = {
  protocol: synthwaveColors.neonCyan,
  upgrade: synthwaveColors.neonGreen,
  event: synthwaveColors.neonOrange,
  milestone: synthwaveColors.neonPink,
  fork: synthwaveColors.magenta,
  default: synthwaveColors.neonCyan,
};

/**
 * Convert annotation to Plotly shape (vertical line)
 */
export function annotationToShape(annotation: PlotAnnotation): Partial<Shape> {
  const color = annotation.color || annotationColors.default;

  return {
    type: "line",
    xref: "x",
    yref: "paper",
    x0: annotation.date,
    x1: annotation.date,
    y0: 0,
    y1: 1,
    line: {
      color,
      width: 2,
      dash: "dash",
    },
  };
}

/**
 * Convert annotation to Plotly annotation (label)
 */
export function annotationToLabel(
  annotation: PlotAnnotation,
  index: number
): Partial<Annotations> {
  const color = annotation.color || annotationColors.default;

  // Auto-position labels to avoid overlap
  let yPosition: number;
  let yAnchor: "top" | "bottom";

  if (annotation.position === "top") {
    yPosition = 1;
    yAnchor = "bottom";
  } else if (annotation.position === "bottom") {
    yPosition = 0;
    yAnchor = "top";
  } else {
    // Alternate between top and bottom for auto positioning
    if (index % 2 === 0) {
      yPosition = 1;
      yAnchor = "bottom";
    } else {
      yPosition = 0.95;
      yAnchor = "bottom";
    }
  }

  return {
    x: annotation.date,
    y: yPosition,
    text: annotation.label,
    showarrow: false,
    yref: "paper",
    xanchor: "center",
    yanchor: yAnchor,
    font: {
      color,
      size: 10,
    },
    bgcolor: "rgba(38, 20, 71, 0.9)",
    bordercolor: color,
    borderwidth: 1,
    hovertext: annotation.description,
  };
}

/**
 * Load annotations from external JSON file
 */
export async function loadAnnotationsFromFile(
  url: string
): Promise<PlotAnnotation[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load annotations: ${response.statusText}`);
    }
    const data: AnnotationCollection = await response.json();
    return data.annotations || [];
  } catch (error) {
    console.error(`Error loading annotations from ${url}:`, error);
    return [];
  }
}

/**
 * Filter annotations by IDs
 */
export function filterAnnotations(
  annotations: PlotAnnotation[],
  ids?: string | string[]
): PlotAnnotation[] {
  if (!ids) return annotations;

  const idArray = Array.isArray(ids) ? ids : ids.split(",").map((id) => id.trim());
  return annotations.filter((ann) => idArray.includes(ann.id));
}

/**
 * Filter annotations by date range
 */
export function filterAnnotationsByDateRange(
  annotations: PlotAnnotation[],
  startDate?: string | Date,
  endDate?: string | Date
): PlotAnnotation[] {
  if (!startDate && !endDate) return annotations;

  const start = startDate ? new Date(startDate).getTime() : -Infinity;
  const end = endDate ? new Date(endDate).getTime() : Infinity;

  return annotations.filter((ann) => {
    const annDate = new Date(ann.date).getTime();
    return annDate >= start && annDate <= end;
  });
}

/**
 * Add annotations to a Plotly layout
 * Returns updated shapes and annotations arrays
 */
export function applyAnnotationsToLayout(
  annotations: PlotAnnotation[],
  existingShapes?: Partial<Shape>[],
  existingAnnotations?: Partial<Annotations>[]
): {
  shapes: Partial<Shape>[];
  annotations: Partial<Annotations>[];
} {
  const shapes: Partial<Shape>[] = [
    ...(existingShapes || []),
    ...annotations.map(annotationToShape),
  ];

  const layoutAnnotations: Partial<Annotations>[] = [
    ...(existingAnnotations || []),
    ...annotations.map((ann, idx) => annotationToLabel(ann, idx)),
  ];

  return { shapes, annotations: layoutAnnotations };
}
