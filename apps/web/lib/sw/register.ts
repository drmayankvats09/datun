// apps/web/lib/sw/register.ts
// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER REGISTRATION — Task #52 Phase 5
//
// Tiny helper that registers `/sw.js`. Called from AppProvider's
// useEffect — runs once per page load, idempotent, never throws.
//
// Behaviour:
//   - PROD only — SW disabled in dev to avoid stale-asset confusion.
//   - Feature-detects `serviceWorker` in navigator (graceful no-op
//     for browsers that don't support it — very rare in 2026).
//   - Registers at scope '/' so the SW controls every route.
//   - Returns the registration so callers (a future "update available"
//     toast) can listen for the `updatefound` event.
//
// Why this is a separate file:
//   - AppProvider is a 'use client' React component. Module-level
//     side effects there would re-run during HMR; keeping SW
//     registration in its own module makes the boundary explicit
//     and testable in isolation.
//   - Future Task #214 (full PWA) will replace this with a richer
//     module (precaching, background-sync registration). Keeping the
//     surface area small makes that migration a one-import change.
//
// References:
//   - https://web.dev/articles/service-worker-lifecycle
//   - https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
// ═══════════════════════════════════════════════════════════════

/**
 * Register the service worker. Returns the resulting registration,
 * or `null` if the environment doesn't support SW (or registration
 * fails). NEVER throws — call site doesn't need a try/catch.
 *
 * @example
 *   useEffect(() => {
 *     if (process.env.NODE_ENV !== 'production') return;
 *     void registerServiceWorker();
 *   }, []);
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // ── Feature detect ──
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  // ── Dev mode — skip ──
  //
  // Stale service workers are the #1 cause of "why doesn't my dev
  // change show up?" pain. Disable in non-production and unregister
  // any leftover SW from a previous prod build the developer ran.
  if (process.env['NODE_ENV'] !== 'production') {
    void unregisterAll();
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      // Browsers default updateViaCache='imports' which can cache the
      // SW script itself for up to 24h. 'none' forces the SW script
      // to bypass the HTTP cache every time the page checks for an
      // update — matches the Cache-Control: no-store header we set
      // for /sw.js in next.config.ts.
      updateViaCache: 'none',
    });

    // ── Optional: trigger an immediate update check ──
    //
    // The browser auto-checks for SW updates ~24h after registration.
    // For Datun we want faster propagation of releases, so we
    // proactively call update() once on every page load. The SW
    // header `Cache-Control: no-store` (set in next.config.ts)
    // makes this cheap — a single HEAD-ish round trip per session.
    void registration.update().catch(() => {
      // Update can fail if the SW byte-compare reveals no changes —
      // that's the expected case 99% of the time, silent is correct.
    });

    return registration;
  } catch (error) {
    // Registration can fail under CSP misconfig, quota errors, or
    // when the SW script itself has a parse error. We surface the
    // failure via console (dev tools always-on) but never throw —
    // the page is still functional without the SW.
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        '[SW] registration failed:',
        error instanceof Error ? error.message : String(error),
      );
    }
    return null;
  }
}

/**
 * Unregister every service worker on the current origin. Called from
 * dev mode to clean up leftover SWs from previous prod builds.
 * Idempotent — safe to call repeatedly.
 */
async function unregisterAll(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Ignore — dev cleanup is best-effort.
  }
}

/**
 * Imperatively instruct the active waiting SW to skip-waiting and
 * become the active SW. Pair this with a UI "Update available"
 * affordance — see future Task #214 wiring.
 *
 * @example
 *   <button onClick={() => promoteWaitingServiceWorker(registration)}>
 *     Reload to update
 *   </button>
 */
export function promoteWaitingServiceWorker(registration: ServiceWorkerRegistration): void {
  const waiting = registration.waiting;
  if (!waiting) return;
  // The SW listens for { type: 'SKIP_WAITING' } and calls skipWaiting().
  waiting.postMessage({ type: 'SKIP_WAITING' });
}
