import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { proseColors, synthwaveColors, themeColors, themeTokenNames } from "./colors";

const globalsCss = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function cssToken(name: string): string | undefined {
  const match = globalsCss.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  return match?.[1].toUpperCase();
}

describe("themeColors", () => {
  it.each(Object.entries(themeTokenNames))("%s matches its %s token in globals.css", (key, token) => {
    expect(cssToken(token)).toBe(themeColors[key as keyof typeof themeColors].toUpperCase());
  });
});

describe("palette consistency", () => {
  it("gives prose colours the same values as the theme and plots where a name overlaps", () => {
    expect(proseColors.green).toBe(themeColors.neonGreen);
    expect(proseColors.cyan).toBe(themeColors.neonCyan);
    expect(proseColors.orange).toBe(themeColors.neonOrange);
    expect(proseColors.pink).toBe(synthwaveColors.neonPink);
    expect(proseColors.magenta).toBe(synthwaveColors.magenta);
  });

  it("accepts grey and gray as the same colour", () => {
    expect(proseColors.gray).toBe(proseColors.grey);
  });
});
