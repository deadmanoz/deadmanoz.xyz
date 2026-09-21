import { describe, it, expect } from "vitest";
import {
  compareCellText,
  nextSortState,
  orderRowsByColumn,
  parseLeadingDate,
  parseNumericCell,
} from "./table-sort";

describe("parseNumericCell", () => {
  it("parses integers and comma-grouped thousands", () => {
    expect(parseNumericCell("74638")).toBe(74638);
    expect(parseNumericCell("74,638")).toBe(74638);
    expect(parseNumericCell("1,234,567")).toBe(1234567);
  });

  it("parses decimals and negatives", () => {
    expect(parseNumericCell("3.125")).toBe(3.125);
    expect(parseNumericCell("-12")).toBe(-12);
  });

  it("rejects dates, mixed text, and empty strings", () => {
    expect(parseNumericCell("2010-08-15")).toBeNull();
    expect(parseNumericCell("74,638 BTC")).toBeNull();
    expect(parseNumericCell("")).toBeNull();
  });
});

describe("parseLeadingDate", () => {
  it("parses a bare ISO date as UTC midnight", () => {
    expect(parseLeadingDate("2010-08-15")).toBe(
      Date.parse("2010-08-15T00:00:00Z"),
    );
  });

  it("uses the leading date in a mixed cell", () => {
    expect(parseLeadingDate("2026-04-15 nTime; found 2026-04-22")).toBe(
      Date.parse("2026-04-15T00:00:00Z"),
    );
  });

  it("rejects strings without an ISO prefix", () => {
    expect(parseLeadingDate("15 August 2010")).toBeNull();
    expect(parseLeadingDate("74,638")).toBeNull();
  });
});

describe("compareCellText", () => {
  it("sorts comma-grouped heights numerically, not lexicographically", () => {
    expect(compareCellText("74,638", "225,013")).toBeLessThan(0);
    expect(compareCellText("9", "10")).toBeLessThan(0);
  });

  it("sorts ISO dates, including mixed nTime cells, chronologically", () => {
    expect(compareCellText("2010-08-15", "2013-03-09")).toBeLessThan(0);
    expect(
      compareCellText(
        "2026-04-15 nTime; found 2026-04-22",
        "2026-06-29 nTime; found 2026-07-13",
      ),
    ).toBeLessThan(0);
  });

  it("sorts text case-insensitively", () => {
    expect(compareCellText("sigops", "tx ordering")).toBeLessThan(0);
    expect(compareCellText("F2Pool", "f2pool")).toBe(0);
  });

  it("sends empty cells to the end", () => {
    expect(compareCellText("", "AntPool")).toBeGreaterThan(0);
    expect(compareCellText("AntPool", "")).toBeLessThan(0);
  });
});

describe("orderRowsByColumn", () => {
  it("returns a stable permutation for numeric, date, and text columns", () => {
    expect(orderRowsByColumn(["74,638", "9", "225,013"], "asc")).toEqual([
      1, 0, 2,
    ]);
    expect(
      orderRowsByColumn(["2013-03-09", "2010-08-15", "2013-03-09"], "desc"),
    ).toEqual([0, 2, 1]);
    expect(orderRowsByColumn(["title", "date", "status"], "asc")).toEqual([
      1, 2, 0,
    ]);
  });
});

describe("nextSortState", () => {
  it("cycles unsorted → asc → desc → unsorted, and resets on a new column", () => {
    expect(nextSortState(null, 0)).toEqual({ column: 0, direction: "asc" });
    expect(nextSortState({ column: 0, direction: "asc" }, 0)).toEqual({
      column: 0,
      direction: "desc",
    });
    expect(nextSortState({ column: 0, direction: "desc" }, 0)).toBeNull();
    expect(nextSortState({ column: 0, direction: "desc" }, 2)).toEqual({
      column: 2,
      direction: "asc",
    });
  });
});
