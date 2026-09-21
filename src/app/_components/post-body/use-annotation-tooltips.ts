import { useEffect, type RefObject } from "react";

/**
 * Give each hover annotation its tooltip and arrow elements, built from the
 * HTML the renderer stored in data-tooltip. Idempotent per annotation.
 */
export function useAnnotationTooltips(
  container: RefObject<HTMLElement | null>,
  content: string,
  ready: boolean,
): void {
  useEffect(() => {
    if (!ready) return;
    const root = container.current;
    if (!root) return;

    root.querySelectorAll<HTMLElement>(".annotation").forEach((annotation) => {
      const tooltipContent = annotation.getAttribute("data-tooltip");
      if (!tooltipContent) return;

      if (!annotation.querySelector(".annotation-tooltip")) {
        const tooltip = document.createElement("div");
        tooltip.className = "annotation-tooltip";
        tooltip.innerHTML = tooltipContent;
        annotation.appendChild(tooltip);
      }

      if (!annotation.querySelector(".annotation-arrow")) {
        const arrow = document.createElement("div");
        arrow.className = "annotation-arrow";
        annotation.appendChild(arrow);
      }
    });
  }, [container, content, ready]);
}
