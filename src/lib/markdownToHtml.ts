import { remark } from "remark";
import html from "remark-html";

// Custom function to handle superscript syntax ^text^ - avoid math content
function processSuperscript(htmlString: string): string {
  // Split the string by math spans to avoid processing inside them
  const parts = htmlString.split(/(<(?:div class="math-display"|span class="math-inline")>.*?<\/(?:div|span)>)/);

  return parts.map((part, index) => {
    // Only process non-math parts (even indices in the split array)
    if (index % 2 === 0 && !part.includes('class="math-')) {
      return part.replace(/\^([^\^]+)\^/g, '<sup>$1</sup>');
    }
    return part;
  }).join('');
}

// Color mapping for chart consistency
const colorMap: Record<string, string> = {
  'magenta': '#FF00FF',
  'pink': '#FF006E',
  'cyan': '#00D9FF',
  'purple': '#8B5CF6',
  'orange': '#FFA500',
  'lightblue': '#42D4F4',
  'green': '#10B981',
  'yellow': '#EAB308',
  'red': '#E6194B',
  'blue': '#3B82F6',
  'teal': '#14B8A6',
  'lime': '#84CC16',
  'indigo': '#6366F1'
};

// Process colored text with syntax {{color:text}}
function processColoredText(htmlString: string): string {
  return htmlString.replace(/\{\{([^:]+):([^}]+)\}\}/g, (match, colorName, text) => {
    const color = colorMap[colorName.toLowerCase()];
    if (color) {
      return `<span style="color: ${color}; font-weight: bold;">${text}</span>`;
    }
    return match; // Return original if color not found
  });
}

// Preserve math delimiters for client-side MathJax processing
function preserveMathDelimiters(markdownString: string): string {
  // Process display math \[...\] - working on raw markdown before remark
  // Use a special placeholder that won't be processed by remark
  let processed = markdownString.replace(/\\\[([^\]]+?)\\\]/g, (_match, math) => {
    return `MATH_DISPLAY_START${math}MATH_DISPLAY_END`;
  });

  // Process inline math \(...\) - working on raw markdown before remark
  // Use a special placeholder that won't be processed by remark
  processed = processed.replace(/\\\(([^)]+?)\\\)/g, (_match, math) => {
    return `MATH_INLINE_START${math}MATH_INLINE_END`;
  });

  return processed;
}

// Restore math placeholders back to proper HTML after remark processing
function restoreMathDelimiters(htmlString: string): string {
  // Restore display math placeholders
  let processed = htmlString.replace(/MATH_DISPLAY_START([^M]+?)MATH_DISPLAY_END/g, (_match, math) => {
    return `<div class="math-display">\\[${math}\\]</div>`;
  });

  // Restore inline math placeholders
  processed = processed.replace(/MATH_INLINE_START([^M]+?)MATH_INLINE_END/g, (_match, math) => {
    return `<span class="math-inline">\\(${math}\\)</span>`;
  });

  return processed;
}

// Don't process annotations before remark - let them pass through
function processAnnotations(markdownString: string): string {
  // Do nothing - we'll process after HTML conversion
  return markdownString;
}

// Post-process annotations after remark HTML conversion
function postProcessAnnotations(htmlString: string): string {
  let counter = 0;

  // Look for [[text||tooltip]] pattern in the HTML
  // Remark will have escaped the brackets
  const processed = htmlString.replace(/\[\[([^\|\]]+)\|\|([^\]]+)\]\]/g, (match, text, tooltip) => {
    counter++;
    const escapedTooltip = tooltip.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const id = `annotation-${counter}`;
    return `<span class="annotation" data-tooltip="${escapedTooltip}" id="${id}" tabindex="0" role="button" aria-describedby="tooltip-${id}">${text}</span>`;
  });

  return processed;
}

// Process figures with captions and automatic numbering
function processFigures(markdown: string, htmlString: string): string {
  let figureCounter = 0;
  const figureRefs = new Map<string, number>();

  // First pass: Find all figure definitions in markdown and create mapping
  const figurePattern = /!\[([^\]]*)\]\([^)]+\)\s*\{#fig:([^}]+)\}/g;
  let match;
  while ((match = figurePattern.exec(markdown)) !== null) {
    const id = match[2];
    if (!figureRefs.has(id)) {
      figureRefs.set(id, ++figureCounter);
    }
  }

  // Process images with figure syntax
  htmlString = htmlString.replace(
    /<p><img src="([^"]+)" alt="([^"]+)">\s*\{#fig:([^}]+)\}<\/p>/g,
    (_match, src, alt, id) => {
      const figNum = figureRefs.get(id) || ++figureCounter;
      // Check if alt text starts with "Figure:" to use as caption
      const caption = alt.startsWith('Figure:') ? alt.substring(7).trim() : alt;
      return `<figure class="figure-container" id="fig-${id}">
        <img src="${src}" alt="${alt}" />
        <figcaption><strong>Figure ${figNum}:</strong> ${caption}</figcaption>
      </figure>`;
    }
  );

  // Replace figure references
  htmlString = htmlString.replace(/\{@fig:([^}]+)\}/g, (match, id) => {
    const figNum = figureRefs.get(id);
    if (figNum) {
      return `<a href="#fig-${id}" class="figure-ref">Figure ${figNum}</a>`;
    }
    return match;
  });

  return htmlString;
}

export default async function markdownToHtml(markdown: string) {
  // Pre-process to preserve math delimiters using placeholders
  let processedMarkdown = preserveMathDelimiters(markdown);

  // Process annotations BEFORE remark to avoid conflicts
  processedMarkdown = processAnnotations(processedMarkdown);

  const result = await remark().use(html).process(processedMarkdown);
  let htmlString = result.toString();

  // Restore math delimiters FIRST, before any other processing
  htmlString = restoreMathDelimiters(htmlString);

  // Post-process transformations
  htmlString = processSuperscript(htmlString);
  htmlString = processColoredText(htmlString);
  htmlString = processFigures(markdown, htmlString);
  htmlString = postProcessAnnotations(htmlString);

  return htmlString;
}