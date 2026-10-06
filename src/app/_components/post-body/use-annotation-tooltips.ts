import { useEffect, type RefObject } from "react";

/**
 * Give each hover annotation its tooltip and arrow elements, built from the
 * HTML the renderer stored in data-tooltip. Idempotent per annotation.
 * Also keeps desktop tooltips within viewport boundaries via delegated pointer/focus
 * listeners that compute idempotent horizontal shifts and vertical flip placements.
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

    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

    const updatePlacement = (annotation: HTMLElement) => {
      if (isMobile()) return;
      const tooltip = annotation.querySelector<HTMLElement>(".annotation-tooltip");
      if (!tooltip) return;

      const pad = 16;
      const annotationRect = annotation.getBoundingClientRect();
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      const viewportWidth = window.innerWidth;

      // Stable anchor center
      const anchorCenter = annotationRect.left + annotationRect.width / 2;
      const naturalLeft = anchorCenter - tooltipWidth / 2;
      const naturalRight = anchorCenter + tooltipWidth / 2;

      let shiftX = 0;
      if (naturalLeft < pad) {
        shiftX = pad - naturalLeft;
      } else if (naturalRight > viewportWidth - pad) {
        shiftX = (viewportWidth - pad) - naturalRight;
      }

      // Clamp shift so the arrow always stays attached to the tooltip card
      const maxShift = Math.max(0, tooltipWidth / 2 - 20);
      shiftX = Math.max(-maxShift, Math.min(maxShift, shiftX));

      if (shiftX !== 0) {
        tooltip.style.setProperty("--tooltip-shift-x", `${Math.round(shiftX)}px`);
      } else {
        tooltip.style.removeProperty("--tooltip-shift-x");
      }

      // Flip below if not enough room above
      const spaceAbove = annotationRect.top;
      const spaceNeeded = tooltipHeight + 12 + pad;
      if (spaceAbove < spaceNeeded) {
        annotation.setAttribute("data-placement", "bottom");
      } else {
        annotation.removeAttribute("data-placement");
      }
    };

    const handlePointerOver = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const annotation = target?.closest<HTMLElement>(".annotation");
      if (annotation && root.contains(annotation)) {
        updatePlacement(annotation);
      }
    };

    root.addEventListener("pointerover", handlePointerOver);
    root.addEventListener("focusin", handlePointerOver);

    return () => {
      root.removeEventListener("pointerover", handlePointerOver);
      root.removeEventListener("focusin", handlePointerOver);
    };
  }, [container, content, ready]);
}
