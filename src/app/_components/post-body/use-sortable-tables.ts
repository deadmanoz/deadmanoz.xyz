import { useEffect, type RefObject } from "react";

import { hydrateSortableTables } from "@/lib/table-sort";

/** Make the post's markdown tables sortable by clicking a column header. */
export function useSortableTables(
  container: RefObject<HTMLElement | null>,
  content: string,
  ready: boolean,
): void {
  useEffect(() => {
    if (!ready) return;
    const root = container.current;
    if (!root) return;
    hydrateSortableTables(root);
  }, [container, content, ready]);
}
