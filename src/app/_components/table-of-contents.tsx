"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

interface TableOfContentsProps {
  containerSelector?: string;
  inline?: boolean; // New prop to support inline layout
}

export function TableOfContents({ containerSelector = '[class*="markdown"]', inline = false }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Extract headings from the content
  const extractHeadings = useCallback(() => {
    let container = document.querySelector(containerSelector);
    
    if (!container) {
      // Try alternative selectors
      container = document.querySelector('[class*="markdown"]') || 
                  document.querySelector('.prose') ||
                  document.querySelector('article') ||
                  document.querySelector('main');
    }
    
    if (!container) {
      return;
    }

    const headingElements = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    
    const headingItems: HeadingItem[] = [];

    headingElements.forEach((element, index) => {
      let id = element.id;
      
      // Generate ID if it doesn't exist
      if (!id) {
        id = `heading-${index}-${element.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || ""}`;
        element.id = id;
      }

      headingItems.push({
        id,
        text: element.textContent || "",
        level: parseInt(element.tagName.charAt(1)),
        element: element as HTMLElement,
      });
    });

    setHeadings(headingItems);
  }, [containerSelector]);

  // Handle responsive behavior  
  useEffect(() => {
    const handleResize = () => {
      // Use xl breakpoint (1280px) to match the layout
      setIsMobile(window.innerWidth < 1280);
      // Auto-close mobile TOC on resize to desktop
      if (window.innerWidth >= 1280) {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Setup intersection observer for active section highlighting
  useEffect(() => {
    if (headings.length === 0) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the heading that's most in view
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio and pick the one most in view
          const mostVisible = visibleEntries.reduce((prev, current) =>
            prev.intersectionRatio > current.intersectionRatio ? prev : current
          );
          setActiveId(mostVisible.target.id);
        }
      },
      {
        rootMargin: "-20% 0% -70% 0%", // Trigger when heading is in the top 30% of viewport
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    headings.forEach(({ element }) => {
      observerRef.current?.observe(element);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [headings]);

  // Extract headings when component mounts and content changes
  useEffect(() => {
    // Multiple attempts to extract headings as content loads asynchronously
    const timers: NodeJS.Timeout[] = [];
    
    // Immediate attempt
    timers.push(setTimeout(extractHeadings, 0));
    
    // Short delay for client-side rendering
    timers.push(setTimeout(extractHeadings, 100));
    
    // Medium delay for content loading
    timers.push(setTimeout(extractHeadings, 500));
    
    // Longer delay as fallback
    timers.push(setTimeout(extractHeadings, 1500));
    
    // Also listen for DOM mutations to detect when content is added
    const observer = new MutationObserver((mutations) => {
      const hasNewContent = mutations.some(mutation => 
        mutation.type === 'childList' && 
        Array.from(mutation.addedNodes).some(node => 
          node.nodeType === Node.ELEMENT_NODE &&
          (node as Element).matches?.('h1, h2, h3, h4, h5, h6, .markdown')
        )
      );
      
      if (hasNewContent) {
        setTimeout(extractHeadings, 100);
      }
    });
    
    // Observe the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [extractHeadings]);

  // Smooth scroll to heading
  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      
      // Close mobile TOC after navigation
      if (isMobile) {
        setIsOpen(false);
      }
    }
  };

  // Don't render if no headings or less than 2 headings (makes TOC more useful)
  if (headings.length < 2) {
    return null;
  }

  // For inline mode, render a simple sidebar component
  if (inline) {
    return (
      <div className="w-64 flex-shrink-0">
        <div 
          className="bg-[var(--theme-bg-secondary)]/95 backdrop-blur-lg border border-[var(--theme-border)] rounded-lg overflow-hidden shadow-[0_0_30px_rgba(255,108,17,0.2)]"
          style={{
            position: 'fixed',
            top: '2rem',
            width: '16rem', // w-64 equivalent
            maxHeight: 'calc(100vh - 4rem)',
            zIndex: 10,
            left: 'max(1rem, calc((100vw - 80rem) / 2))', // Position relative to content
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--theme-border)]">
            <h3 className="text-sm font-semibold text-[var(--theme-neon-cyan)]">
              Table of Contents
            </h3>
          </div>

          {/* Headings List */}
          <div className="max-h-[70vh] overflow-y-auto">
            <nav className="p-2">
              <ul className="space-y-1">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <button
                      onClick={() => scrollToHeading(heading.id)}
                      className={`
                        w-full text-left px-3 py-1.5 rounded transition-all duration-200
                        ${activeId === heading.id 
                          ? 'bg-[var(--theme-neon-cyan)]/20 border-l-2 border-[var(--theme-neon-cyan)] text-[var(--theme-neon-cyan)]' 
                          : 'hover:bg-[var(--theme-bg-accent)]/50 text-[var(--theme-text-primary)]'
                        }
                        hover:translate-x-1
                      `}
                      style={{
                        marginLeft: `${Math.max(0, (heading.level - 1) * 8)}px`,
                        fontSize: heading.level === 1 ? '0.9rem' : heading.level === 2 ? '0.8rem' : heading.level === 3 ? '0.75rem' : '0.7rem',
                        color: activeId === heading.id 
                          ? 'var(--theme-neon-cyan)'
                          : heading.level === 1
                            ? 'var(--theme-neon-green)'
                            : heading.level === 2 
                              ? 'var(--theme-neon-orange)' 
                              : 'var(--theme-neon-cyan)'
                      }}
                    >
                      {heading.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    );
  }

  // Original floating mode for mobile-only
  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[var(--theme-bg-secondary)] border-2 border-[var(--theme-neon-cyan)] rounded-full flex items-center justify-center hover:border-[var(--theme-neon-orange)] transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,217,255,0.5)]"
          aria-label="Toggle table of contents"
        >
          <svg
            className="w-6 h-6 text-[var(--theme-neon-cyan)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          {headings.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-[var(--theme-neon-orange)] text-[var(--theme-bg-primary)] text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {headings.length}
            </span>
          )}
        </button>
      )}

      {/* Mobile TOC Container */}
      {isMobile && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Mobile Backdrop */}
          {isOpen && (
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Mobile TOC Panel */}
          <div
            className={`
              absolute bottom-0 left-0 right-0 transform transition-transform duration-300 pointer-events-auto
              ${isOpen ? 'translate-y-0' : 'translate-y-full'}
              bg-[var(--theme-bg-secondary)]/95 backdrop-blur-lg 
              border border-[var(--theme-border)] 
              rounded-t-2xl
              overflow-hidden shadow-[0_0_30px_rgba(255,108,17,0.2)]
            `}
          >
            {/* Mobile Header */}
            <div className="p-4 border-b border-[var(--theme-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--theme-neon-cyan)]">
                  Table of Contents
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--theme-neon-cyan)] hover:text-[var(--theme-neon-orange)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Headings List */}
            <div className="max-h-[40vh] overflow-y-auto">
              <nav className="p-2">
                <ul className="space-y-1">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <button
                        onClick={() => scrollToHeading(heading.id)}
                        className={`
                          w-full text-left px-3 py-2 rounded transition-all duration-200
                          ${activeId === heading.id 
                            ? 'bg-[var(--theme-neon-cyan)]/20 border-l-2 border-[var(--theme-neon-cyan)] text-[var(--theme-neon-cyan)]' 
                            : 'hover:bg-[var(--theme-bg-accent)]/50 text-[var(--theme-text-primary)]'
                          }
                          hover:translate-x-1
                        `}
                        style={{
                          marginLeft: `${Math.max(0, (heading.level - 1) * 12)}px`,
                          fontSize: heading.level === 1 ? '1rem' : heading.level === 2 ? '0.9rem' : heading.level === 3 ? '0.85rem' : '0.8rem',
                          color: activeId === heading.id 
                            ? 'var(--theme-neon-cyan)'
                            : heading.level === 1
                              ? 'var(--theme-neon-green)'
                              : heading.level === 2 
                                ? 'var(--theme-neon-orange)' 
                                : 'var(--theme-neon-cyan)'
                        }}
                      >
                        {heading.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}