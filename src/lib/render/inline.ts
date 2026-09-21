// Inline transformations applied to remark's HTML: caption links and coloured text.

import { COLOR_PATTERN, colorFor } from "../post-syntax";

// Process URLs in captions to make them clickable
export function processCaptionLinks(caption: string): string {
  // First decode HTML entities that might have been encoded
  let processed = caption
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/&lbrack;/g, '[')
    .replace(/&rbrack;/g, ']')
    .replace(/&lpar;/g, '(')
    .replace(/&rpar;/g, ')');

  // Convert markdown links [text](url) to anchor tags
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Convert bare URLs (not already in anchor tags) to clickable links
  // Match URLs that aren't preceded by href=" or already wrapped
  processed = processed.replace(
    /(?<!href="|>)(https?:\/\/[^\s<>)"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Convert inline code backticks to <code> tags. Image alt text passes through
  // remark as a literal string, so backticks aren't converted upstream.
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

  return processed;
}

// Process colored text with syntax {{color:text}}; an unknown colour name stays literal
export function processColoredText(htmlString: string): string {
  return htmlString.replace(COLOR_PATTERN, (match, colorName, text) => {
    const color = colorFor(colorName);
    return color ? `<span style="color: ${color}; font-weight: bold;">${text}</span>` : match;
  });
}
