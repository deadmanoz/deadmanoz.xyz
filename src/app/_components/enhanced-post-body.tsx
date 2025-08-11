"use client";

import { useState, useEffect, Suspense } from "react";
import markdownStyles from "./markdown-styles.module.css";
import { ImageModal } from "./image-modal";

type Props = {
  content: string;
};

function PostBodyContent({ content }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState({ src: "", alt: "" });
  const [isWideContent, setIsWideContent] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setIsWideContent(urlParams.get('wide-content') !== 'false');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const typeset = () => {
        const mathJax = (window as { MathJax?: { typesetPromise?: () => Promise<void>; startup?: { promise?: Promise<void> } } }).MathJax;

        if (mathJax?.typesetPromise) {
          // MathJax is ready, re-typeset the current content
          mathJax.typesetPromise().then(() => {
            console.log('MathJax re-typesetting complete');
          }).catch((err) => {
            console.error('MathJax re-typesetting failed:', err);
          });
        } else if (mathJax?.startup?.promise) {
          // MathJax is loading, wait for it to be ready
          mathJax.startup.promise.then(() => {
            return mathJax.typesetPromise?.();
          }).then(() => {
            console.log('MathJax delayed typesetting complete');
          }).catch((err) => {
            console.error('MathJax delayed typesetting failed:', err);
          });
        } else {
          // MathJax not yet available, try again later
          setTimeout(typeset, 100);
        }
      };

      // Small delay to ensure content is rendered and modal animations are complete
      const timeoutId = setTimeout(typeset, modalOpen ? 100 : 50);

      return () => clearTimeout(timeoutId);
    }
  }, [content, modalOpen]);

  useEffect(() => {
    const handleImageClick = (event: Event) => {
      const target = event.target as HTMLImageElement;
      if (target.tagName === "IMG" && target.src) {
        event.preventDefault();
        setModalImage({
          src: target.src,
          alt: target.alt || "Image"
        });
        setModalOpen(true);
      }
    };

    const timeoutId = setTimeout(() => {
      const markdownContainer = document.querySelector(`.${markdownStyles.markdown}`);
      if (markdownContainer) {
        const images = markdownContainer.querySelectorAll("img");
        images.forEach(img => {
          img.style.cursor = "pointer";
          img.removeEventListener("click", handleImageClick);
          img.addEventListener("click", handleImageClick);
        });
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [content, modalOpen]);

  return (
    <>
      <style jsx global>{`
        .figure-container {
          margin: 2rem 0;
          text-align: center;
        }
        .figure-container img {
          margin: 0 auto 0.5rem auto;
        }
        .figure-container figcaption {
          font-size: 0.875rem;
          margin-top: 0.75rem;
          padding: 0 1rem;
          text-align: center;
          color: var(--theme-neon-cyan);
        }
        .figure-container figcaption strong {
          font-weight: bold;
          color: var(--theme-neon-pink);
        }
        .figure-ref {
          font-weight: 500;
          color: var(--theme-neon-cyan);
        }
        .figure-ref:hover {
          color: var(--theme-neon-pink);
          text-shadow: 0 0 10px currentColor;
        }

        .annotation {
          position: relative;
          cursor: help;
          color: var(--theme-neon-cyan);
          font-weight: 500;
          background: linear-gradient(90deg, rgba(0, 217, 255, 0.15) 0%, rgba(245, 18, 119, 0.15) 100%);
          border-bottom: 2px dotted var(--theme-neon-cyan);
          padding: 2px 4px;
          border-radius: 3px;
          transition: all 0.2s ease-in-out;
          text-decoration: none;
        }

        .annotation:hover {
          color: var(--theme-neon-pink);
          background: linear-gradient(90deg, rgba(245, 18, 119, 0.2) 0%, rgba(0, 217, 255, 0.2) 100%);
          border-bottom-color: var(--theme-neon-pink);
          transform: translateY(-1px);
        }

        .annotation::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-5px);
          background: var(--theme-bg-secondary);
          color: var(--theme-neon-cyan);
          border: 2px solid var(--theme-neon-cyan);
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          line-height: 1.4;
          white-space: normal;
          width: max-content;
          max-width: 320px;
          text-align: left;
          font-weight: normal;
          text-decoration: none;
          box-shadow: 0 8px 25px rgba(0, 217, 255, 0.4), 0 0 0 1px rgba(0, 217, 255, 0.1);
          z-index: 999999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out, transform 0.3s ease-in-out;
          pointer-events: none;
          margin-bottom: 12px;
        }

        .annotation::before {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 6px;
          border: 6px solid transparent;
          border-top-color: var(--theme-neon-cyan);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
          z-index: 999999;
        }

        .annotation:hover::after,
        .annotation:focus::after {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }

        .annotation:hover::before,
        .annotation:focus::before {
          opacity: 1;
          visibility: visible;
        }

        @media (max-width: 768px) {
          .annotation::after {
            position: fixed;
            bottom: auto;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 280px;
            margin-bottom: 0;
            font-size: 0.8125rem;
          }

          .annotation::before {
            display: none;
          }
        }
      `}</style>
      <div className={isWideContent ? "max-w-6xl mx-auto" : "max-w-2xl mx-auto"}>
        <div
          className={markdownStyles["markdown"]}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        <ImageModal
          isOpen={modalOpen}
          imageSrc={modalImage.src}
          imageAlt={modalImage.alt}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </>
  );
}

export function EnhancedPostBody({ content }: Props) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PostBodyContent content={content} />
    </Suspense>
  );
}