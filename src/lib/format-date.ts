import { format } from "date-fns";

/**
 * Format a post-related date for display, e.g. "13 May 2026".
 * Day-first, full month name, no comma — unambiguous and non-American.
 */
export function formatPostDate(date: string | Date): string {
  return format(new Date(date), "d MMMM yyyy");
}
