// Shield Markdown links and inline code inside image alt text from remark, and restore them afterwards.

import type { RenderContext } from "./context";

// Preserve markdown links in image alt text before remark processes them
export function preserveImageAltLinks(markdownString: string, ctx: RenderContext): string {
  let linkCounter = 0;
  let codeCounter = 0;
  let result = '';
  let i = 0;

  while (i < markdownString.length) {
    // Look for image start: ![
    if (markdownString[i] === '!' && markdownString[i + 1] === '[') {
      // Find the matching ] for the alt text by counting brackets
      let bracketDepth = 1;
      const altStart = i + 2;
      let altEnd = altStart;

      while (altEnd < markdownString.length && bracketDepth > 0) {
        if (markdownString[altEnd] === '[') bracketDepth++;
        else if (markdownString[altEnd] === ']') bracketDepth--;
        if (bracketDepth > 0) altEnd++;
      }

      // Check if followed by (src)
      if (altEnd < markdownString.length && markdownString[altEnd] === ']' && markdownString[altEnd + 1] === '(') {
        // Find the closing ) for the src
        const srcStart = altEnd + 2;
        let srcEnd = srcStart;
        let parenDepth = 1;

        while (srcEnd < markdownString.length && parenDepth > 0) {
          if (markdownString[srcEnd] === '(') parenDepth++;
          else if (markdownString[srcEnd] === ')') parenDepth--;
          if (parenDepth > 0) srcEnd++;
        }

        if (srcEnd < markdownString.length && markdownString[srcEnd] === ')') {
          // We have a complete image: ![alt](src)
          let alt = markdownString.slice(altStart, altEnd);
          const src = markdownString.slice(srcStart, srcEnd);

          // Replace markdown links in alt text with placeholders
          alt = alt.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_linkMatch: string, linkText: string, linkUrl: string) => {
            linkCounter++;
            const placeholder = `IMGALT_LINK_${linkCounter}`;
            ctx.imageAltLinks.set(placeholder, { text: linkText, url: linkUrl });
            return placeholder;
          });

          // Replace inline code in alt text with placeholders
          alt = alt.replace(/`([^`]+)`/g, (_codeMatch: string, codeText: string) => {
            codeCounter++;
            const placeholder = `IMGALT_CODE_${codeCounter}`;
            ctx.imageAltCode.set(placeholder, codeText);
            return placeholder;
          });

          result += `![${alt}](${src})`;
          i = srcEnd + 1;
          continue;
        }
      }
    }

    result += markdownString[i];
    i++;
  }

  return result;
}

// Restore preserved links in image alt text (after HTML generation)
export function restoreImageAltLinks(htmlString: string, ctx: RenderContext): string {
  let processed = htmlString;

  // Use a negative-lookahead on digits (not a word boundary) on the right
  // side: prevents IMGALT_LINK_1 / IMGALT_CODE_1 from matching the prefix of
  // their *_10/_11/_12 siblings, while still allowing the placeholder to be
  // followed by letters or punctuation (e.g. `IMGALT_CODE_47s` for a plural
  // form like `` `scriptPubKey`s ``).
  for (const [placeholder, { text, url }] of ctx.imageAltLinks.entries()) {
    processed = processed.replace(new RegExp(`${placeholder}(?!\\d)`, "g"), `[${text}](${url})`);
  }

  for (const [placeholder, codeText] of ctx.imageAltCode.entries()) {
    processed = processed.replace(new RegExp(`${placeholder}(?!\\d)`, "g"), `\`${codeText}\``);
  }

  return processed;
}
