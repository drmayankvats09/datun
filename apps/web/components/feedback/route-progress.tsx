// ═══════════════════════════════════════════════════════════════
// ROUTE PROGRESS — NProgress-style top loading bar
// Shows teal bar at top when navigating between pages.
// YouTube, GitHub, Linear — sab use karte hain.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start progress on route change
    setLoading(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(60), 100);
    const t2 = setTimeout(() => setProgress(80), 200);
    const t3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (!loading && progress === 0) return null;

  return (
    <div className="route-progress" aria-hidden="true">
      <div
        className="route-progress-bar"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: 'width 300ms ease, opacity 200ms ease 200ms',
        }}
      />
    </div>
  );
}
