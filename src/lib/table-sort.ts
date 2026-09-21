export type SortDirection = "asc" | "desc";

export type SortState = {
  column: number;
  direction: SortDirection;
};

const NUMERIC_CELL = /^-?\d[\d,]*(\.\d+)?$/;
const LEADING_ISO_DATE = /^(\d{4}-\d{2}-\d{2})/;

/**
 * Parse a table cell as a number when the whole string is digits with optional
 * thousands-commas and a decimal. "74,638" counts; "2010-08-15" does not.
 */
export function parseNumericCell(text: string): number | null {
  if (!NUMERIC_CELL.test(text)) return null;
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a leading YYYY-MM-DD prefix so mixed cells like
 * "2026-04-15 nTime; found 2026-04-22" still sort as dates.
 */
export function parseLeadingDate(text: string): number | null {
  const match = LEADING_ISO_DATE.exec(text);
  if (!match) return null;
  const ms = Date.parse(`${match[1]}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Compare two cell strings: numbers (with commas) first, then leading dates,
 * then case-insensitive text. Empty cells sort last in ascending order.
 */
export function compareCellText(a: string, b: string): number {
  const left = a.trim();
  const right = b.trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const leftNum = parseNumericCell(left);
  const rightNum = parseNumericCell(right);
  if (leftNum !== null && rightNum !== null) {
    return leftNum - rightNum;
  }

  const leftDate = parseLeadingDate(left);
  const rightDate = parseLeadingDate(right);
  if (leftDate !== null && rightDate !== null) {
    return leftDate - rightDate;
  }

  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Return the permutation of row indices that sorts `columnCells`.
 * Ties keep original order.
 */
export function orderRowsByColumn(
  columnCells: readonly string[],
  direction: SortDirection,
): number[] {
  const indices = columnCells.map((_, i) => i);
  indices.sort((i, j) => {
    const cmp = compareCellText(columnCells[i], columnCells[j]);
    if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
    return i - j;
  });
  return indices;
}

/**
 * Click cycle: unsorted → asc → desc → unsorted (original row order).
 */
export function nextSortState(
  current: SortState | null,
  clickedColumn: number,
): SortState | null {
  if (!current || current.column !== clickedColumn) {
    return { column: clickedColumn, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { column: clickedColumn, direction: "desc" };
  }
  return null;
}

function cellText(row: HTMLTableRowElement, columnIndex: number): string {
  return row.cells[columnIndex]?.textContent ?? "";
}

function applyAriaSort(
  headers: HTMLTableCellElement[],
  state: SortState | null,
): void {
  headers.forEach((th, index) => {
    if (!state || state.column !== index) {
      th.setAttribute("aria-sort", "none");
      return;
    }
    th.setAttribute(
      "aria-sort",
      state.direction === "asc" ? "ascending" : "descending",
    );
  });
}

function applyRowOrder(
  tbody: HTMLTableSectionElement,
  originalRows: HTMLTableRowElement[],
  state: SortState | null,
): void {
  const rows = state
    ? orderRowsByColumn(
        originalRows.map((row) => cellText(row, state.column)),
        state.direction,
      ).map((index) => originalRows[index])
    : originalRows;

  for (const row of rows) {
    tbody.appendChild(row);
  }
}

function wrapHeaderButton(th: HTMLTableCellElement, columnIndex: number): HTMLButtonElement {
  const label = document.createElement("span");
  label.className = "table-sort-label";
  while (th.firstChild) {
    label.appendChild(th.firstChild);
  }

  const indicator = document.createElement("span");
  indicator.className = "table-sort-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "table-sort";
  const headerText = label.textContent?.trim() || `column ${columnIndex + 1}`;
  button.setAttribute("aria-label", `Sort by ${headerText}`);
  button.append(label, indicator);

  th.appendChild(button);
  th.setAttribute("aria-sort", "none");
  return button;
}

/**
 * Make every markdown table in `root` sortable by its column headers.
 * Idempotent: tables already marked `data-sortable` are left alone.
 */
export function hydrateSortableTables(root: ParentNode): void {
  const tables = root.querySelectorAll("table");
  tables.forEach((table) => {
    if (!(table instanceof HTMLTableElement)) return;
    if (table.dataset.sortable === "true") return;

    const thead = table.tHead;
    const tbody = table.tBodies.item(0);
    if (!thead || !tbody) return;

    const headerRow = thead.rows[0];
    if (!headerRow || headerRow.cells.length === 0) return;

    table.dataset.sortable = "true";
    const originalRows = Array.from(tbody.rows);
    const headers = Array.from(headerRow.cells);
    let state: SortState | null = null;

    headers.forEach((th, columnIndex) => {
      const button = wrapHeaderButton(th, columnIndex);
      button.addEventListener("click", () => {
        state = nextSortState(state, columnIndex);
        applyAriaSort(headers, state);
        applyRowOrder(tbody, originalRows, state);
      });
    });
  });
}
