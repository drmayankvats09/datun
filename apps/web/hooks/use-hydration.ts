// ═══════════════════════════════════════════════════════════════
// USE-HYDRATION — Prevents SSR ↔ client state mismatch
//
// Problem: Next.js server pe render karta hai → server pe
// localStorage nahi hota → Zustand persist ka data server pe
// empty hota hai → client pe hydrate hota hai → MISMATCH FLASH.
// User ko 1 frame ke liye "logged out" dikhta hai phir "logged in"
// jump hota hai — unprofessional, Stripe/Notion kabhi nahi karte.
//
// Solution: useHydration waits until client hydration is complete.
// Until then, components show loading/skeleton state.
// Zero flash. Zero layout shift. Clean transition.
//
// Pattern: Zustand docs official recommendation + Google/Vercel
// internal pattern for SSR apps with client-side persistence.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

/**
 * Returns `true` once Zustand stores have hydrated from localStorage.
 * Use this to prevent flash of wrong state on SSR pages.
 *
 * Components should show skeleton/loading state until hydrated.
 * After hydration, Zustand persist data is available and accurate.
 *
 * @returns {boolean} `false` during SSR + first render, `true` after hydration
 *
 * @example
 * ```tsx
 * const hydrated = useHydration();
 * if (!hydrated) return <Skeleton />;
 * return <Dashboard user={useAuthStore(s => s.user)} />;
 * ```
 *
 * @example
 * ```tsx
 * // In consultation page — show loading until store hydrates
 * const hydrated = useHydration();
 * const messages = useConsultationStore(s => s.messages);
 * if (!hydrated) return <ChatSkeleton />;
 * return <ChatWindow messages={messages} />;
 * ```
 */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
