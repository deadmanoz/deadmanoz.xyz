/**
 * Synthwave color palette for plots and annotations
 * Shared between plot-utils and annotation-utils to avoid circular dependencies
 */
export const synthwaveColors = {
  neonOrange: "#FF6C11",
  neonCyan: "#00A0D0",
  neonGreen: "#20E516",
  neonBlue: "#006DD0",
  peach: "#FF8664",
  purple: "#261447",
  teal: "#025F88",
  neonPink: "#FF006E",
  magenta: "#FF00FF",
};

/**
 * Common color schemes for multi-series plots
 */
export const colorSchemes = {
  neon: [
    synthwaveColors.neonCyan,
    synthwaveColors.neonOrange,
    synthwaveColors.neonGreen,
    synthwaveColors.neonPink,
    synthwaveColors.neonBlue,
  ],
  warm: [
    synthwaveColors.neonOrange,
    synthwaveColors.peach,
    synthwaveColors.neonPink,
  ],
  cool: [
    synthwaveColors.neonCyan,
    synthwaveColors.neonBlue,
    synthwaveColors.teal,
  ],
};
