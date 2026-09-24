"use client";

import { useEffect, useState } from "react";

import { THEME_EVENT, THEME_STORAGE_KEY } from "@/lib/theme-boot";

function applyTheme(paper: boolean) {
  if (paper) {
    localStorage.setItem(THEME_STORAGE_KEY, "paper");
    document.documentElement.dataset.theme = "paper";
  } else {
    localStorage.removeItem(THEME_STORAGE_KEY);
    delete document.documentElement.dataset.theme;
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle() {
  const [paper, setPaper] = useState(false);

  useEffect(() => {
    const sync = () => setPaper(document.documentElement.dataset.theme === "paper");
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  return (
    <button
      type="button"
      aria-pressed={paper}
      aria-label="Paper theme"
      title="Paper theme"
      onClick={() => {
        const next = document.documentElement.dataset.theme !== "paper";
        applyTheme(next);
      }}
      className="theme-toggle fixed top-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border-2 border-synthwave-neon-cyan bg-synthwave-dark-purple text-synthwave-neon-cyan hover:text-synthwave-neon-orange"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={paper ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3.5h7.2L19 8.2V20.5H7z" strokeLinejoin="round" />
        <path d="M14 3.8V8.4h4.4" strokeLinejoin="round" />
        <path d="M9.5 12.5h5.5M9.5 16h5.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}
