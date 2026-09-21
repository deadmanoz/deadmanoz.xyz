// Block directives rendered from remark's paragraphs: :::collapse and :::alert.

import { ALERT_OPENER_SOURCE, COLLAPSE_OPENER_SOURCE } from "../post-syntax";

// Process collapsible sections with syntax :::collapse{Title} content :::
// Optional custom anchor id via :::collapse{Title}{#anchor-id} content :::
export function processCollapsibleSections(htmlString: string): string {
  let collapsibleCounter = 0;

  // Pattern matches how remark processes the markdown: <p>:::collapse{Title} followed by content until :::
  // The optional {#anchor-id} immediately after {Title} sets a stable anchor; otherwise the auto-generated collapse-N id is used.
  // The opener (title with one nested brace pair for a {@fig:id} or {@tab:id} reference,
  // optional {#anchor}) is shared with the feed converter through post-syntax.ts.
  const pattern = new RegExp(`<p>${COLLAPSE_OPENER_SOURCE}([^]*?):::</p>`, "g");

  return htmlString.replace(pattern, (_match, rawTitle, customId, content) => {
    collapsibleCounter++;
    const id = customId || `collapse-${collapsibleCounter}`;
    // Figure and table references in the title have already become links by this point.
    // A link inside <summary> would both toggle the block and navigate, so keep only its
    // text ("Figure 9"), which gives the block an automatically numbered title.
    const title = rawTitle.replace(/<a href="#[^"]*" class="(?:figure|table)-ref">([^<]*)<\/a>/g, '$1');

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

// Process alert boxes with syntax :::alert{type} content :::
export function processAlertBoxes(htmlString: string): string {
  let alertCounter = 0;

  // Pattern matches how remark processes the markdown: <p>:::alert{type} followed by content until :::
  const pattern = new RegExp(`<p>${ALERT_OPENER_SOURCE}([^]*?):::</p>`, "g");

  return htmlString.replace(pattern, (_match, type, content) => {
    alertCounter++;
    const id = `alert-${alertCounter}`;

    // Validate alert type
    const validTypes = ['info', 'warning', 'success', 'danger'];
    const alertType = validTypes.includes(type.toLowerCase()) ? type.toLowerCase() : 'info';

    // Map types to icons
    const iconMap: Record<string, string> = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'success': '✓',
      'danger': '⨯'
    };

    const icon = iconMap[alertType];

    // Process the content to convert paragraph breaks properly
    const processedContent = content.trim()
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    return `<div class="alert-box alert-${alertType}" id="${id}">
      <div class="alert-icon">${icon}</div>
      <div class="alert-content">${processedContent}</div>
    </div>`;
  });
}
