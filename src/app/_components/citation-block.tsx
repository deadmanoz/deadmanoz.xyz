"use client";

import { useEffect, useState } from "react";

interface CitationBlockProps {
  author: string;
  title: string;
  year: string;
  url: string;
  siteName: string;
  lastUpdated?: string;
}

export function CitationBlock({
  author,
  title,
  year,
  url,
  siteName,
  lastUpdated,
}: CitationBlockProps) {
  const [accessed, setAccessed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAccessed(new Date().toISOString().slice(0, 10));
  }, []);

  const accessedPhrase = accessed
    ? lastUpdated
      ? ` (last updated ${lastUpdated}; accessed ${accessed})`
      : ` (accessed ${accessed})`
    : lastUpdated
    ? ` (last updated ${lastUpdated})`
    : "";

  const citation = `${author} (${year}). ${title}. ${siteName}. ${url}${accessedPhrase}.`;

  const handleCopy = async () => {
    if (!accessed) return;
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; silently no-op
    }
  };

  return (
    <details
      className="not-prose border border-synthwave-neon-cyan/30 rounded-lg bg-synthwave-card-bg/40"
      style={{ marginTop: "4rem", marginBottom: "2rem" }}
    >
      <summary className="cursor-pointer list-none px-5 py-4 text-synthwave-neon-cyan font-semibold text-2xl select-none hover:text-synthwave-neon-orange transition-colors flex items-center justify-between">
        <span>Cite this post</span>
        <span aria-hidden="true" className="text-base opacity-70">▾</span>
      </summary>
      <div className="px-5 pb-5 pt-2 space-y-3">
        <p className="text-synthwave-peach text-sm leading-relaxed font-mono break-words m-0">
          {citation}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!accessed}
          className="text-xs px-3 py-1.5 border border-synthwave-neon-cyan/50 rounded text-synthwave-neon-cyan hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </details>
  );
}
