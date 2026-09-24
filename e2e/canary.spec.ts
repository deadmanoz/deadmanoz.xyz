import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/posts/hello-world");
  await page.waitForLoadState("domcontentloaded");
});

test.describe("canary — math rendering", () => {
  // Note: MathJax replaces the original delimiter text with rendered markup
  // client-side. We assert the container elements exist (so the pipeline emitted
  // them); the post-render text content is MathJax's concern.
  test("inline and display math placeholders are emitted by the pipeline", async ({ page }) => {
    await expect(page.locator("span.math-inline").first()).toBeAttached();
    await expect(page.locator("div.math-display").first()).toBeAttached();
    await expect(page.locator("span.math-inline")).not.toHaveCount(0);
    await expect(page.locator("div.math-display")).not.toHaveCount(0);
  });
});

test.describe("canary — inline formatting", () => {
  test("superscript, strikethrough, and the colour map render", async ({ page }) => {
    await expect(page.locator("sup", { hasText: "2" }).first()).toBeVisible();
    await expect(
      page.locator("del", { hasText: "deprecated wording" }),
    ).toHaveCount(1);
    const cyan = page.locator("span.ink-cyan");
    await expect(cyan.first()).toBeVisible();
  });

  test("unknown colour names fall through as literal text", async ({ page }) => {
    await expect(page.getByText("{{neonpurple:this}}")).toBeVisible();
  });
});

test.describe("canary — image figure with rich caption", () => {
  test("figure container, img, and a Figure 1 caption render", async ({ page }) => {
    const fig = page.locator("figure#fig-sample");
    await expect(fig).toBeVisible();
    await expect(fig.locator("img")).toHaveAttribute("src", /bitcoin_knight\.png$/);
    await expect(fig.locator("figcaption")).toContainText("Figure 1:");
  });

  test("caption preserves inline code, markdown links, and bare URLs", async ({ page }) => {
    const caption = page.locator("figure#fig-sample figcaption");
    await expect(caption.locator("code", { hasText: "aux_target" })).toHaveCount(1);
    await expect(
      caption.locator('a[href="https://example.com/home"]', { hasText: "link" }),
    ).toHaveCount(1);
    await expect(
      caption.locator('a[href="https://example.com/bare"]'),
    ).toHaveCount(1);
  });

  test("{@fig:sample} resolves to a clickable Figure 1 reference", async ({ page }) => {
    await expect(
      page.locator('a.figure-ref[href="#fig-sample"]', { hasText: "Figure 1" }),
    ).toHaveCount(1);
  });
});

test.describe("canary — image modal", () => {
  test("clicking a figure image opens a modal with the rendered figcaption (not raw alt text)", async ({ page }) => {
    await page.locator('figure#fig-sample img').click();
    const caption = page.locator(".modal-figcaption");
    await expect(caption).toBeVisible();
    await expect(caption).toContainText("Figure 1:");
    // Modal renders the figcaption HTML, so a markdown link is a real <a>, not '[...]' text:
    await expect(
      caption.locator('a[href="https://example.com/home"]'),
    ).toHaveCount(1);
    await expect(caption.locator("code", { hasText: "aux_target" })).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(caption).toHaveCount(0);
  });

  test("modal exposes a dialog role with an accessible name for screen readers", async ({ page }) => {
    await page.locator('figure#fig-sample img').click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();
    const name = await dialog.getAttribute("aria-label");
    expect(name && name.length).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
  });

  test("focus moves to the close button when the modal opens", async ({ page }) => {
    await page.locator('figure#fig-sample img').click();
    const close = page.locator('button[aria-label="Close image preview"]');
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
  });

  test("Tab is trapped inside the modal (cycles back to close button after the last link)", async ({ page }) => {
    await page.locator('figure#fig-sample img').click();
    const close = page.locator('button[aria-label="Close image preview"]');
    await expect(close).toBeFocused();

    // Tab through every focusable descendant; the last Tab should wrap back
    // to the close button rather than escape into the page below.
    const focusableCount = await page
      .locator('[role="dialog"] a, [role="dialog"] button')
      .count();
    for (let i = 0; i < focusableCount; i++) {
      await page.keyboard.press("Tab");
    }
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
  });

  test("focus returns to the originating image when the modal closes", async ({ page }) => {
    const img = page.locator('figure#fig-sample img');
    // Wait for the deferred useEffect to set tabindex on the image.
    await expect(img).toHaveAttribute("tabindex", "0");
    await img.click();
    // Confirm the modal actually opened before pressing Escape.
    await expect(page.locator(".modal-figcaption")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(img).toBeFocused();
  });
});

test.describe("canary — reading time", () => {
  test("post header shows an 'N min read' estimate next to the date", async ({ page }) => {
    // Locate any element on the page containing the 'min read' suffix and
    // verify it sits in the post header region (sibling to the <time>).
    await expect(
      page.getByText(/\d+\s*min read/),
    ).toBeVisible();
  });
});

test.describe("canary — internal vs external link styling", () => {
  test("internal anchor links resolve to neon cyan --theme-link", async ({ page }) => {
    const internal = page.locator('a.figure-ref[href="#fig-sample"]').first();
    const color = await internal.evaluate(
      (el) => getComputedStyle(el).color,
    );
    expect(color).toBe("rgb(0, 160, 208)");
  });

  test("external links resolve to the full neon green --theme-link-external", async ({ page }) => {
    const external = page
      .locator('a[href^="https://example.com"]')
      .first();
    const color = await external.evaluate(
      (el) => getComputedStyle(el).color,
    );
    expect(color).toBe("rgb(32, 229, 22)");
  });

  test("code wrapped in an external link inherits the neon green shade", async ({ page }) => {
    const code = page
      .locator('a[href="https://example.com/code-link"] code')
      .first();
    await expect(code).toHaveCount(1);
    const color = await code.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(32, 229, 22)");
  });
});

test.describe("canary — tables", () => {
  test("table is wrapped in a container with a numbered caption", async ({ page }) => {
    const tab = page.locator("div.table-container#tab-frontmatter");
    await expect(tab).toBeVisible();
    await expect(tab).toContainText("Table 1:");
  });

  test("{@tab:frontmatter} resolves to a clickable Table 1 reference", async ({ page }) => {
    await expect(
      page.locator('a.table-ref[href="#tab-frontmatter"]', { hasText: "Table 1" }),
    ).toHaveCount(1);
  });

  test("clicking a column header sorts, reverses, then restores source order", async ({ page }) => {
    const table = page.locator("div.table-container#tab-frontmatter table");
    const fieldHeader = table.locator("thead th").first();
    const sortButton = fieldHeader.locator("button.table-sort");
    const firstColumn = table.locator("tbody tr td:first-child");

    await expect(sortButton).toBeVisible();
    await expect(firstColumn).toHaveText(["title", "date", "status"]);

    await sortButton.click();
    await expect(fieldHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(firstColumn).toHaveText(["date", "status", "title"]);

    await sortButton.click();
    await expect(fieldHeader).toHaveAttribute("aria-sort", "descending");
    await expect(firstColumn).toHaveText(["title", "status", "date"]);

    await sortButton.click();
    await expect(fieldHeader).toHaveAttribute("aria-sort", "none");
    await expect(firstColumn).toHaveText(["title", "date", "status"]);
  });
});

test.describe("canary — annotations", () => {
  test("all annotation spans render across the canary (count covers basic, link-in-tooltip, math-in-tooltip, code-in-display, italic-in-display, bold-in-display, plus one inside an alert)", async ({ page }) => {
    await expect(page.locator("span.annotation")).toHaveCount(7);
  });

  test("a tooltip preserves a plain-text definition", async ({ page }) => {
    await expect(
      page.locator(
        'span.annotation[data-tooltip="A Peer-to-Peer Electronic Cash System"]',
      ),
    ).toHaveCount(1);
  });

  test("a tooltip contains an embedded markdown link", async ({ page }) => {
    await expect(
      page.locator(
        '.annotation-tooltip a[href="https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki"]',
      ),
    ).toHaveCount(1);
  });

  test("a tooltip link remains interactive for pointer and keyboard users", async ({ page }) => {
    const annotation = page.locator("span.annotation", { hasText: "BIP 22" });
    const tooltip = annotation.locator(".annotation-tooltip");
    const link = tooltip.locator(
      'a[href="https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki"]',
    );

    await annotation.hover();
    await expect(tooltip).toBeVisible();
    await link.hover();
    await expect(link).toHaveCSS("pointer-events", "auto");

    await annotation.focus();
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    await expect(tooltip).toBeVisible();

    await page.route(
      "https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki",
      (route) => route.fulfill({ contentType: "text/html", body: "linked" }),
    );
    await link.click();
    await expect(page).toHaveURL(
      "https://github.com/bitcoin/bips/blob/master/bip-0022.mediawiki",
    );
  });

  test("a tooltip contains embedded math markup", async ({ page }) => {
    await expect(
      page.locator("span.annotation .annotation-tooltip span.math-inline"),
    ).toHaveCount(2);
  });

  test("an annotation display text renders inline code", async ({ page }) => {
    await expect(
      page.locator("span.annotation > code", { hasText: "getblocktemplate" }),
    ).toHaveCount(1);
  });

  test("annotation display text renders italics and bold", async ({ page }) => {
    await expect(
      page.locator("span.annotation > em", { hasText: "side mask" }),
    ).toHaveCount(1);
    await expect(
      page.locator("span.annotation > strong", { hasText: "critical" }),
    ).toHaveCount(1);
  });
});

test.describe("canary — collapsibles", () => {
  test("the auto-id collapse renders as <details id='collapse-1'>", async ({ page }) => {
    const auto = page.locator("details.collapsible-section#collapse-1");
    await expect(auto).toBeVisible();
    await expect(auto.locator("summary")).toContainText("Historical Context");
  });

  test("the custom-anchor collapse uses the supplied id", async ({ page }) => {
    await expect(
      page.locator("details.collapsible-section#stable-anchor-demo"),
    ).toBeVisible();
  });

  test("a figure inside a collapse is numbered in document order", async ({ page }) => {
    const fig = page.locator("details#folded-figure-demo figure#fig-folded");
    await expect(fig).toBeAttached();
    await expect(fig.locator("figcaption")).toContainText("Figure 4:");
    await expect(page.locator("details#folded-figure-demo summary")).toHaveText("Figure 4: folded canary image");
  });

  test("clicking a {@fig} reference into a closed collapse opens it and shows the figure", async ({ page }) => {
    const details = page.locator("details#folded-figure-demo");
    await expect(details).toHaveJSProperty("open", false);
    await expect(page.locator("figure#fig-folded img")).toBeHidden();

    await page.locator('a.figure-ref[href="#fig-folded"]').click();

    await expect(details).toHaveJSProperty("open", true);
    await expect(page.locator("figure#fig-folded img")).toBeVisible();
  });
});

test.describe("canary — code blocks", () => {
  test("a fenced ts block is highlighted by rehype-highlight", async ({ page }) => {
    await expect(
      page.locator(
        'pre > code.language-ts, pre > code.hljs.language-ts',
        { hasText: "squarePlusOne" },
      ),
    ).toHaveCount(1);
  });
});

test.describe("canary — alert boxes", () => {
  const variants = ["info", "warning", "success", "danger"] as const;
  for (const variant of variants) {
    test(`renders an alert-${variant} box`, async ({ page }) => {
      await expect(
        page.locator(`div.alert-box.alert-${variant}`),
      ).toHaveCount(1);
    });
  }
});

test.describe("canary — plots", () => {
  test("the inline-JSON plot is wrapped in a figure with Figure 2 caption", async ({ page }) => {
    const fig = page.locator("figure#fig-hashrate");
    await expect(fig).toBeVisible();
    await expect(
      fig.locator('div.interactive-plot-container[data-plot-id="plot-hashrate"]'),
    ).toHaveCount(1);
    await expect(fig.locator("figcaption")).toContainText("Figure 2:");
  });

  test("{@fig:hashrate} resolves to a clickable Figure 2 reference", async ({ page }) => {
    await expect(
      page.locator('a.figure-ref[href="#fig-hashrate"]', { hasText: "Figure 2" }),
    ).toHaveCount(1);
  });

  test("the external-src plot carries the src in data-plot-data", async ({ page }) => {
    const fig = page.locator("figure#fig-external");
    await expect(fig).toBeVisible();
    const plot = fig.locator(
      'div.interactive-plot-container[data-plot-id="plot-external"]',
    );
    await expect(plot).toHaveCount(1);
    const data = await plot.getAttribute("data-plot-data");
    expect(data).toContain('"src":"/assets/blog/hello-world/sample-plot.json"');
    await expect(fig.locator("figcaption")).toContainText("Figure 3:");
  });

  test("the annotated plot carries the annotations source as annotationsSrc", async ({ page }) => {
    const plot = page.locator(
      'div.interactive-plot-container[data-plot-id="plot-annotated"]',
    );
    // Use toHaveCount rather than toBeVisible: the container may have zero
    // size until Plotly hydrates it, but the markdown pipeline has done its
    // job once the element + data attribute are in the DOM.
    await expect(plot).toHaveCount(1);
    const data = await plot.getAttribute("data-plot-data");
    expect(data).toContain(
      '"annotationsSrc":"/assets/blog/hello-world/sample-annotations.json"',
    );
  });
});

test.describe("canary — table of contents", () => {
  test("entries take the same colour as the heading has in the post body", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const heading of ["This is", "A nested", "Table-of-contents"]) {
      await page.getByRole("button", { name: `Expand ${heading}`, exact: true }).click();
    }
    const entry = (name: string) => page.getByRole("button", { name, exact: true }).first();
    const colorOf = (name: string) => entry(name).evaluate((el) => getComputedStyle(el).color);

    await expect(entry("Deeper still")).toBeVisible();
    expect(await colorOf("A nested")).toBe("rgb(255, 108, 17)"); // h2: neon orange
    expect(await colorOf("Table-of-contents")).toBe("rgb(0, 160, 208)"); // h3: neon cyan
    expect(await colorOf("Deeper still")).toBe("rgb(32, 229, 22)"); // h4: neon green
  });
});

function isPaperBackground(color: string) {
  const normalized = color.replace(/\s/g, "").toLowerCase();
  return normalized === "#f3efe4" || normalized === "rgb(243,239,228)";
}

test.describe("canary — paper theme", () => {
  test("?theme=paper sets the attribute and a paper background", async ({ page }) => {
    await page.goto("/posts/hello-world?theme=paper");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(isPaperBackground(background)).toBe(true);
  });

  test("a query-free toggle selects paper, restyles a mounted plot, and survives reload", async ({ page }) => {
    await page.goto("/posts/hello-world");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "paper");
    await page.getByRole("button", { name: "Paper theme" }).click();
    await expect(page.getByRole("button", { name: "Paper theme" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
    expect(page.url()).not.toContain("theme=");
    await page.waitForFunction(() => {
      const plot = document.getElementById("plot-hashrate") as HTMLElement & {
        _fullLayout?: { paper_bgcolor?: string };
      };
      const color = (plot?._fullLayout?.paper_bgcolor ?? "").replace(/\s/g, "").toLowerCase();
      return color === "#f3efe4" || color === "rgb(243,239,228)";
    });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
  });

  test("toggling back to synthwave restores plot chrome", async ({ page }) => {
    await page.goto("/posts/hello-world");
    await page.getByRole("button", { name: "Paper theme" }).click();
    await page.getByRole("button", { name: "Paper theme" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "paper");
    await page.waitForFunction(() => {
      const plot = document.getElementById("plot-hashrate") as HTMLElement & {
        _fullLayout?: { paper_bgcolor?: string };
      };
      const color = plot?._fullLayout?.paper_bgcolor ?? "";
      return color.includes("38, 20, 71") || color.includes("38,20,71");
    });
  });

  test("?theme=synthwave clears a stored paper theme", async ({ page }) => {
    await page.goto("/posts/hello-world?theme=paper");
    await page.goto("/posts/hello-world?theme=synthwave");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "paper");
    expect(await page.evaluate(() => localStorage.getItem("deadmanoz-theme"))).toBeNull();
  });

  test("paper adds bar patterns and synthwave removes them", async ({ page }) => {
    await page.goto("/posts/p2ms-data-carry-2");
    await page.getByRole("button", { name: "Paper theme" }).click();
    await page.waitForFunction(() => {
      const plot = document.getElementById("plot-protocol-distribution") as HTMLElement & {
        data?: Array<{ type?: string; marker?: { pattern?: { shape?: string } } }>;
      };
      const bars = (plot?.data ?? []).filter((trace) => trace.type === "bar");
      return bars.length > 1 && bars.every((trace) => Boolean(trace.marker?.pattern?.shape));
    });
    await page.getByRole("button", { name: "Paper theme" }).click();
    await page.waitForFunction(() => {
      const plot = document.getElementById("plot-protocol-distribution") as HTMLElement & {
        data?: Array<{ type?: string; marker?: { pattern?: { shape?: string | null } } }>;
      };
      const bars = (plot?.data ?? []).filter((trace) => trace.type === "bar");
      return bars.length > 1 && bars.every((trace) => !trace.marker?.pattern?.shape);
    });
  });
});
