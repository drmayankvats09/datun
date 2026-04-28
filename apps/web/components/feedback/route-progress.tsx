'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const isFirst = useRef(true);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    if (trickleRef.current) clearInterval(trickleRef.current);
    if (completeRef.current) clearTimeout(completeRef.current);

    // P4-F12: Start at 30%, trickle to 90%, complete when pathname settles
    setLoading(true);
    setProgress(30);

    let current = 30;
    trickleRef.current = setInterval(() => {
      current = Math.min(current + (90 - current) * 0.1, 90);
      setProgress(current);
    }, 200);

    completeRef.current = setTimeout(() => {
      if (trickleRef.current) clearInterval(trickleRef.current);
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
    }, 100);

    return () => {
      if (trickleRef.current) clearInterval(trickleRef.current);
      if (completeRef.current) clearTimeout(completeRef.current);
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
          transition: 'width 200ms cubic-bezier(0.4,0,0.2,1), opacity 250ms ease',
        }}
      />
    </div>
  );
}
