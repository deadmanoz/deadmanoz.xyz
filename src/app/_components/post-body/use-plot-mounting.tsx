import { useEffect, type RefObject } from "react";
import type { Root } from "react-dom/client";

import { loadPlot } from "@/lib/plot-loader";
import { InteractivePlot } from "../interactive-plot";

// One React root per plot container, reused across re-renders.
const plotRoots = new WeakMap<HTMLElement, Root>();
// Roots whose unmount has been deferred; a re-run that arrives first reuses them.
const pendingUnmounts = new WeakMap<HTMLElement, number>();

/**
 * Mount an InteractivePlot into every plot container the renderer emitted,
 * loading inline or external data (and any annotations) through the plot loader.
 */
export function usePlotMounting(
  container: RefObject<HTMLElement | null>,
  content: string,
  ready: boolean,
): void {
  useEffect(() => {
    if (!ready) return;
    const root = container.current;
    if (!root) return;

    const containers = Array.from(root.querySelectorAll<HTMLElement>(".interactive-plot-container"));
    let cancelled = false;

    containers.forEach(async (element) => {
      const plotId = element.getAttribute("data-plot-id");
      const encoded = element.getAttribute("data-plot-data");
      if (!plotId || !encoded) return;

      const plot = await loadPlot(encoded, plotId);
      if (!plot || cancelled) return;

      const { createRoot } = await import("react-dom/client");
      if (cancelled) return;

      const pending = pendingUnmounts.get(element);
      if (pending !== undefined) {
        window.clearTimeout(pending);
        pendingUnmounts.delete(element);
      }
      let plotRoot = plotRoots.get(element);
      if (!plotRoot) {
        plotRoot = createRoot(element);
        plotRoots.set(element, plotRoot);
      }
      plotRoot.render(<InteractivePlot data={plot.data} layout={plot.layout} id={plotId} />);
    });

    return () => {
      cancelled = true;
      containers.forEach((element) => {
        const plotRoot = plotRoots.get(element);
        if (!plotRoot || pendingUnmounts.has(element)) return;
        // Unmounting synchronously here would run inside React's commit, which
        // React flags; defer it, and let a quick re-run (StrictMode, or the same
        // content re-rendering) reclaim the root instead.
        const timer = window.setTimeout(() => {
          plotRoot.unmount();
          plotRoots.delete(element);
          pendingUnmounts.delete(element);
        }, 0);
        pendingUnmounts.set(element, timer);
      });
    };
  }, [container, content, ready]);
}
