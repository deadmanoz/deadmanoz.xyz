"use client";

import { useEffect } from "react";
import Image from "next/image";

interface ImageModalProps {
  isOpen: boolean;
  imageSrc: string;
  imageAlt: string;
  onClose: () => void;
}

export function ImageModal({ isOpen, imageSrc, imageAlt, onClose }: ImageModalProps) {
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

  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-synthwave-dark-purple border-2 border-synthwave-neon-orange hover:border-synthwave-neon-cyan transition-all duration-300 flex items-center justify-center text-synthwave-neon-orange hover:text-synthwave-neon-cyan text-xl font-bold hover:shadow-neon-cyan"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className="relative w-full h-full flex items-center justify-center p-4">
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
              maxHeight: "85vh",
              minWidth: "80vw",
              objectFit: "contain"
            }}
            unoptimized
          />
        </div>

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-synthwave-dark-purple/90 border border-synthwave-neon-cyan/30 rounded-lg px-4 py-2 backdrop-blur-sm">
          <p className="text-synthwave-neon-cyan text-sm text-center max-w-md">
            {imageAlt}
          </p>
        </div>
      </div>
    </div>
  );
}