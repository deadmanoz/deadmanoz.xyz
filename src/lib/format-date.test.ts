import { describe, it, expect } from "vitest";
import { formatPostDate } from "./format-date";

describe("formatPostDate", () => {
  it("formats an ISO date string as 'D MMMM YYYY' (day-first, full month, no comma)", () => {
    expect(formatPostDate("2026-05-13")).toBe("13 May 2026");
  });

  it("zero-pads day-of-month? No — leading zero is dropped", () => {
    expect(formatPostDate("2026-04-01")).toBe("1 April 2026");
  });

  it("renders all twelve months with their full spelling", () => {
    const expected = [
      "1 January 2026",
      "1 February 2026",
      "1 March 2026",
      "1 April 2026",
      "1 May 2026",
      "1 June 2026",
      "1 July 2026",
      "1 August 2026",
      "1 September 2026",
      "1 October 2026",
      "1 November 2026",
      "1 December 2026",
    ];
    for (let m = 0; m < 12; m++) {
      const iso = `2026-${String(m + 1).padStart(2, "0")}-01`;
      expect(formatPostDate(iso)).toBe(expected[m]);
    }
  });

  it("accepts a Date instance as well as an ISO string", () => {
    expect(formatPostDate(new Date("2026-12-31"))).toBe("31 December 2026");
  });

  it("accepts a full ISO datetime with timezone", () => {
    expect(formatPostDate("2025-08-11T00:00:00.000Z")).toBe("11 August 2025");
  });
});
