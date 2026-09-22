"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import markdownStyles from "./markdown-styles.module.css";
import "./post-body.css";
import { ImageModal } from "./image-modal";
import { TableOfContents } from "./table-of-contents";
import { useAnnotationTooltips } from "./post-body/use-annotation-tooltips";
import { useHashScroll } from "./post-body/use-hash-scroll";
import { useHeadingAnchors } from "./post-body/use-heading-anchors";
import { useImageModal } from "./post-body/use-image-modal";
import { useMathJaxTypeset } from "./post-body/use-mathjax-typeset";
import { usePlotMounting } from "./post-body/use-plot-mounting";
import { useSortableTables } from "./post-body/use-sortable-tables";

type Props = {
  content: string;
};

/**
 * Renders a post's pre-rendered HTML and layers the client-side behaviour on
 * top: hash scrolling into collapses, MathJax typesetting, the image modal,
 * heading anchors, hover tooltips, sortable tables, the TOC and interactive plots.
 * DOM enhancements are composed from hooks under ./post-body.
 */
export function EnhancedPostBody({ content }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // The HTML is rendered on the server so the static export carries the
  // article; `ready` flips after hydration and gates every hook that mutates
  // the rendered DOM, so those mutations never race the hydration pass.
  const [ready, setReady] = useState(false);
  const [isWideContent, setIsWideContent] = useState(true);

  useEffect(() => {
    setReady(true);
    setIsWideContent(new URLSearchParams(window.location.search).get("wide-content") !== "false");
  }, []);

  // A fresh { __html } object each render would make React rewrite the
  // container's innerHTML on every state change, wiping everything the hooks
  // added, so the object is memoised on the content string.
  const html = useMemo(() => ({ __html: content }), [content]);

  const { modalOpen, modalImage, closeModal } = useImageModal(containerRef, content, ready);
  useHashScroll();
  useMathJaxTypeset(content, modalOpen);
  useHeadingAnchors(containerRef, content, ready);
  useSortableTables(containerRef, content, ready);
  useAnnotationTooltips(containerRef, content, ready);
  usePlotMounting(containerRef, content, ready);

  return (
    <div className={isWideContent ? "max-w-6xl mx-auto" : "max-w-2xl mx-auto"}>
      <div
        ref={containerRef}
        className={markdownStyles.markdown}
        dangerouslySetInnerHTML={html}
      />
      <TableOfContents containerRef={containerRef} content={content} ready={ready} />
      <ImageModal
        isOpen={modalOpen}
        imageSrc={modalImage.src}
        imageAlt={modalImage.alt}
        captionHtml={modalImage.captionHtml}
        onClose={closeModal}
      />
    </div>
  );
}
