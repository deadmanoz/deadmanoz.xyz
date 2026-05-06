'use client';

import { useEffect, useState } from 'react';

export function NotFoundPath() {
  const [path, setPath] = useState<string>('this URL');

  useEffect(() => {
    setPath(window.location.pathname || '/');
  }, []);

  return (
    <code
      className="font-mono text-[0.95em] px-1.5 py-0.5 rounded break-all"
      style={{
        backgroundColor: 'rgba(0, 160, 208, 0.08)',
        border: '1px solid rgba(0, 160, 208, 0.25)',
        color: 'var(--theme-neon-cyan)',
      }}
    >
      {path}
    </code>
  );
}
