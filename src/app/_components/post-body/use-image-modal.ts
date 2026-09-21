import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export interface ModalImage {
  src: string;
  alt: string;
  captionHtml: string;
}

/**
 * Make every image in the post open the preview modal on click, Enter or
 * Space, and return focus to the triggering image when the modal closes.
 */
export function useImageModal(
  container: RefObject<HTMLElement | null>,
  content: string,
  ready: boolean,
) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<ModalImage>({ src: "", alt: "", captionHtml: "" });
  // Selector for the trigger image, captured at click time. The live DOM is
  // re-queried on close rather than holding a node reference, because
  // dangerouslySetInnerHTML plus post-mount DOM mutations can detach the
  // original node, leaving a stale reference whose .focus() does nothing.
  const triggerSelectorRef = useRef<string | null>(null);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    requestAnimationFrame(() => {
      const selector = triggerSelectorRef.current;
      if (!selector) return;
      const trigger = document.querySelector<HTMLElement>(selector);
      if (!trigger) return;
      // The image may have been swapped out by React reconciliation around the
      // markdown div, so the replacement will not carry tabindex. Set it before focusing.
      if (trigger.tabIndex < 0) trigger.setAttribute("tabindex", "0");
      trigger.focus();
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = container.current;
    if (!root) return;

    const openModalFor = (target: HTMLImageElement) => {
      // Inside a <figure>, use the sibling <figcaption>'s rendered HTML (it
      // already carries "Figure N:", anchors and <code>); otherwise fall back
      // to the alt text.
      const figure = target.closest("figure");
      const figcaption = figure?.querySelector("figcaption");
      triggerSelectorRef.current = figure?.id
        ? `figure#${CSS.escape(figure.id)} img`
        : `img[src="${target.getAttribute("src")}"]`;
      setModalImage({
        src: target.src,
        alt: target.alt || "Image",
        captionHtml: figcaption?.innerHTML ?? "",
      });
      setModalOpen(true);
    };

    const handleClick = (event: Event) => {
      const target = event.target as HTMLImageElement;
      if (target.tagName === "IMG" && target.src) {
        event.preventDefault();
        openModalFor(target);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target as HTMLImageElement;
      if (target.tagName === "IMG" && target.src) {
        event.preventDefault();
        openModalFor(target);
      }
    };

    const images = Array.from(root.querySelectorAll("img"));
    images.forEach((img) => {
      img.style.cursor = "pointer";
      // Keyboard-accessible: in tab order, announced as a button, and
      // activatable by Enter or Space.
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      if (!img.hasAttribute("aria-label")) {
        img.setAttribute("aria-label", `Open preview: ${img.alt || "image"}`);
      }
      img.addEventListener("click", handleClick);
      img.addEventListener("keydown", handleKey);
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("click", handleClick);
        img.removeEventListener("keydown", handleKey);
      });
    };
    // modalOpen is a dependency on purpose: React can re-mount the <img>
    // children around a modal toggle, which drops their listeners.
  }, [container, content, ready, modalOpen]);

  return { modalOpen, modalImage, closeModal };
}
