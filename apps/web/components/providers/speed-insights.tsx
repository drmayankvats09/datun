// apps/web/components/providers/speed-insights.tsx
// ═══════════════════════════════════════════════════════════════
// SPEED INSIGHTS CLIENT — Task #53 (Performance Budget + Lighthouse CI)
//
// WHAT THIS IS:
//   The field half of Datun's performance system. Lighthouse CI
//   (Task #53 Phase 1) is the LAB — it measures pages on a CI machine
//   before merge. This component is the FIELD — it measures Core Web
//   Vitals (LCP / INP / CLS and friends) on REAL users' phones in
//   production and streams them to the Vercel Speed Insights
//   dashboard. Google ranks on field data at the 75th percentile, so
//   this is the number that actually decides datunai.com's SEO fate.
//
// WHY A WRAPPER instead of importing <SpeedInsights /> directly in
// the layout:
//   1. Client boundary isolation — '@vercel/speed-insights/next' is a
//      client component; wrapping it keeps the (server) layout's
//      import surface stable and gives us ONE place to tune options
//      later (e.g. `sampleRate` if volume costs ever matter) without
//      touching the layout again.
//   2. Mirrors the existing provider pattern in this folder
//      (posthog-provider, query-provider, app-provider).
//
// WHERE THE PRODUCTION GATE LIVES (and why NOT here):
//   The layout renders this component ONLY when `process.env.VERCEL`
//   is set (Vercel sets VERCEL=1 on its build/runtime). That check
//   MUST live in the server layout — a 'use client' file like this
//   one cannot read server-only env vars. The gate matters because:
//     • In Lighthouse CI / local `next start`, the app is NOT on
//       Vercel, so `/_vercel/speed-insights/script.js` would 404 →
//       a console error → Lighthouse's best-practices score dips.
//       Gating means our own perf audits stay clean.
//     • On Vercel (preview + production) the script exists and v2's
//       "resilient intake" injects the correct script/endpoint config
//       at build time — zero manual configuration.
//
// CSP / TASK #45 INTERLINK (verified, zero changes needed):
//   • Datun runs nonce-only CSP with 'strict-dynamic' (ADR-0005).
//     Under strict-dynamic, a script element created at runtime by
//     already-trusted (nonced) code — exactly how this component
//     injects its collector — inherits trust automatically. No nonce
//     prop is required, which is why none is passed.
//   • Belt-and-braces: Task #45 already allowlisted
//     `https://va.vercel-scripts.com` (script-src) and
//     `https://vitals.vercel-insights.com` (connect-src) in
//     lib/csp/allowed-origins.ts, and `connect-src 'self'` covers the
//     same-origin `/_vercel/speed-insights/*` paths. Every load/beacon
//     route is covered.
//
// DATA-FLOW SIBLINGS (so future-you doesn't double-build):
//   • hooks/use-web-vitals.ts → same vitals into SENTRY traces
//     (per-session debugging: "this slow LCP belongs to this trace").
//   • This component        → vitals into VERCEL dashboard
//     (p75 trends per route: "is the fleet getting faster?").
//   Different questions, both needed, no overlap.
// ═══════════════════════════════════════════════════════════════

'use client';

import { SpeedInsights } from '@vercel/speed-insights/next';

/**
 * Mounts Vercel Speed Insights' real-user metrics collector.
 *
 * Render this ONCE per page tree — Datun mounts it from
 * `app/[locale]/layout.tsx`, gated behind `process.env.VERCEL` (see
 * file header for why the gate lives in the server layout).
 *
 * The `/next` flavour of the package reads the App Router's current
 * route internally, so per-route grouping in the dashboard works
 * without passing any props.
 *
 * @returns The Speed Insights collector element (renders no visible UI).
 *
 * @example
 *   // app/[locale]/layout.tsx (server component)
 *   {process.env.VERCEL ? <SpeedInsightsClient /> : null}
 */
export function SpeedInsightsClient(): React.ReactElement {
  return <SpeedInsights />;
}
