"use client";

import { useEffect } from "react";
import Image from "next/image";

interface ImageModalProps {
  isOpen: boolean;
  imageSrc: string;
  imageAlt: string;
  /** Rendered figcaption innerHTML (carries 'Figure N:', anchors, <code>). Empty for plain images. */
  captionHtml?: string;
  onClose: () => void;
}

export function ImageModal({ isOpen, imageSrc, imageAlt, captionHtml, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains("modal-backdrop")) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("click", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasCaption = Boolean(captionHtml);

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      <div className="relative max-w-6xl w-full max-h-[95vh] flex flex-col items-center justify-center gap-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-synthwave-dark-purple border-2 border-synthwave-neon-orange hover:border-synthwave-neon-cyan transition-all duration-300 flex items-center justify-center text-synthwave-neon-orange hover:text-synthwave-neon-cyan text-xl font-bold hover:shadow-neon-cyan"
          aria-label="Close modal"
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
            // Reserve space below for the caption (~20vh including padding/border)
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
        .modal-figcaption a:hover {
          color: var(--theme-link-hover);
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
