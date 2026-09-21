import { useEffect } from "react";

/**
 * Scroll to the element named by the URL hash, on mount and on hash changes.
 * Any enclosing collapsible sections are opened first: a target inside a
 * closed <details> has no box, so scrollIntoView would be a no-op.
 */
export function useHashScroll(): void {
  useEffect(() => {
    let pending: number | undefined;

    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      // Small delay so the content has rendered.
      pending = window.setTimeout(() => {
        const element = document.getElementById(id);
        if (!element) return;
        let ancestor = element.parentElement;
        while (ancestor) {
          if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
          ancestor = ancestor.parentElement;
        }
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      window.removeEventListener("hashchange", scrollToHash);
      if (pending !== undefined) window.clearTimeout(pending);
    };
  }, []);
}
