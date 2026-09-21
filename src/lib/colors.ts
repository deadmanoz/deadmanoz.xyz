/**
 * The site palette in TypeScript form.
 *
 * `themeColors` mirrors the `--theme-*` tokens in src/app/globals.css; a unit
 * test checks the two agree, since CSS variables cannot be read at build time.
 * Everything that needs a colour outside CSS (plots, annotations, prose colour
 * markup, home-page category badges) takes it from here.
 */

/** Colours that have a `--theme-*` token in globals.css. */
export const themeColors = {
  neonOrange: "#FF6C11",
  neonGreen: "#20E516",
  neonCyan: "#00A0D0",
  neonBlue: "#006DD0",
  neonPurple: "#261447",
  peach: "#FF8664",
  teal: "#025F88",
  blue: "#02578B",
  dangerRed: "#E6194B",
} as const;

/** Names by which `themeColors` entries appear in globals.css. */
export const themeTokenNames: Record<keyof typeof themeColors, string> = {
  neonOrange: "--theme-neon-orange",
  neonGreen: "--theme-neon-green",
  neonCyan: "--theme-neon-cyan",
  neonBlue: "--theme-neon-blue",
  neonPurple: "--theme-neon-purple",
  peach: "--theme-peach",
  teal: "--theme-teal",
  blue: "--theme-blue",
  dangerRed: "--theme-danger-red",
};

/** Synthwave palette for plots and annotations. */
export const synthwaveColors = {
  neonOrange: themeColors.neonOrange,
  neonCyan: themeColors.neonCyan,
  neonGreen: themeColors.neonGreen,
  neonBlue: themeColors.neonBlue,
  peach: themeColors.peach,
  purple: themeColors.neonPurple,
  teal: themeColors.teal,
  neonPink: "#FF006E",
  magenta: "#FF00FF",
};

/** Common colour schemes for multi-series plots. */
export const colorSchemes = {
  neon: [
    synthwaveColors.neonCyan,
    synthwaveColors.neonOrange,
    synthwaveColors.neonGreen,
    synthwaveColors.neonPink,
    synthwaveColors.neonBlue,
  ],
  warm: [synthwaveColors.neonOrange, synthwaveColors.peach, synthwaveColors.neonPink],
  cool: [synthwaveColors.neonCyan, synthwaveColors.neonBlue, synthwaveColors.teal],
};

/**
 * Colours available to `{{name:text}}` in posts. A name with a theme token or
 * a plot colour uses it, so coloured prose matches links and charts; the rest
 * are accents with no counterpart elsewhere.
 */
export const proseColors: Record<string, string> = {
  orange: themeColors.neonOrange,
  green: themeColors.neonGreen,
  cyan: themeColors.neonCyan,
  blue: themeColors.neonBlue,
  red: themeColors.dangerRed,
  peach: themeColors.peach,
  pink: synthwaveColors.neonPink,
  magenta: synthwaveColors.magenta,
  grey: "#888899",
  gray: "#888899",
  gold: "#F0C040",
  yellow: "#EAB308",
  lightblue: "#42D4F4",
  purple: "#8B5CF6",
  teal: "#14B8A6",
  lime: "#84CC16",
  indigo: "#6366F1",
};
