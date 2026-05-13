"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

interface ImageModalProps {
  isOpen: boolean;
  imageSrc: string;
  imageAlt: string;
  /** Rendered figcaption innerHTML (carries 'Figure N:', anchors, <code>). Empty for plain images. */
  captionHtml?: string;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ImageModal({ isOpen, imageSrc, imageAlt, captionHtml, onClose }: ImageModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Move focus into the modal so AT announces it and keyboard users can
    // interact immediately. requestAnimationFrame ensures the close button
    // is in the DOM before .focus(). Focus-return on close is owned by the
    // parent (which knows the trigger element).
    const focusFrame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      // Focus trap: keep Tab / Shift+Tab cycling between descendants of the
      // dialog so the user can't tab back into the page beneath.
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains("modal-backdrop")) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasCaption = Boolean(captionHtml);
  // The figcaption strips the trailing 'Figure N:' label off the rest, so the
  // visible caption text is a good accessible name. Falls back to alt for
  // plain images.
  const accessibleName = imageAlt || "Image preview";

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={accessibleName}
        className="relative max-w-6xl w-full max-h-[95vh] flex flex-col items-center justify-center gap-4"
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-synthwave-dark-purple border-2 border-synthwave-neon-orange hover:border-synthwave-neon-cyan transition-all duration-300 flex items-center justify-center text-synthwave-neon-orange hover:text-synthwave-neon-cyan text-xl font-bold hover:shadow-neon-cyan focus:outline-none focus:ring-2 focus:ring-synthwave-neon-cyan focus:ring-offset-2 focus:ring-offset-synthwave-dark-purple"
          aria-label="Close image preview"
        >
          ×
        </button>

        <Image
          src={imageSrc}
          alt={imageAlt}
          width={1200}
          height={800}
          className="rounded-lg border-2 border-synthwave-neon-cyan/30 shadow-synthwave"
          style={{
            width: "auto",
            height: "auto",
            maxWidth: "95vw",
            maxHeight: hasCaption ? "70vh" : "85vh",
            objectFit: "contain",
          }}
          unoptimized
        />

        {hasCaption && (
          <figcaption
            className="modal-figcaption max-w-[95vw] w-auto bg-synthwave-dark-purple/90 border border-synthwave-neon-cyan/30 rounded-lg px-5 py-3 backdrop-blur-sm text-synthwave-peach text-sm leading-relaxed text-left overflow-y-auto"
            style={{ maxHeight: "20vh" }}
            dangerouslySetInnerHTML={{ __html: captionHtml ?? "" }}
          />
        )}
      </div>

      <style jsx global>{`
        .modal-figcaption strong {
          color: var(--theme-neon-cyan);
          font-weight: 600;
          margin-right: 0.25rem;
        }
        .modal-figcaption a {
          color: var(--theme-link);
          text-decoration: none;
        }
        .modal-figcaption a[href^="http"] {
          color: var(--theme-link-external);
        }
        .modal-figcaption a:hover,
        .modal-figcaption a:focus-visible {
          color: var(--theme-link-hover);
        }
        .modal-figcaption a:focus-visible {
          outline: 2px solid var(--theme-link-hover);
          outline-offset: 2px;
          border-radius: 0.125rem;
        }
        .modal-figcaption code {
          background: var(--theme-bg-secondary);
          color: var(--theme-neon-cyan);
          padding: 0 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .modal-figcaption a code {
          color: inherit;
        }
      `}</style>
    </div>
  );
}
