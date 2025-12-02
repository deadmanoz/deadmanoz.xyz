"use client";

import { useState, useEffect, Suspense } from "react";
import markdownStyles from "./markdown-styles.module.css";
import { ImageModal } from "./image-modal";
import { InteractivePlot } from "./interactive-plot";
import { parsePlotData } from "@/lib/plot-utils";
import { loadAnnotationsFromFile, filterAnnotations } from "@/lib/annotation-utils";
import type { Root } from "react-dom/client";

type Props = {
  content: string;
};

// Store React roots for plot containers to prevent duplicate creation
const plotRoots = new WeakMap<HTMLElement, Root>();

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

  // Handle hash scrolling on mount and hash changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        // Remove the # symbol
        const id = hash.substring(1);
        // Use a small delay to ensure content is rendered
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    };

    // Scroll on mount if hash exists
    scrollToHash();

    // Listen for hash changes
    window.addEventListener('hashchange', scrollToHash);

    return () => {
      window.removeEventListener('hashchange', scrollToHash);
    };
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

  // Add anchor links to headings for easy copying
  useEffect(() => {
    const markdownContainer = document.querySelector(`.${markdownStyles.markdown}`);
    if (!markdownContainer) return;

    const headings = markdownContainer.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6');

    headings.forEach(heading => {
      // Skip if already processed
      if (heading.querySelector('.heading-anchor')) return;

      const id = heading.id;
      if (!id) return;

      // Make heading clickable
      heading.style.cursor = 'pointer';
      heading.classList.add('heading-with-anchor');

      // Create anchor link icon
      const anchor = document.createElement('a');
      anchor.href = `#${id}`;
      anchor.className = 'heading-anchor';
      anchor.setAttribute('aria-label', 'Copy link to this section');
      anchor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

      // Prevent default anchor behavior and copy URL instead
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        navigator.clipboard.writeText(url).then(() => {
          // Show feedback
          heading.classList.add('link-copied');
          setTimeout(() => heading.classList.remove('link-copied'), 2000);
        });
      });

      // Also allow clicking the heading text to copy
      heading.addEventListener('click', (e) => {
        // Only if not clicking on a link inside the heading
        if ((e.target as HTMLElement).tagName === 'A') return;

        const url = `${window.location.origin}${window.location.pathname}#${id}`;
        navigator.clipboard.writeText(url).then(() => {
          heading.classList.add('link-copied');
          setTimeout(() => heading.classList.remove('link-copied'), 2000);
        });
      });

      heading.appendChild(anchor);
    });
  }, [content]);

  // Handle annotation tooltips with HTML content
  useEffect(() => {
    const markdownContainer = document.querySelector(`.${markdownStyles.markdown}`);
    if (!markdownContainer) return;

    const annotations = markdownContainer.querySelectorAll<HTMLElement>('.annotation');

    annotations.forEach(annotation => {
      const tooltipContent = annotation.getAttribute('data-tooltip');
      if (!tooltipContent) return;

      // Create tooltip element
      let tooltipElement = annotation.querySelector('.annotation-tooltip') as HTMLElement;
      if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'annotation-tooltip';
        tooltipElement.innerHTML = tooltipContent;
        annotation.appendChild(tooltipElement);
      }

      // Create arrow element
      let arrowElement = annotation.querySelector('.annotation-arrow') as HTMLElement;
      if (!arrowElement) {
        arrowElement = document.createElement('div');
        arrowElement.className = 'annotation-arrow';
        annotation.appendChild(arrowElement);
      }
    });
  }, [content]);

  // Hydrate plot containers with InteractivePlot components
  useEffect(() => {
    const markdownContainer = document.querySelector(`.${markdownStyles.markdown}`);
    if (!markdownContainer) return;

    const plotContainers = markdownContainer.querySelectorAll<HTMLElement>('.interactive-plot-container');

    plotContainers.forEach(async (container) => {
      const plotId = container.getAttribute('data-plot-id');
      const plotDataStr = container.getAttribute('data-plot-data');

      if (!plotId || !plotDataStr) return;

      // Decode HTML entities
      const decodedData = plotDataStr
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

      let plotData;

      // Check if this is a src reference or inline data
      try {
        const parsed = JSON.parse(decodedData);
        let annotationsSrc: string | undefined;
        let annotationIds: string | undefined;

        if (parsed.src) {
          // Fetch external JSON file
          const response = await fetch(parsed.src);
          if (!response.ok) {
            console.error(`Failed to fetch plot data from ${parsed.src}`);
            return;
          }
          const externalData = await response.json();
          plotData = {
            data: externalData.data,
            layout: externalData.layout || {},
          };
          // Check for annotation metadata in external file
          annotationsSrc = parsed.annotationsSrc || externalData.annotationsSrc;
          annotationIds = parsed.annotationIds || externalData.annotationIds;
        } else {
          // Inline data
          plotData = parsePlotData(decodedData);
          // Check for annotation metadata in inline data
          annotationsSrc = parsed.annotationsSrc;
          annotationIds = parsed.annotationIds;
        }

        // Early return if plotData is null
        if (!plotData) {
          console.error(`Failed to parse plot data for ${plotId}`);
          return;
        }

        // Load and apply annotations if specified
        if (annotationsSrc) {
          const annotations = await loadAnnotationsFromFile(annotationsSrc);
          const filteredAnnotations = annotationIds
            ? filterAnnotations(annotations, annotationIds)
            : annotations;

          if (filteredAnnotations.length > 0) {
            // Import annotation utilities to apply annotations
            const { applyAnnotationsToLayout } = await import("@/lib/annotation-utils");
            const { shapes, annotations: layoutAnnotations } = applyAnnotationsToLayout(
              filteredAnnotations,
              plotData.layout?.shapes as Partial<import("plotly.js-basic-dist").Shape>[] | undefined,
              plotData.layout?.annotations as Partial<import("plotly.js-basic-dist").Annotations>[] | undefined
            );
            plotData.layout = {
              ...plotData.layout,
              shapes: shapes as typeof plotData.layout.shapes,
              annotations: layoutAnnotations as typeof plotData.layout.annotations,
            };
          }
        }
      } catch (error) {
        console.error(`Failed to parse plot data for ${plotId}:`, error);
        return;
      }

      if (!plotData) {
        console.error(`Failed to parse plot data for ${plotId}`);
        return;
      }

      // Create or reuse React root for this container
      import('react-dom/client').then(({ createRoot }) => {
        let root = plotRoots.get(container);

        if (!root) {
          // First time: create new root
          root = createRoot(container);
          plotRoots.set(container, root);
        }

        // Render (or re-render) the plot
        root.render(
          <InteractivePlot
            data={plotData.data}
            layout={plotData.layout}
            id={plotId}
          />
        );
      });
    });

    // Cleanup function to unmount plots when content changes
    return () => {
      plotContainers.forEach((container) => {
        const root = plotRoots.get(container);
        if (root) {
          root.unmount();
          plotRoots.delete(container);
        }
      });
    };
  }, [content]);

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

        .table-container {
          margin: 2rem 0;
          display: block;
        }
        .table-container table {
          margin: 0 !important;
        }
        .table-caption {
          margin: 0.5rem 0 0 0;
          text-align: center;
          font-size: 0.875rem;
          color: var(--theme-neon-cyan);
          display: block;
        }
        .table-caption strong {
          font-weight: bold;
          color: var(--theme-neon-pink);
        }
        .table-ref {
          font-weight: 500;
          color: var(--theme-neon-cyan);
        }
        .table-ref:hover {
          color: var(--theme-neon-pink);
          text-shadow: 0 0 10px currentColor;
        }

        .annotation {
          position: relative;
          display: inline-block;
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

        .annotation-tooltip {
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

        .annotation-arrow {
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

        .annotation:hover .annotation-tooltip,
        .annotation:focus .annotation-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(0);
        }

        .annotation:hover .annotation-arrow,
        .annotation:focus .annotation-arrow {
          opacity: 1;
          visibility: visible;
        }

        @media (max-width: 768px) {
          .annotation-tooltip {
            position: fixed;
            bottom: auto;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 280px;
            margin-bottom: 0;
            font-size: 0.8125rem;
          }

          .annotation-arrow {
            display: none;
          }
        }

        /* Alert boxes styling */
        .alert-box {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          position: relative;
        }

        .alert-box:hover {
          transform: translateY(-2px);
        }

        .alert-icon {
          font-size: 1.5rem;
          line-height: 1;
          font-weight: bold;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          text-shadow: 0 0 10px currentColor;
        }

        .alert-content {
          flex: 1;
          color: var(--theme-text-primary);
        }

        .alert-content p {
          margin: 0;
        }

        .alert-content p + p {
          margin-top: 0.75rem;
        }

        /* Info alert - Cyan */
        .alert-info {
          border: 2px solid var(--theme-neon-cyan);
          box-shadow: 0 0 20px rgba(0, 160, 208, 0.2);
          background: linear-gradient(135deg, rgba(0, 160, 208, 0.15) 0%, var(--theme-bg-secondary) 100%);
        }

        .alert-info:hover {
          box-shadow: 0 0 30px rgba(0, 160, 208, 0.4);
        }

        .alert-info .alert-icon {
          color: var(--theme-neon-cyan);
        }

        /* Warning alert - Orange */
        .alert-warning {
          border: 2px solid var(--theme-neon-orange);
          box-shadow: 0 0 20px rgba(255, 108, 17, 0.2);
          background: linear-gradient(135deg, rgba(255, 108, 17, 0.15) 0%, var(--theme-bg-secondary) 100%);
        }

        .alert-warning:hover {
          box-shadow: 0 0 30px rgba(255, 108, 17, 0.4);
        }

        .alert-warning .alert-icon {
          color: var(--theme-neon-orange);
        }

        /* Success alert - Green */
        .alert-success {
          border: 2px solid var(--theme-neon-green);
          box-shadow: 0 0 20px rgba(32, 229, 22, 0.2);
          background: linear-gradient(135deg, rgba(32, 229, 22, 0.15) 0%, var(--theme-bg-secondary) 100%);
        }

        .alert-success:hover {
          box-shadow: 0 0 30px rgba(32, 229, 22, 0.4);
        }

        .alert-success .alert-icon {
          color: var(--theme-neon-green);
        }

        /* Danger alert - Red/Pink */
        .alert-danger {
          border: 2px solid var(--theme-danger-red);
          box-shadow: 0 0 20px rgba(230, 25, 75, 0.2);
          background: linear-gradient(135deg, rgba(230, 25, 75, 0.15) 0%, var(--theme-bg-secondary) 100%);
        }

        .alert-danger:hover {
          box-shadow: 0 0 30px rgba(230, 25, 75, 0.4);
        }

        .alert-danger .alert-icon {
          color: var(--theme-danger-red);
        }

        /* Responsive adjustments for alert boxes */
        @media (max-width: 768px) {
          .alert-box {
            padding: 1rem;
            gap: 0.75rem;
          }

          .alert-icon {
            font-size: 1.25rem;
            width: 1.5rem;
            height: 1.5rem;
          }
        }

        /* Heading anchor links */
        .heading-with-anchor {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .heading-with-anchor:hover {
          text-decoration: none;
        }

        .heading-anchor {
          opacity: 0;
          margin-left: 0.5rem;
          color: var(--theme-text-secondary);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }

        .heading-anchor svg {
          width: 0.75em;
          height: 0.75em;
        }

        .heading-with-anchor:hover .heading-anchor,
        .heading-anchor:focus {
          opacity: 1;
          color: var(--theme-neon-cyan);
        }

        .heading-anchor:hover {
          color: var(--theme-neon-pink);
          text-shadow: 0 0 10px currentColor;
          transform: scale(1.1);
        }

        /* Copied feedback */
        .link-copied {
          position: relative;
        }

        .link-copied::after {
          content: 'Link copied!';
          position: absolute;
          left: 0;
          top: 100%;
          transform: translateY(0.25rem);
          background: var(--theme-bg-secondary);
          color: var(--theme-neon-green);
          border: 1px solid var(--theme-neon-green);
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
          animation: fadeInOut 2s ease forwards;
          box-shadow: 0 0 10px rgba(32, 229, 22, 0.3);
          z-index: 10;
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(0); }
          15% { opacity: 1; transform: translateY(0.25rem); }
          85% { opacity: 1; transform: translateY(0.25rem); }
          100% { opacity: 0; transform: translateY(0.25rem); }
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