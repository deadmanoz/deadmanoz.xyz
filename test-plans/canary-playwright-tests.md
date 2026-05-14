# Canary Playwright Test Plan

The `hello-world` post is the canonical canary: every markdown transformation and rendering feature appears there at least once.
These tests assert the rendered DOM structure for each feature group, so any regression in the markdown pipeline or post-render layout surfaces as a failing assertion.

## Scope

- Target: `/posts/hello-world`
- Browser: Chromium (Desktop Chrome viewport)
- Server: local dev server (`npm run dev`) booted by Playwright `webServer`
- Assertions: DOM structure only — element presence, attribute values, accessible names. No waits on third-party scripts (MathJax/Plotly) settling.

## Scenarios

### 1. Math rendering markers

**Objective:** verify the markdown pipeline emits the placeholder spans/divs that MathJax expects.
We do not assert text content because MathJax replaces the original delimiter text with rendered DOM client-side, which races our queries.

**Steps:**
1. Navigate to `/posts/hello-world`.
2. Wait for the article to load.

**Assertions:**
- At least one `span.math-inline` is attached to the DOM.
- At least one `div.math-display` is attached to the DOM.

### 2. Inline formatting

**Objective:** verify superscript, strikethrough, and the coloured-text mapping render and unknown colours fall through.

**Assertions:**
- `sup` element containing `2` exists (from H^2^O).
- `del` element containing `deprecated wording` exists.
- A span with inline style `color: #00D9FF` exists (cyan).
- The literal text `{{neonpurple:this}}` appears verbatim in the article.

### 3. Image figure with rich caption

**Objective:** verify the inline-code, markdown-link, and bare-URL transformations inside an image figure caption.

**Assertions:**
- `figure#fig-sample` exists with an `img` and a `figcaption`.
- The figcaption begins with `Figure 1:`.
- The figcaption contains a `code` element with text `aux_target`.
- The figcaption contains `a[href="https://example.com/home"]` with text `link` (the link text inside the alt-text markdown).
- The figcaption contains `a[href="https://example.com/bare"]` (the bare-URL anchor).

### 4. Table with caption and cross-reference

**Objective:** verify table captions are wired and `{@tab:id}` resolves.

**Assertions:**
- `div.table-container#tab-frontmatter` exists.
- The table caption contains the text `Table 1:`.
- A `a.table-ref[href="#tab-frontmatter"]` with text `Table 1` exists elsewhere in the article.

### 5. Annotations (tooltips)

**Objective:** verify `[[text||tooltip]]` annotations render with the tooltip in `data-tooltip` and that the tooltip itself can contain markdown links, math, and inline code.

**Assertions:**
- Exactly 7 elements with class `annotation` exist (basic, link-in-tooltip, math-in-tooltip, code-in-display, italic-in-display, bold-in-display, plus one embedded inside an `:::alert{success}` block).
- An annotation with `data-tooltip` equal to `A Peer-to-Peer Electronic Cash System` exists.
- An annotation exists whose `data-tooltip` matches `<a [^>]*github\.com/bitcoin/bips`.
- An annotation exists whose `data-tooltip` matches `<span [^>]*math-inline`.
- An annotation exists whose direct child is a `code` element with text `getblocktemplate`.
- An annotation exists whose direct child is an `em` element with text `side mask`.
- An annotation exists whose direct child is a `strong` element with text `critical`.

### 6. Collapsibles

**Objective:** verify both auto-id and custom-anchor collapsibles render as `<details>` blocks.

**Assertions:**
- `details.collapsible-section#collapse-1` exists with a `summary` containing `Historical Context`.
- `details.collapsible-section#stable-anchor-demo` exists (custom anchor).

### 7. Code blocks

**Objective:** verify fenced code blocks are highlighted by `rehype-highlight`.

**Assertions:**
- A `pre > code.language-ts` (or `code.hljs.language-ts`) element exists containing the text `squarePlusOne`.

### 8. Alert boxes

**Objective:** verify each alert variant renders with the correct CSS class.

**Assertions:**
- One element with class `alert-box alert-info` exists.
- One element with class `alert-box alert-warning` exists.
- One element with class `alert-box alert-success` exists.
- One element with class `alert-box alert-danger` exists.

### 9. Plots — inline, caption + figid, cross-reference

**Objective:** verify `:::plot{id}` blocks render the plot container div, that a captioned plot joins the figure numbering, and that `{@fig:}` references resolve.

**Assertions:**
- `div.interactive-plot-container[data-plot-id="plot-hashrate"]` exists.
- `figure#fig-hashrate` contains the hashrate plot div and a figcaption starting with `Figure 2:`.
- `a.figure-ref[href="#fig-hashrate"]` with text `Figure 2` exists.

### 10. Plot with external `src=`

**Objective:** verify the `src="..."` plot attribute reaches `data-plot-data` as a JSON pointer.

**Assertions:**
- `div.interactive-plot-container[data-plot-id="plot-external"]` exists.
- Its `data-plot-data` attribute contains the substring `"src":"/assets/blog/hello-world/sample-plot.json"` (HTML-encoded).
- `figure#fig-external` exists with figcaption starting with `Figure 3:`.

### 11. Plot with timeline annotations

**Objective:** verify `annotations="..."` flows through as `annotationsSrc` in `data-plot-data`.

**Assertions:**
- `div.interactive-plot-container[data-plot-id="plot-annotated"]` is attached (existence check only — the bare container can have zero height until Plotly hydrates it client-side).
- Its `data-plot-data` attribute contains the substring `"annotationsSrc":"/assets/blog/hello-world/sample-annotations.json"`.

### 12. Image modal renders the figcaption (not raw alt text)

**Objective:** verify clicking a figure image opens the image modal, that the modal renders the figure's `<figcaption>` HTML (with `Figure N:` prefix, anchor tags for links, and `<code>` for inline code) rather than the raw `<img alt>` attribute, and that Escape closes it.

**Assertions:**
- After clicking `figure#fig-sample img`, an element with class `modal-figcaption` is visible.
- The caption contains the text `Figure 1:`.
- The caption contains `a[href="https://example.com/home"]` (a real anchor element, not literal markdown).
- The caption contains a `code` element with text `aux_target`.
- Pressing Escape removes the caption from the DOM.

**A11y assertions (separate test cases):**
- The modal exposes `[role="dialog"][aria-modal="true"]` with a non-empty `aria-label`.
- Focus moves to the close button (`button[aria-label="Close image preview"]`) when the modal opens.
- Tab is trapped inside the modal: cycling through every focusable descendant returns focus to the close button.
- On Escape, focus returns to the originating `<img>` element that opened the modal.

### 13. Reading-time estimate

**Objective:** verify the post header surfaces an `N min read` reading-time estimate derived from the post body via `src/lib/reading-time.ts`.

**Assertions:**
- Some element on the page is visible whose text matches `/\d+\s*min read/`.

### 14. Internal vs external link styling

**Objective:** verify the palette distinguishes internal links (in-site nav, cross-refs, heading anchors) from external links via the `--theme-link` vs `--theme-link-external` CSS variables, and that code wrapped in a link inherits the parent's hue. The split is by hue (cyan vs green).

**Assertions:**
- An internal cross-ref link (`a.figure-ref[href="#fig-sample"]`) has `getComputedStyle(...).color === "rgb(0, 160, 208)"` (neon cyan `#00A0D0`).
- An external link (`a[href^="https://example.com"]`) has `getComputedStyle(...).color === "rgb(32, 229, 22)"` (neon green `#20E516`).
- A `code` inside an external link (`a[href="https://example.com/code-link"] code`) inherits the neon green hue (same RGB as the external case above).
