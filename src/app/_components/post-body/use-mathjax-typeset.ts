import { useEffect } from "react";

interface MathJaxGlobal {
  typesetPromise?: () => Promise<void>;
  startup?: { promise?: Promise<void> };
}

/**
 * Re-run MathJax over the page whenever the post content changes or the image
 * modal opens or closes (its caption may contain math). MathJax is loaded by
 * the root layout; until it is present this retries every 100 ms.
 */
export function useMathJaxTypeset(content: string, modalOpen: boolean): void {
  useEffect(() => {
    let cancelled = false;
    let retry: number | undefined;

    const report = (err: unknown) => console.error("MathJax typesetting failed:", err);

    const typeset = () => {
      if (cancelled) return;
      const mathJax = (window as { MathJax?: MathJaxGlobal }).MathJax;
      if (mathJax?.typesetPromise) {
        mathJax.typesetPromise().catch(report);
      } else if (mathJax?.startup?.promise) {
        mathJax.startup.promise.then(() => mathJax.typesetPromise?.()).catch(report);
      } else {
        retry = window.setTimeout(typeset, 100);
      }
    };

    // Small delay so the content and any modal animation have settled.
    const initial = window.setTimeout(typeset, modalOpen ? 100 : 50);
    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      if (retry !== undefined) window.clearTimeout(retry);
    };
  }, [content, modalOpen]);
}
