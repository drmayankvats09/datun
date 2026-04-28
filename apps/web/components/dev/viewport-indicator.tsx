// ═══════════════════════════════════════════════════════════════
// VIEWPORT INDICATOR — Dev-only breakpoint badge
// Bottom-left corner badge showing current breakpoint (sm/md/lg).
// Removed in production. Speeds up responsive debugging.
// P4-F25: Click to dismiss — debugging ke baad hatao bina refresh ke.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { useBreakpoint, useViewportSize } from '@/hooks';

export function ViewportIndicator() {
  const { current } = useBreakpoint();
  const { width } = useViewportSize();
  const [dismissed, setDismissed] = useState(false);

  if (process.env.NODE_ENV !== 'development') return null;
  if (dismissed) return null;

  return (
    <button
      onClick={() => setDismissed(true)}
      title="Click to hide"
      className="fixed bottom-4 left-4 z-[9999] flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold tracking-widest text-background uppercase opacity-70 transition-opacity hover:opacity-100 print:hidden"
    >
      <span>{current}</span>
      <span className="opacity-50">·</span>
      <span className="font-mono opacity-75">{width}px</span>
    </button>
  );
}
