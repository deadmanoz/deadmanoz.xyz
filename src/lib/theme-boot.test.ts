import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { THEME_BOOT_SCRIPT, THEME_STORAGE_KEY } from "./theme-boot";

function runBoot(search: string, stored: string | null) {
  const store = new Map<string, string>();
  if (stored) store.set(THEME_STORAGE_KEY, stored);
  const dataset: Record<string, string> = {};
  const document = { documentElement: { dataset } };
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  const location = { search };
  const fn = new Function(
    "document",
    "localStorage",
    "location",
    `globalThis.document = document; globalThis.localStorage = localStorage; globalThis.location = location;\n${THEME_BOOT_SCRIPT}`,
  );
  fn(document, localStorage, location);
  return { theme: dataset.theme, stored: store.get(THEME_STORAGE_KEY) ?? null };
}

describe("theme boot script", () => {
  it("sets data-theme from ?theme=paper before any later script", () => {
    expect(runBoot("?theme=paper", null)).toEqual({ theme: "paper", stored: "paper" });
  });

  it("clears a stored paper theme when ?theme=synthwave", () => {
    expect(runBoot("?theme=synthwave", "paper")).toEqual({ theme: undefined, stored: null });
  });

  it("keeps a stored paper theme when the query is absent", () => {
    expect(runBoot("", "paper")).toEqual({ theme: "paper", stored: "paper" });
  });

  it("leaves the default unmarked when nothing is stored", () => {
    expect(runBoot("", null)).toEqual({ theme: undefined, stored: null });
  });

  it("is an inline script in the document head, ahead of the page body", () => {
    const layout = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");
    const head = layout.indexOf("<head>");
    const script = layout.indexOf('id="theme-boot"');
    const body = layout.indexOf("<body");
    expect(head).toBeGreaterThan(-1);
    expect(script).toBeGreaterThan(head);
    expect(script).toBeLessThan(body);
    expect(THEME_BOOT_SCRIPT).toContain("document.documentElement.dataset.theme");
    expect(THEME_BOOT_SCRIPT).toContain('new URLSearchParams(location.search).get("theme")');
  });
});
