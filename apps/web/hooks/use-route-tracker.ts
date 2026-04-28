'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';
import { useUIStore } from '@/stores';

const TRACKABLE_PREFIXES = ['/dashboard', '/consult', '/settings', '/history'];

export function useRouteTracker(): void {
  const pathname = usePathname();
  const setLastVisitedRoute = useUIStore((s) => s.setLastVisitedRoute);

  useEffect(() => {
    if (TRACKABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      setLastVisitedRoute(pathname);
    }
  }, [pathname, setLastVisitedRoute]);
}
