import { useEffect, type RefObject } from "react";

const LINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';

/**
 * Give every heading with an id a link icon, and copy the heading's URL to the
 * clipboard when the icon or the heading text is clicked. Idempotent: a heading
 * that already carries an anchor is left alone.
 */
export function useHeadingAnchors(
  container: RefObject<HTMLElement | null>,
  content: string,
  ready: boolean,
): void {
  useEffect(() => {
    if (!ready) return;
    const root = container.current;
    if (!root) return;

    const copyLink = (heading: HTMLElement, id: string) => {
      const url = `${window.location.origin}${window.location.pathname}#${id}`;
      navigator.clipboard.writeText(url).then(() => {
        heading.classList.add("link-copied");
        window.setTimeout(() => heading.classList.remove("link-copied"), 2000);
      });
    };

    root.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6").forEach((heading) => {
      if (heading.querySelector(".heading-anchor")) return;
      const id = heading.id;
      if (!id) return;

      heading.style.cursor = "pointer";
      heading.classList.add("heading-with-anchor");

      const anchor = document.createElement("a");
      anchor.href = `#${id}`;
      anchor.className = "heading-anchor";
      anchor.setAttribute("aria-label", "Copy link to this section");
      anchor.innerHTML = LINK_ICON;
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        copyLink(heading, id);
      });

      // Clicking the heading text copies too, unless the click is on a link inside it.
      heading.addEventListener("click", (event) => {
        if ((event.target as HTMLElement).tagName === "A") return;
        copyLink(heading, id);
      });

      heading.appendChild(anchor);
    });
  }, [container, content, ready]);
}
