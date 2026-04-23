// ═══════════════════════════════════════════════════════════════
// USE-VIEWPORT-SIZE — Reactive viewport width + height
// For components that need exact pixel values (charts, canvas).
// Debounced 100ms to prevent resize spam.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';

interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Returns current viewport { width, height } in pixels.
 * Debounced at 100ms to prevent excessive re-renders.
 * SSR-safe: returns 0x0 during server render.
 *
 * @example
 * const { width, height } = useViewportSize();
 * const chartWidth = Math.min(width - 32, 600);
 */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function update() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    }

    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      clearTimeout(timeout);
    };
  }, []);

  return size;
}
