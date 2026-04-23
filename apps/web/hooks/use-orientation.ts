// ═══════════════════════════════════════════════════════════════
// USE-ORIENTATION — Portrait vs Landscape detection
// Critical for: tablet layouts, consultation chat on landscape.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';

type Orientation = 'portrait' | 'landscape';

/**
 * Returns current device orientation.
 * Uses screen.orientation API with matchMedia fallback.
 *
 * @example
 * const orientation = useOrientation();
 * if (orientation === 'landscape') return <WideLayout />;
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    function update() {
      if (screen.orientation) {
        setOrientation(screen.orientation.type.startsWith('portrait') ? 'portrait' : 'landscape');
      } else {
        setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
      }
    }

    update();

    if (screen.orientation) {
      screen.orientation.addEventListener('change', update);
      return () => screen.orientation.removeEventListener('change', update);
    } else {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, []);

  return orientation;
}
