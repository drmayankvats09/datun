// ═══════════════════════════════════════════════════════════════
// VIEWPORT INDICATOR — Dev-only breakpoint badge
// Bottom-left corner badge showing current breakpoint (sm/md/lg).
// Removed in production. Speeds up responsive debugging.
// Pattern: Tailwind CSS debug screens plugin.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useBreakpoint, useViewportSize } from '@/hooks';

export function ViewportIndicator() {
  const { current } = useBreakpoint();
  const { width } = useViewportSize();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="bg-foreground text-background fixed bottom-4 left-4 z-[9999] flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase opacity-80 print:hidden">
      <span>{current}</span>
      <span className="opacity-50">·</span>
      <span className="font-mono opacity-75">{width}px</span>
    </div>
  );
}
