import { format } from "date-fns";

/**
 * Format a post-related date for display, e.g. "13 May 2026".
 * Day-first, full month name, no comma — unambiguous and non-American.
 */
export function formatPostDate(date: string | Date): string {
  // Format the UTC calendar day, so every build machine prints the same date
  // as production (Cloudflare builds in UTC), the feeds and the revision cutoff.
  const d = new Date(date);
  return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), "d MMMM yyyy");
}
