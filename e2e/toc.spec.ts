import { test, expect, type Locator, type Page } from "@playwright/test";

const postPath = "/posts/2026/invalid-blocks";
const canaryPath = "/posts/hello-world";
const p2shHeading =
  "One invalid P2SH transaction, many blocks (89 established cases, 2012)";
const proofHeading = "Turning explorer records into proofs";
const repeatedHeading = "What caused the repeated inclusions?";

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function disclosure(nav: Locator, heading: string): Locator {
  return nav.getByRole("button", {
    name: new RegExp(`^(Expand|Collapse) ${escapeRegExp(heading)}$`),
  });
}

async function setExpanded(nav: Locator, heading: string, expanded: boolean) {
  const button = disclosure(nav, heading);
  await expect(button).toBeVisible();
  if ((await button.getAttribute("aria-expanded")) !== String(expanded)) {
    await button.click();
  }
  await expect(button).toHaveAttribute("aria-expanded", String(expanded));
  await expect(button).toHaveAccessibleName(
    `${expanded ? "Collapse" : "Expand"} ${heading}`,
  );
}

async function controlledGroup(nav: Locator, heading: string) {
  const id = await disclosure(nav, heading).getAttribute("aria-controls");
  expect(id).toBeTruthy();
  const group = nav.locator(`ul[id="${id}"]`);
  await expect(group).toHaveCount(1);
  return group;
}

async function openToc(page: Page, width: number, path = postPath) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  if (width < 1280) {
    await page.getByRole("button", { name: "Toggle table of contents" }).click();
  }
  const nav = page.getByRole("navigation", { name: "Table of contents" });
  await expect(nav).toHaveCount(1);
  await expect(nav).toBeVisible();
  if (path === postPath) {
    await expect(nav.getByRole("button", { name: "Methodology", exact: true }))
      .toBeVisible();
    await expect(disclosure(nav, "Methodology")).toHaveAttribute("aria-expanded", "false");
    await expect(disclosure(nav, "The failures")).toHaveAttribute("aria-expanded", "false");
    await expect(nav.getByRole("button", {
      name: "The scope of the catalogue", exact: true,
    })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: p2shHeading, exact: true }))
      .toHaveCount(0);
  }
  return nav;
}

async function expectNoHorizontalOverflow(nav: Locator) {
  const dimensions = await nav.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      navOverflow: element.scrollWidth - element.clientWidth,
      scrollerOverflow: element.parentElement!.scrollWidth -
        element.parentElement!.clientWidth,
      overflowingButtons: Array.from(element.querySelectorAll("button"))
        .filter((button) => button.getClientRects().length > 0)
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return rect.left < bounds.left - 1 || rect.right > bounds.right + 1 ||
            button.scrollWidth > button.clientWidth + 1;
        })
        .map((button) => button.textContent),
    };
  });
  expect(dimensions.navOverflow).toBeLessThanOrEqual(1);
  expect(dimensions.scrollerOverflow).toBeLessThanOrEqual(1);
  expect(dimensions.overflowingButtons).toEqual([]);
}

async function expectHeadingAtScrollMargin(page: Page, text: string) {
  // The heading's copy-link icon adds its label to the accessible name.
  const heading = page.locator('[class*="markdown"]').first()
    .locator("h1, h2, h3, h4, h5, h6")
    .filter({ hasText: new RegExp(`^${escapeRegExp(text)}$`) });
  await expect(heading).toHaveCount(1);
  await expect.poll(async () => {
    return heading.evaluate((element) => {
      const margin = Number.parseFloat(getComputedStyle(element).scrollMarginTop);
      return Math.abs(element.getBoundingClientRect().top - margin);
    });
  }).toBeLessThanOrEqual(2);
}

test.describe("table of contents hierarchy", () => {
  test("nested disclosures preserve branch state and support keyboard activation", async ({ page }) => {
    const nav = await openToc(page, 1440);
    await setExpanded(nav, "Methodology", true);
    await setExpanded(nav, "The failures", true);
    await setExpanded(nav, p2shHeading, true);

    const failuresGroup = await controlledGroup(nav, "The failures");
    const p2shGroup = await controlledGroup(nav, p2shHeading);
    await expect(failuresGroup.locator("ul")).toContainText(proofHeading);
    await expect(p2shGroup).toBeVisible();
    await expect(p2shGroup.getByRole("button", { name: proofHeading, exact: true }))
      .toBeVisible();
    await expect(disclosure(nav, proofHeading)).toHaveCount(0);
    await expect(disclosure(nav, "Introduction")).toHaveCount(0);

    await disclosure(nav, p2shHeading).focus();
    await page.keyboard.press("Space");
    await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "false");
    await expect(p2shGroup).toBeHidden();
    await expect(nav.getByRole("button", { name: repeatedHeading, exact: true }))
      .toHaveCount(0);
    await expect(nav.getByRole("button", {
      name: "The value overflow (1 block, 2010)", exact: true,
    })).toBeVisible();

    await setExpanded(nav, "The failures", false);
    await expect(failuresGroup).toBeHidden();
    await expect(nav.getByRole("button", {
      name: "The scope of the catalogue", exact: true,
    })).toBeVisible();
    await setExpanded(nav, "The failures", true);
    await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "false");
    await expect(p2shGroup).toBeHidden();

    await disclosure(nav, p2shHeading).focus();
    await page.keyboard.press("Enter");
    await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "true");
    await expect(p2shGroup).toBeVisible();

    await setExpanded(nav, "The failures", false);
    await expect(p2shGroup).toBeHidden();
    await setExpanded(nav, "The failures", true);
    await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "true");
    await expect(p2shGroup).toBeVisible();
    await expect(p2shGroup.getByRole("button", { name: proofHeading, exact: true }))
      .toBeVisible();
    await expectNoHorizontalOverflow(nav);
  });

  test("heading navigation remains independent of the disclosure button", async ({ page }) => {
    const nav = await openToc(page, 1440);
    await setExpanded(nav, "Methodology", false);

    await nav.getByRole("button", { name: "Methodology", exact: true }).click();

    await expectHeadingAtScrollMargin(page, "Methodology");
    await expect(disclosure(nav, "Methodology")).toHaveAttribute("aria-expanded", "false");
    await expect(await controlledGroup(nav, "Methodology")).toBeHidden();
  });

  for (const width of [375, 320]) {
    test(`mobile panel preserves branch choices and navigates at ${width}px`, async ({ page }) => {
      const nav = await openToc(page, width);
      await setExpanded(nav, "Methodology", true);
      await setExpanded(nav, "The failures", true);
      await setExpanded(nav, p2shHeading, true);
      await expectNoHorizontalOverflow(nav);
      await setExpanded(nav, p2shHeading, false);

      const panelToggle = page.getByRole("button", { name: "Toggle table of contents" });
      await panelToggle.click();
      await expect(panelToggle).toHaveAttribute("aria-expanded", "false");
      await panelToggle.click();
      await expect(panelToggle).toHaveAttribute("aria-expanded", "true");

      await expect(disclosure(nav, "Methodology")).toHaveAttribute("aria-expanded", "true");
      await expect(disclosure(nav, "The failures")).toHaveAttribute("aria-expanded", "true");
      await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "false");
      await setExpanded(nav, p2shHeading, true);
      await nav.getByRole("button", { name: repeatedHeading, exact: true }).click();
      await expect(panelToggle).toHaveAttribute("aria-expanded", "false");
      await expectHeadingAtScrollMargin(page, repeatedHeading);

      await panelToggle.click();
      await expect(nav).toBeInViewport();
      await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "true");
      await expectNoHorizontalOverflow(nav);
    });
  }

  test("one responsive TOC preserves branch choices across desktop and mobile", async ({ page }) => {
    const nav = await openToc(page, 1440);
    const allTocs = page.locator('nav[aria-label="Table of contents"]');
    await expect(allTocs).toHaveCount(1);
    await setExpanded(nav, "Methodology", true);
    await setExpanded(nav, "The failures", true);
    await setExpanded(nav, p2shHeading, true);

    await page.setViewportSize({ width: 375, height: 900 });
    const panelToggle = page.getByRole("button", { name: "Toggle table of contents" });
    await expect(panelToggle).toHaveAttribute("aria-expanded", "false");
    await expect(allTocs).toHaveCount(1);
    await panelToggle.click();
    await expect(disclosure(nav, "Methodology")).toHaveAttribute("aria-expanded", "true");
    await expect(disclosure(nav, "The failures")).toHaveAttribute("aria-expanded", "true");
    await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "true");
    await setExpanded(nav, "Methodology", false);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(panelToggle).toBeHidden();
    await expect(allTocs).toHaveCount(1);
    await expect(nav).toBeVisible();
    await expect(disclosure(nav, "Methodology")).toHaveAttribute("aria-expanded", "false");
    await expect(disclosure(nav, "The failures")).toHaveAttribute("aria-expanded", "true");
    await expect(disclosure(nav, p2shHeading)).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("button", { name: proofHeading, exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(nav);
  });

  test("client-side post navigation refreshes the TOC headings", async ({ page }) => {
    const nav = await openToc(page, 1440, canaryPath);
    await setExpanded(nav, "This is", true);
    await setExpanded(nav, "A nested", true);
    await expect(nav.getByRole("button", { name: "Table-of-contents", exact: true }))
      .toBeVisible();
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);

    await page.getByRole("link", { name: /Back to all posts/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.locator(`a[href="${postPath}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${postPath}$`));
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);

    await expect(page.locator('nav[aria-label="Table of contents"]')).toHaveCount(1);
    await expect(nav.getByRole("button", { name: "This is", exact: true })).toHaveCount(0);
    await expect(disclosure(nav, "Methodology")).toHaveAttribute("aria-expanded", "false");
    await setExpanded(nav, "Methodology", true);
    await expect(nav.getByRole("button", {
      name: "The scope of the catalogue", exact: true,
    })).toBeVisible();
    await nav.getByRole("button", { name: "Methodology", exact: true }).click();
    await expectHeadingAtScrollMargin(page, "Methodology");
  });

  for (const width of [1440, 320]) {
    test(`skipped heading levels and long leaf titles stay inside the TOC at ${width}px`, async ({ page }) => {
      const nav = await openToc(page, width, canaryPath);
      const longLeaf = `A long leaf heading ${"unbroken".repeat(30)}`;
      await expect(disclosure(nav, "This is")).toHaveAttribute("aria-expanded", "false");
      await disclosure(nav, "This is").press("Enter");
      await expect(disclosure(nav, "This is")).toHaveAttribute("aria-expanded", "true");
      await setExpanded(nav, "Skipped heading levels", true);
      await setExpanded(nav, "A fourth-level branch", true);
      const parentGroup = await controlledGroup(nav, "Skipped heading levels");
      const childGroup = await controlledGroup(nav, "A fourth-level branch");
      await expect(parentGroup.locator("ul")).toContainText(longLeaf);
      await expect(childGroup.getByRole("button", { name: longLeaf, exact: true }))
        .toBeVisible();
      await expect(disclosure(nav, longLeaf)).toHaveCount(0);
      await expectNoHorizontalOverflow(nav);

      await setExpanded(nav, "Skipped heading levels", false);
      await expect(parentGroup).toBeHidden();
      await expect(nav.getByRole("button", { name: "Sibling after skipped levels", exact: true }))
        .toBeVisible();
    });
  }
});
