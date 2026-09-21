// Per-render state shared by the passes in this directory.

/**
 * Per-render state carried from the pre-remark passes to the post-remark ones.
 *
 * Each render creates its own context. Module-level stores would be shared by
 * concurrent renders (Next prerenders several pages at once) and these maps are
 * read back after awaiting remark, so shared state could be cleared by another
 * post mid-render.
 */
export interface RenderContext {
  /** Markdown links in image alt text, shielded from remark by placeholder. */
  imageAltLinks: Map<string, { text: string; url: string }>;
  /**
   * Inline code in image alt text. Remark stringifies alt-text inline content to
   * plain text, which strips backticks, so it is shielded and restored before
   * caption post-processing.
   */
  imageAltCode: Map<string, string>;
  /** Hover annotations, keyed by placeholder id. */
  annotations: Map<string, { text: string; tooltip: string }>;
  /** Plot blocks, keyed by placeholder id. */
  plots: Map<string, { data: string; caption?: string; figId?: string }>;
}

export function createRenderContext(): RenderContext {
  return {
    imageAltLinks: new Map(),
    imageAltCode: new Map(),
    annotations: new Map(),
    plots: new Map(),
  };
}
