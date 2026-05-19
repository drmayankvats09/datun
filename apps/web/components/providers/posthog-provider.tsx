// apps/web/components/providers/posthog-provider.tsx
// ═══════════════════════════════════════════════════════════════
// POSTHOG PROVIDER — Client-side analytics + flag bootstrap (Task #49)
// ─────────────────────────────────────────────────────────────────
// Mounted near the top of the React tree (inside QueryProvider so
// it can read the auth store via hooks, ABOVE ThemeProvider so it
// runs before any flag-gated UI mounts).
//
// Responsibilities:
//   1. Boot the PostHog browser SDK ONCE on first mount.
//   2. Identify the user on login / clear identity on logout, so
//      events outside of an authenticated session don't bleed into
//      a logged-in user's funnel.
//   3. Emit a route-aware `$pageview` event on every Next.js App
//      Router navigation. Autocapture's URL detector misfires on
//      RSC streaming — explicit tracking is the official workaround.
//
// Renders no markup — pass-through wrapper around children.
//
// Reference patterns:
//   - PostHog "Next.js App Router" docs (May 2025 revision).
//   - Vercel Analytics' `<Analytics />` SPA-aware tracker.
//   - Stripe's `<AnalyticsProvider>` (Stripe.js identify-on-auth).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  initPostHog,
  capturePostHogEvent,
  identifyPostHogUser,
  resetPostHogIdentity,
  type FlagMap,
} from '@/lib/posthog';
import { useAuthStore } from '@/stores';

interface PostHogProviderProps {
  readonly children: React.ReactNode;
  /**
   * SSR-evaluated flag snapshot, forwarded into the SDK init so
   * the very first paint already has accurate flag values. When
   * omitted (or empty), the SDK fetches its own decide payload —
   * fine, but introduces a brief flicker window.
   */
  readonly bootstrap?: FlagMap;
}

export function PostHogProvider({ children, bootstrap }: PostHogProviderProps) {
  const user = useAuthStore((s) => s.user);
  const previousUserId = useRef<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── 1. Init the SDK once on mount ──
  // The effect runs in the client only (provider is 'use client').
  // Re-renders do not re-init — `initPostHog` is idempotent.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
    if (!apiKey) {
      // Degraded mode — no PostHog. App still functions, flags come
      // exclusively from /api/flags via the TanStack hook.
      return;
    }
    void initPostHog({
      apiKey,
      host,
      autocapture: process.env.NODE_ENV === 'production',
      bootstrap,
    });
  }, [bootstrap]);

  // ── 2. Identify / reset on auth changes ──
  useEffect(() => {
    const nextUserId = user?.id ?? null;
    const prevUserId = previousUserId.current;
    if (nextUserId && nextUserId !== prevUserId) {
      // Logged in (or user-id rotated — rare edge after refresh).
      identifyPostHogUser(nextUserId, {
        email: user?.email,
        role: user?.role,
      });
      previousUserId.current = nextUserId;
    } else if (!nextUserId && prevUserId) {
      // Logged out.
      resetPostHogIdentity();
      previousUserId.current = null;
    }
  }, [user?.id, user?.email, user?.role]);

  // ── 3. Pageview tracking — App Router-aware ──
  // Effect fires on every navigation because pathname/searchParams
  // are reactive. We assemble the URL exactly the way the browser
  // address bar renders it so funnels join cleanly with referrer data.
  useEffect(() => {
    if (!pathname) return;
    const search = searchParams?.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    capturePostHogEvent('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
