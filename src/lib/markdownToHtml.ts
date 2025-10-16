import { remark } from "remark";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";

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

// Custom function to handle strikethrough syntax ~~text~~ - avoid math content
function processStrikethrough(htmlString: string): string {
  // Split the string by math spans to avoid processing inside them
  const parts = htmlString.split(/(<(?:div class="math-display"|span class="math-inline")>.*?<\/(?:div|span)>)/);

  return parts.map((part, index) => {
    // Only process non-math parts (even indices in the split array)
    if (index % 2 === 0 && !part.includes('class="math-')) {
      return part.replace(/~~([^~]+)~~/g, '<del>$1</del>');
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
  // Match everything until we find \) (the closing delimiter), not just any )
  processed = processed.replace(/\\\((.*?)\\\)/g, (_match, math) => {
    return `MATH_INLINE_START${math}MATH_INLINE_END`;
  });

  return processed;
}

// Restore math placeholders back to proper HTML after remark processing
function restoreMathDelimiters(htmlString: string): string {
  // Helper to decode HTML entities in math expressions
  const decodeHtmlEntities = (text: string): string => {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&percnt;/g, '%')
      .replace(/&#37;/g, '%');
  };

  // Restore display math placeholders - use non-greedy match until END marker
  let processed = htmlString.replace(/MATH_DISPLAY_START(.*?)MATH_DISPLAY_END/g, (_match, math) => {
    const decodedMath = decodeHtmlEntities(math);
    return `<div class="math-display">\\[${decodedMath}\\]</div>`;
  });

  // Restore inline math placeholders - use non-greedy match until END marker
  processed = processed.replace(/MATH_INLINE_START(.*?)MATH_INLINE_END/g, (_match, math) => {
    const decodedMath = decodeHtmlEntities(math);
    return `<span class="math-inline">\\(${decodedMath}\\)</span>`;
  });

  return processed;
}

// Store annotation data globally for processing
const annotationStore = new Map<string, { text: string; tooltip: string }>();

// Process annotations before remark to handle markdown in tooltips
function processAnnotations(markdownString: string): string {
  let counter = 0;
  annotationStore.clear(); // Clear previous annotations

  // Process [[text||tooltip]] pattern in markdown
  return markdownString.replace(/\[\[([^\|\]]+)\|\|([^\]]+)\]\]/g, (match, text, tooltip) => {
    counter++;
    const id = `annotation-${counter}`;

    // Store the annotation data
    annotationStore.set(id, { text, tooltip });

    // Use a simple placeholder that won't be processed by remark
    return `ANNOTATION_PLACEHOLDER_${id}`;
  });
}

// Post-process annotations after remark HTML conversion
async function postProcessAnnotations(htmlString: string): Promise<string> {
  let processed = htmlString;

  // Process each stored annotation
  for (const [id, data] of annotationStore.entries()) {
    const placeholder = `ANNOTATION_PLACEHOLDER_${id}`;

    if (processed.includes(placeholder)) {
      // Pre-process tooltip markdown with math delimiters
      let tooltipMarkdown = preserveMathDelimiters(data.tooltip);

      // Process tooltip content as markdown to HTML
      const tooltipResult = await remark()
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(tooltipMarkdown);

      let tooltipHtml = tooltipResult.toString();

      // Apply all post-processing transformations to tooltip content
      tooltipHtml = restoreMathDelimiters(tooltipHtml);
      tooltipHtml = processSuperscript(tooltipHtml);
      tooltipHtml = processStrikethrough(tooltipHtml);
      tooltipHtml = processColoredText(tooltipHtml);

      // Remove wrapping <p> tags if present and trim
      tooltipHtml = tooltipHtml.replace(/^<p>|<\/p>$/g, '').trim();

      // Only escape quotes (not HTML entities) for HTML attribute
      // We need to preserve HTML tags like <span> for styled content
      const escapedTooltip = tooltipHtml.replace(/"/g, '&quot;');

      // Replace placeholder with annotation span
      const annotationSpan = `<span class="annotation" data-tooltip="${escapedTooltip}" id="${id}" tabindex="0" role="button" aria-describedby="tooltip-${id}">${data.text}</span>`;

      processed = processed.replace(placeholder, annotationSpan);
    }
  }

  return processed;
}

// Process collapsible sections with syntax :::collapse{Title} content :::
function processCollapsibleSections(htmlString: string): string {
  let collapsibleCounter = 0;

  // Pattern matches how remark processes the markdown: <p>:::collapse{Title} followed by content until :::
  const pattern = /<p>:::collapse\{([^}]+)\}([^]*?):::<\/p>/g;

  return htmlString.replace(pattern, (_match, title, content) => {
    collapsibleCounter++;
    const id = `collapse-${collapsibleCounter}`;

    // Process the content to convert paragraph breaks properly
    const processedContent = content.trim()
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    return `<details class="collapsible-section" id="${id}">
      <summary class="collapsible-title">${title}</summary>
      <div class="collapsible-content">${processedContent}</div>
    </details>`;
  });
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

// Process tables with captions and automatic numbering
function processTables(markdown: string, htmlString: string): string {
  let tableCounter = 0;
  const tableRefs = new Map<string, number>();

  // First pass: Find all table definitions in markdown and create mapping
  const tablePattern = /\{#tab:([^}]+)\}/g;
  let match;
  while ((match = tablePattern.exec(markdown)) !== null) {
    const id = match[1];
    if (!tableRefs.has(id)) {
      tableRefs.set(id, ++tableCounter);
    }
  }

  // Handle tables with captions (table followed by caption text and ID) - do this first
  htmlString = htmlString.replace(
    /(<table>[\s\S]*?<\/table>)\s*<p>([^{]*?)\s*\{#tab:([^}]+)\}<\/p>/g,
    (_match, tableHtml, caption, id) => {
      const tableNum = tableRefs.get(id) || ++tableCounter;
      const cleanCaption = caption.trim();
      return `<div class="table-container" id="tab-${id}">
        ${tableHtml}
        <div class="table-caption">
          <strong>Table ${tableNum}:</strong> ${cleanCaption}
        </div>
      </div>`;
    }
  );

  // Process tables with just ID syntax - wrap in container like figures
  htmlString = htmlString.replace(
    /(<table>[\s\S]*?<\/table>)\s*<p>\{#tab:([^}]+)\}<\/p>/g,
    (_match, tableHtml, id) => {
      const tableNum = tableRefs.get(id) || ++tableCounter;
      return `<div class="table-container" id="tab-${id}">
        ${tableHtml}
        <div class="table-caption">
          <strong>Table ${tableNum}</strong>
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

export default async function markdownToHtml(markdown: string) {
  // Pre-process to preserve math delimiters using placeholders
  let processedMarkdown = preserveMathDelimiters(markdown);

  // Process annotations BEFORE remark to avoid conflicts
  processedMarkdown = processAnnotations(processedMarkdown);

  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(processedMarkdown);
  let htmlString = result.toString();

  // Restore math delimiters FIRST, before any other processing
  htmlString = restoreMathDelimiters(htmlString);

  // Post-process transformations
  htmlString = processSuperscript(htmlString);
  htmlString = processStrikethrough(htmlString);
  htmlString = processColoredText(htmlString);
  htmlString = processFigures(markdown, htmlString);
  htmlString = processTables(markdown, htmlString);
  htmlString = processCollapsibleSections(htmlString);
  htmlString = await postProcessAnnotations(htmlString);

  return htmlString;
}