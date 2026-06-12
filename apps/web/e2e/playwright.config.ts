// ═══════════════════════════════════════════════════════════════
// PLAYWRIGHT CONFIG — Task #54 (WCAG 2.2 AA, verified every PR)
// apps/web/e2e/playwright.config.ts
//
// WHAT THIS IS
//   Layer 3 of the Datun accessibility testing pyramid — real-browser
//   end-to-end audits:
//
//     L1  Static analysis      eslint-plugin-jsx-a11y  (Phase 1)
//     L2  Component tests      axe-core in vitest      (this PR)
//     L3  E2E page audits   ←  THIS CONFIG + e2e/a11y/*.spec.ts
//     L4  Human audits         NVDA/VoiceOver protocol (Phase 3)
//
//   This file also CLOSES a known regression from the 10 Jun 26
//   audit: "Playwright E2E config entirely absent". The harness it
//   establishes is general-purpose — future functional E2E suites
//   (consult flow #55–66, clinics #76–99) drop new spec folders next
//   to e2e/a11y/ and inherit everything here.
//
// HOW IT RUNS
//   Local : `pnpm --filter web test:e2e`
//           If a dev/prod server is already on :3000 it is reused
//           (reuseExistingServer below) — keep `pnpm dev` running in
//           another terminal and specs execute against it instantly.
//           With no server running, Playwright boots `pnpm start`,
//           which requires a prior `pnpm build` (Next.js production
//           server). The error message in that case says exactly
//           that — no silent weirdness.
//   CI    : .github/workflows/a11y.yml builds web first (mirroring
//           lighthouse-ci.yml step-for-step), then this config boots
//           the REAL production server — we audit what patients get,
//           not a dev-mode approximation.
//
// INTERLINKS VERIFIED (2026-06-12)
//   • apps/web/package.json scripts: dev/start both serve :3000.
//   • proxy.ts redirects '/' → '/hi' ONLY when Accept-Language
//     detection resolves Hindi. `locale: 'en-US'` below pins every
//     context to English so navigation assertions are deterministic;
//     the Hindi surface is tested EXPLICITLY in keyboard-nav spec
//     via direct /hi navigation (which bypasses detection).
//   • apps/web/tsconfig.json `include: ["**/*.ts", …]` type-checks
//     this folder under `check-types` — @playwright/test in
//     devDependencies makes that pass; no tsconfig surgery needed.
//   • vitest.config.ts `include` only matches *.test.{ts,tsx} —
//     these *.spec.ts files are invisible to the unit runner by
//     construction. Do NOT rename specs to *.test.ts.
// ═══════════════════════════════════════════════════════════════

import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  // Specs live beside this config — e2e/a11y/*.a11y.spec.ts today,
  // future suites in sibling folders tomorrow.
  testDir: '.',
  testMatch: '**/*.spec.ts',

  // Each a11y spec is independent (no shared login state, no order
  // coupling) — full parallelism is free speed.
  fullyParallel: true,

  // A lone `test.only` left in a PR silently shrinks the audit
  // surface to one test. In CI that is a gate-bypass — fail loudly.
  forbidOnly: !!process.env.CI,

  // axe results are deterministic, but the app under test streams,
  // hydrates, and animates — one retry absorbs cold-start flake on
  // shared CI runners without masking real regressions (a violation
  // fails twice identically; a timing wobble doesn't).
  retries: process.env.CI ? 2 : 0,

  // Shared runners are slower than a dev laptop; cap workers in CI
  // so the Next.js server isn't starved while specs hammer it.
  workers: process.env.CI ? 2 : undefined,

  // list = readable CI logs; html = the report artifact that
  // a11y.yml uploads for 90 days (open=never: CI must not block on
  // a local-only report server).
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  // Per-test ceiling. Axe analysis of a hydrated page is ~1–3s; 45s
  // covers server cold-start on the first test of a worker.
  timeout: 45_000,

  expect: {
    // Web-first assertions (toBeVisible, toHaveText…) retry up to
    // this long — covers streamed/hydrating content.
    timeout: 10_000,
  },

  use: {
    baseURL: BASE_URL,

    // ── Determinism pins ──
    // en-US: keeps proxy.ts locale detection on the English path
    // (see INTERLINKS above). The Hindi page is still audited — by
    // explicit URL, not by header roulette.
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',

    // Animations are noise for a11y assertions (focus/landmark/
    // contrast checks don't care about easing curves) and the app
    // ships first-class reduced-motion support (Task #50) — so the
    // audit runs on that honest, stable surface.
    // (Playwright 1.60: reducedMotion lives under contextOptions —
    // the old top-level shorthand was removed; verified against the
    // 1.60 type definitions' own usage example.)
    // serviceWorkers 'block' (r3 hardening): the production server
    // registers /sw.js on every fresh context — first-visit install /
    // activation reloads are an entire class of mid-audit
    // nondeterminism (and the WCAG verdict never depends on a SW).
    contextOptions: { reducedMotion: 'reduce', serviceWorkers: 'block' },

    // Forensics on failure only — keeps green runs fast and the
    // artifact small.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    // Desktop — the clinic-side reality and the Lighthouse baseline
    // viewport family.
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile — India is a 95% mobile market (memory rule; Task #35
    // mobile-first system). Target Size 2.5.8 and focus-visibility
    // failures are MOST likely to surface at this width, so the
    // entire a11y suite runs here too, not a token subset.
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],

  // Playwright owns the server lifecycle: boots the production
  // build, waits for first byte, kills it after the run. Locally,
  // an already-running :3000 (your `pnpm dev`) is reused instead.
  webServer: {
    command: 'pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
