"use client";

import { useState, useEffect, useMemo, useId, type ReactElement, type RefObject } from "react";
import { scrollToElement } from "@/lib/scroll-to-element";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

interface HeadingNode extends HeadingItem {
  children: HeadingNode[];
}

interface TableOfContentsProps {
  containerRef: RefObject<HTMLElement | null>;
  content: string;
  ready: boolean;
}

export function TableOfContents({ containerRef, content, ready }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const tocId = useId();

  const headingTree = useMemo(() => {
    const roots: HeadingNode[] = [];
    const ancestors: HeadingNode[] = [];

    for (const heading of headings) {
      const node: HeadingNode = { ...heading, children: [] };
      // A skipped heading level still belongs to the nearest shallower heading.
      while (ancestors.length && ancestors[ancestors.length - 1].level >= node.level) {
        ancestors.pop();
      }
      const parent = ancestors[ancestors.length - 1];
      (parent ? parent.children : roots).push(node);
      ancestors.push(node);
    }

    return roots;
  }, [headings]);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const elements = containerRef.current.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]");
    setHeadings(Array.from(elements, (element) => ({
      id: element.id,
      text: element.textContent || "",
      level: Number(element.tagName[1]),
      element,
    })));
    setExpandedIds(new Set());
    setActiveId("");
    setIsOpen(false);
  }, [containerRef, content, ready]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const updateLayout = () => {
      setIsMobile(!desktop.matches);
      if (desktop.matches) setIsOpen(false);
    };
    updateLayout();
    desktop.addEventListener("change", updateLayout);
    return () => desktop.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);

        if (visibleEntries.length > 0) {
          const mostVisible = visibleEntries.reduce((prev, current) =>
            prev.intersectionRatio > current.intersectionRatio ? prev : current
          );
          setActiveId(mostVisible.target.id);
        }
      },
      {
        rootMargin: "-20% 0% -70% 0%",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    headings.forEach(({ element }) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const element = headings.find((heading) => heading.id === id)?.element;
    if (element) {
      scrollToElement(element);

      if (isMobile) {
        setIsOpen(false);
      }
    }
  };

  const toggleHeading = (id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderHeadings = (nodes: HeadingNode[]): ReactElement[] => nodes.map((heading) => {
    const hasChildren = heading.children.length > 0;
    const expanded = expandedIds.has(heading.id);
    const active = activeId === heading.id;
    const childrenId = `${tocId}-children-${heading.id}`;

    return (
      <li key={heading.id}>
        <div
          className={`flex min-w-0 rounded border-l-2 transition-colors duration-200 ${
            active
              ? 'bg-[var(--theme-neon-cyan)]/20 border-[var(--theme-neon-cyan)]'
              : 'border-transparent hover:bg-[var(--theme-bg-accent)]/50'
          }`}
          style={{
            color: active ? 'var(--theme-neon-cyan)' : `var(--theme-heading-${heading.level})`,
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleHeading(heading.id)}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${heading.text}`}
              aria-expanded={expanded}
              aria-controls={childrenId}
              className={`flex shrink-0 items-center justify-center rounded hover:bg-[var(--theme-neon-cyan)]/10 focus-visible:outline-2 focus-visible:outline-[var(--theme-neon-cyan)] ${!isMobile ? 'w-6' : 'w-8'}`}
            >
              <svg
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="m6 3 5 5-5 5" />
              </svg>
            </button>
          ) : (
            <span aria-hidden="true" className={`shrink-0 ${!isMobile ? 'w-6' : 'w-8'}`} />
          )}
          <button
            type="button"
            onClick={() => scrollToHeading(heading.id)}
            aria-current={active ? 'location' : undefined}
            className={`min-w-0 flex-1 text-left [overflow-wrap:anywhere] pl-1 pr-2 rounded focus-visible:outline-2 focus-visible:outline-[var(--theme-neon-cyan)] ${!isMobile ? 'py-1.5' : 'py-2 min-h-11'}`}
            style={{
              fontSize: !isMobile
                ? heading.level === 1 ? '0.9rem' : heading.level === 2 ? '0.8rem' : heading.level === 3 ? '0.75rem' : '0.7rem'
                : heading.level === 1 ? '1rem' : heading.level === 2 ? '0.9rem' : heading.level === 3 ? '0.85rem' : '0.8rem',
            }}
          >
            {heading.text}
          </button>
        </div>
        {hasChildren && (
          <ul
            id={childrenId}
            hidden={!expanded}
            className="mt-1 space-y-1"
            style={{ paddingLeft: !isMobile ? '8px' : '12px' }}
          >
            {renderHeadings(heading.children)}
          </ul>
        )}
      </li>
    );
  });

  const headingsList = (
    <nav aria-label="Table of contents" className="px-1 py-2">
      <ul className="space-y-1">{renderHeadings(headingTree)}</ul>
    </nav>
  );

  if (headings.length < 2) {
    return null;
  }

  if (!isMobile) {
    return (
      <div
        className="toc-chrome bg-[var(--theme-bg-secondary)]/95 backdrop-blur-lg border border-[var(--theme-border)] rounded-lg overflow-hidden shadow-[0_0_30px_rgba(255,108,17,0.2)]"
        style={{
          position: 'fixed',
          top: '2rem',
          width: '16rem',
          maxHeight: 'calc(100vh - 4rem)',
          zIndex: 10,
          left: 'max(1rem, calc((100vw - 80rem) / 2))',
        }}
      >
        <div className="p-4 border-b border-[var(--theme-border)]">
          <h3 className="text-sm font-semibold text-[var(--theme-neon-cyan)]">
            Table of Contents
          </h3>
        </div>
        <div className="max-h-[70vh] overflow-x-hidden overflow-y-auto">
          {headingsList}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="toc-chrome toc-mobile-toggle fixed bottom-6 right-6 z-50 w-14 h-14 bg-[var(--theme-bg-secondary)] border-2 rounded-full flex items-center justify-center transition-colors duration-300"
        aria-label="Toggle table of contents"
        aria-expanded={isOpen}
        aria-controls={`${tocId}-panel`}
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
        <span className="absolute -top-2 -right-2 bg-[var(--theme-neon-orange)] text-[var(--theme-bg-primary)] text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
          {headings.length}
        </span>
      </button>
      <div className="fixed inset-0 z-40 pointer-events-none">
        {isOpen && (
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsOpen(false)}
          />
        )}
        <div
          id={`${tocId}-panel`}
          inert={!isOpen}
          className={`
            absolute bottom-0 left-0 right-0 transform transition-transform duration-300 pointer-events-auto
            ${isOpen ? 'translate-y-0' : 'translate-y-full'}
            bg-[var(--theme-bg-secondary)]/95 backdrop-blur-lg
            border border-[var(--theme-border)]
            rounded-t-2xl
            overflow-hidden shadow-[0_0_30px_rgba(255,108,17,0.2)] toc-chrome
          `}
        >
          <div className="p-4 border-b border-[var(--theme-border)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--theme-neon-cyan)]">
                Table of Contents
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close table of contents"
                className="text-[var(--theme-neon-cyan)] hover:text-[var(--theme-neon-orange)] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="max-h-[40vh] overflow-x-hidden overflow-y-auto">
            {headingsList}
          </div>
        </div>
      </div>
    </>
  );
}
