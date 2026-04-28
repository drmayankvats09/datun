// ═══════════════════════════════════════════════════════════════
// USE-VIEWPORT-SIZE — Reactive viewport width + height
// P3-F17: SSR default = mobile-first (375×667) to minimize layout shift
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';

interface ViewportSize {
  width: number;
  height: number;
}

// Mobile-first default — 95% of Indian users are mobile
const SSR_DEFAULT: ViewportSize = { width: 375, height: 667 };

export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(SSR_DEFAULT);

  useEffect(() => {
    // Immediate set on mount (no debounce for first read)
    setSize({ width: window.innerWidth, height: window.innerHeight });

    let timeout: ReturnType<typeof setTimeout>;

    function update() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    }

    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      clearTimeout(timeout);
    };
  }, []);

  return size;
}
