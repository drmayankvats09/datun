// ═══════════════════════════════════════════════════════════════
// DEVTOOLS CONFIG — Single source of truth for Redux DevTools
// Pattern: Stripe Internal — one toggle, one place, zero leaks.
//
// Why centralized:
// - Production safety guarantee (no devtools leak in prod build)
// - Test runner detection (Cypress / Playwright run cleanly)
// - SSR safety (no `window` access during server render)
// - Future-proof: 10+ stores will reference this, one toggle for all.
//
// Risk surface: Redux DevTools extension in production exposes
// every state transition + user data + auth tokens to any browser
// extension inspecting the page. Security audit = fail.
// We eliminate the foot-gun here, in ONE file, forever.
// ═══════════════════════════════════════════════════════════════

/**
 * Compute whether Redux DevTools integration should be enabled at runtime.
 *
 * Returns `true` only when ALL of the following hold:
 *   - Build is `development` (Next.js inlines `process.env.NODE_ENV` at
 *     build time, so production bundles will tree-shake this branch away).
 *   - We're running in a browser (`window` exists).
 *   - Cypress is NOT driving the page (it sets `window.Cypress`).
 *   - Playwright / WebDriver is NOT driving the page
 *     (it sets `navigator.webdriver`).
 *
 * Returning `false` causes Zustand's `devtools` middleware to skip
 * connecting to the Redux DevTools extension — zero overhead, zero leak.
 */
function computeDevtoolsEnabled(): boolean {
  // Build-time check — Next.js replaces this with literal `false` in prod.
  if (process.env.NODE_ENV !== 'development') return false;

  // Runtime check — SSR has no window.
  if (typeof window === 'undefined') return false;

  // Cypress E2E test runner sets `window.Cypress`. Skip devtools to keep
  // E2E logs clean and to avoid spurious extension-not-found errors in CI.
  if ((window as unknown as { Cypress?: unknown }).Cypress !== undefined) {
    return false;
  }

  // Playwright / generic WebDriver sets `navigator.webdriver = true`.
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    return false;
  }

  return true;
}

/**
 * Whether Redux DevTools integration should be enabled for Zustand stores.
 *
 * Read by every store's `devtools()` middleware via the `enabled` option.
 * Computed once at module load — value is stable for the page lifetime.
 *
 * @example
 * ```ts
 * import { create } from 'zustand';
 * import { devtools, persist } from 'zustand/middleware';
 * import { devtoolsEnabled, devtoolsName } from './devtools-config';
 *
 * const useStore = create<State>()(
 *   devtools(
 *     persist(initializer, { name: 'my-store' }),
 *     { name: devtoolsName('MyDomain'), enabled: devtoolsEnabled },
 *   ),
 * );
 * ```
 */
export const devtoolsEnabled: boolean = computeDevtoolsEnabled();

/**
 * Format a Redux DevTools store name with the Datun namespace.
 *
 * Pattern `Datun/<Domain>` — namespaced so if a user has the same Redux
 * DevTools extension active across multiple apps, our stores are visually
 * grouped under "Datun".
 *
 * @param domain - Logical store domain in PascalCase (e.g., 'Auth', 'Consultation', 'UI')
 * @returns Formatted store name for the Redux DevTools UI dropdown
 *
 * @example
 * ```ts
 * devtoolsName('Auth')         // → 'Datun/Auth'
 * devtoolsName('Consultation') // → 'Datun/Consultation'
 * ```
 */
export function devtoolsName(domain: string): string {
  return `Datun/${domain}`;
}
