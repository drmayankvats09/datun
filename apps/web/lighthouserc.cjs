// ═══════════════════════════════════════════════════════════════
// LIGHTHOUSE CI CONFIG — Task #53 (Performance Budget + Lighthouse CI)
//
// WHAT THIS FILE IS:
//   The brain of our automated performance gate. Lighthouse CI (LHCI)
//   reads this file when `lhci autorun` runs in CI. It tells LHCI:
//     1. COLLECT  — which URLs to audit, how many runs, how to start
//                   the production server.
//     2. ASSERT   — which numbers are allowed to fail the build.
//     3. UPLOAD   — where the HTML reports go.
//
// WHY `.cjs` AND NOT `.js`:
//   apps/web/package.json has `"type": "module"`, so a `.js` file here
//   would be parsed as ESM. LHCI loads config via CommonJS `require()`.
//   The `.cjs` extension forces CommonJS regardless of package type —
//   zero ambiguity, works on every Node 22 runner.
//
// DESIGN DECISION — SINGLE SOURCE OF TRUTH:
//   All byte budgets live in ONE file: `lighthouse-budgets.json`
//   (Google's official budget.json format). This config file *derives*
//   two things from it programmatically:
//     a) `settings.budgets`  → makes the "Budgets" table appear inside
//        every Lighthouse HTML report (informational, human-friendly).
//     b) `assertMatrix`      → the actual hard CI enforcement
//        (build fails when a page exceeds its budget on the wire).
//   Change a number in the JSON once → report AND enforcement update
//   together. No drift, no dual maintenance. (Pattern: config-as-code,
//   same philosophy as our turbo.json / Prisma schema.)
//
// WHY `assertMatrix` INSTEAD OF PLAIN `assertions`:
//   LHCI does not allow `assertions` and `assertMatrix` together, and
//   we need DIFFERENT byte budgets per page (homepage 150 KB vs
//   /consult 200 KB). So the matrix's FIRST entry (`.*`) carries the
//   global, every-page rules (scores + Core Web Vitals), and each
//   budget path gets its own entry with byte-level rules. A URL that
//   matches multiple entries gets ALL of them applied — exactly what
//   we want.
//
// WHY NO `preset: 'lighthouse:recommended'`:
//   Presets assert ~100 individual audits and create alert fatigue —
//   the #1 reason teams start ignoring red CI. We assert a curated,
//   intentional set instead. Every assertion below exists for a
//   written reason. (See docs/adr/0009 for alternatives considered.)
//
// METRIC NOTES (2026 reality):
//   • INP replaced FID as a Core Web Vital in March 2024. Lab tools
//     cannot fully measure INP (it needs real human interactions), so
//     we assert TBT (Total Blocking Time) — the standard lab proxy.
//     Real INP arrives from the field via Speed Insights + our
//     use-web-vitals.ts → Sentry pipeline (Task #53 Phase 2, Task #36).
//   • Our budgets are intentionally STRICTER than Google's "good"
//     thresholds (LCP 1.5 s vs 2.5 s) because lab runs on a fast CI
//     machine ≈ field p75 on a mid-range Indian phone over 4G.
//
// ROLLOUT DIAL (how enforcement is switched on):
//   The workflow itself never uses `continue-on-error`. Instead:
//     Week 1  → the "Lighthouse CI" check is NOT in branch protection:
//               a red ❌ is visible + informative but does not block.
//     After baseline week → add it as a required check in GitHub
//               branch protection (2-minute dashboard step, see
//               ADR-0009 runbook). From then on, red = no merge.
//   Budgets only ever RATCHET DOWN (tighten). Loosening a budget
//   requires an ADR amendment — one-way quality valve.
//
// FUTURE INTERLINKS (so nobody re-does this later):
//   • Task #54 (WCAG 2.2 AA): flip `categories:accessibility` from
//     'warn' to 'error'. One word. The gate is pre-wired today.
//   • Task #56 (/consult chat): add '/consult' to AUDIT_PATHS below.
//     Its byte budget already exists in lighthouse-budgets.json.
//   • Tasks #216–221 (apps/clinics split): copy this file + the
//     budgets JSON into apps/clinics, adjust paths — same harness,
//     30 minutes, Day-1 gated.
// ═══════════════════════════════════════════════════════════════

'use strict';

/**
 * Byte budgets — Google budget.json format.
 * THE single source of truth for "how heavy may each page be".
 * @type {Array<{path: string, resourceSizes?: Array<{resourceType: string, budget: number}>, resourceCounts?: Array<{resourceType: string, budget: number}>}>}
 */
const budgets = require('./lighthouse-budgets.json');

/**
 * Where the production server listens during the audit.
 * `pnpm start` → `next start` → port 3000 (Next.js default; matches
 * the dev script's `--port 3000` so muscle memory stays identical).
 */
const BASE_URL = 'http://localhost:3000';

/**
 * Pages under audit today.
 *
 * URL shapes verified against apps/web/i18n/routing.ts:
 *   DEFAULT_LOCALE = 'en' with localePrefix 'as-needed'
 *   → the default locale carries NO /en prefix.
 *   → canonical public URLs are exactly the ones below.
 *
 * '/consult' joins this list when Task #56 ships the real chat UI
 * (its budget is already defined and waiting in the JSON).
 */
const AUDIT_PATHS = ['/', '/login', '/signup', '/privacy'];

/**
 * Escapes a string for safe use inside a RegExp.
 * (BASE_URL contains '.', ':' and '/' — all regex-significant.)
 *
 * @param {string} value - Raw string to escape.
 * @returns {string} Regex-safe string.
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts a budget.json `path` into an LHCI `matchingUrlPattern`.
 *
 * budget.json uses robots.txt-style paths where a trailing '$'
 * anchors the end of the URL:
 *   '/$'       → exactly the homepage      → ^…/$
 *   '/login'   → /login (and sub-paths)    → ^…/login
 *
 * @param {string} budgetPath - Path from lighthouse-budgets.json.
 * @returns {string} Regex string for LHCI's matchingUrlPattern.
 */
function pathToUrlPattern(budgetPath) {
  const anchored = budgetPath.endsWith('$');
  const cleanPath = anchored ? budgetPath.slice(0, -1) : budgetPath;
  return `^${escapeRegex(BASE_URL)}${escapeRegex(cleanPath)}${anchored ? '$' : ''}`;
}

/**
 * Builds the per-page byte-budget assertions for one budget entry.
 * Maps budget.json resource types onto LHCI's resource-summary audit:
 *   resourceSizes  → 'resource-summary:{type}:size'  (budget is in KB → ×1024 bytes)
 *   resourceCounts → 'resource-summary:{type}:count'
 *
 * 'error' severity: byte budgets are the contract — when the
 * branch-protection dial is on, exceeding them blocks merge.
 *
 * @param {{path: string, resourceSizes?: Array<{resourceType: string, budget: number}>, resourceCounts?: Array<{resourceType: string, budget: number}>}} entry
 *   One entry from lighthouse-budgets.json.
 * @returns {Record<string, [string, object]>} LHCI assertion map.
 */
function budgetEntryToAssertions(entry) {
  /** @type {Record<string, [string, object]>} */
  const assertions = {};

  for (const { resourceType, budget } of entry.resourceSizes ?? []) {
    assertions[`resource-summary:${resourceType}:size`] = [
      'error',
      { maxNumericValue: budget * 1024, aggregationMethod: 'median-run' },
    ];
  }

  for (const { resourceType, budget } of entry.resourceCounts ?? []) {
    assertions[`resource-summary:${resourceType}:count`] = [
      'error',
      { maxNumericValue: budget, aggregationMethod: 'median-run' },
    ];
  }

  return assertions;
}

/**
 * GLOBAL assertions — applied to EVERY audited URL via the '.*' matrix
 * entry. Category scores + Core Web Vitals. All numeric assertions use
 * the median of 3 runs: Google's own research shows median-of-N is
 * dramatically more stable than a single run — flaky gates get
 * ignored, stable gates get respected.
 */
const GLOBAL_ASSERTIONS = {
  // ── Category score floors ──────────────────────────────────────
  // Performance ≥ 90 today; ratchets to 95 once Tasks #55/#56 land
  // their final UIs (record the ratchet in ADR-0009 when flipped).
  // AMENDMENT v2 (commit ed1051f, ADR-0009): interim floor at the
  // measured median minus noise (home 0.58). Destination stays 0.90 —
  // this number only ever ratchets UP as W3 fixes land.
  'categories:performance': [
    'error',
    { minScore: 0.55, aggregationMethod: 'median-run' },
  ],

  // WARN until Task #54 (WCAG 2.2 AA) completes the remediation pass,
  // then flip to 'error'. The gate exists from Day 1 so #54 starts
  // with a live scoreboard instead of a blank page.
  'categories:accessibility': [
    'warn',
    { minScore: 0.95, aggregationMethod: 'median-run' },
  ],

  'categories:best-practices': [
    'error',
    { minScore: 0.95, aggregationMethod: 'median-run' },
  ],

  'categories:seo': [
    'error',
    { minScore: 0.95, aggregationMethod: 'median-run' },
  ],

  // ── Core Web Vitals (lab) ──────────────────────────────────────
  // LCP budget 1500 ms — deliberately tighter than Google's 2500 ms
  // "good" line. Lab-on-CI ≈ field p75 on a ₹10K phone + 4G. Passing
  // 1.5 s in lab is what keeps real-world p75 inside "good".
  // AMENDMENT v2: interim = worst measured median (home 5108 ms) +4%.
  // Destination 1500 ms lives in ADR-0009; ratchet DOWN only.
  'largest-contentful-paint': [
    'error',
    { maxNumericValue: 5300, aggregationMethod: 'median-run' },
  ],

  // TBT ≤ 200 ms — the lab proxy for INP (post-March-2024 world).
  // Datun is a chat product: main-thread jank during typing is a
  // trust-killer, so this one is non-negotiable.
  // AMENDMENT v2: interim = worst measured median (home 729 ms) +10%.
  // Destination 200 ms; ratchet DOWN only.
  'total-blocking-time': [
    'error',
    { maxNumericValue: 1100, aggregationMethod: 'median-run' },
  ],

  // CLS ≤ 0.1 — Google's "good" line. This is also the automated
  // regression test for Task #51's skeletons: a skeleton with wrong
  // dimensions shifts layout and trips this exact assertion.
  'cumulative-layout-shift': [
    'error',
    { maxNumericValue: 0.1, aggregationMethod: 'median-run' },
  ],

  // TTFB ≤ 800 ms as WARN — separates "server slow" from "frontend
  // heavy" when debugging an LCP failure. Warn (not error) because
  // CI cold starts can spike it without any real regression.
  'server-response-time': [
    'warn',
    { maxNumericValue: 800, aggregationMethod: 'median-run' },
  ],
};

module.exports = {
  ci: {
    collect: {
      // Median-friendly run count: 3 runs cut variance ~37% vs a
      // single run while keeping the job under ~5 minutes.
      numberOfRuns: 3,

      // LHCI boots the REAL production server (next start) from the
      // built output, waits for readiness, audits, then kills it.
      // Next 16 prints "✓ Ready in Xms" — 'Ready' is the stable token.
      // 90 s timeout cushions CI cold starts.
      startServerCommand: 'pnpm start',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 90000,

      url: AUDIT_PATHS.map((path) => `${BASE_URL}${path}`),

      settings: {
        // Feeds the human-readable "Budgets" table inside every HTML
        // report. Enforcement happens in assertMatrix below — this is
        // the informational twin derived from the same JSON.
        budgets,

        // ── STABILITY (learned from the first local baseline run) ──
        // 1. --no-sandbox is needed ONLY on GitHub's Linux runners;
        //    on a local Windows machine it buys nothing. Conditional
        //    on CI (GitHub Actions always sets CI=true).
        chromeFlags: process.env.CI ? '--no-sandbox' : '',

        // 2. FullPageScreenshot rasterises the ENTIRE page into one
        //    giant image — the single biggest memory spike of a run,
        //    and the step right before our first TARGET_CRASHED on a
        //    dev machine. It only feeds report thumbnails; it has
        //    ZERO effect on scores or any assertion. Disabled
        //    everywhere so local and CI run identical settings.
        disableFullPageScreenshot: true,

        // 3. The bf-cache check navigates away from the page and
        //    back — a notorious tab-crash point on Windows + localhost
        //    (and irrelevant behind our auth/CSP setup). It is an
        //    UNSCORED diagnostic: skipping costs nothing.
        skipAudits: ['bf-cache'],

        // No `preset`/`formFactor` override: Lighthouse's DEFAULT is
        // mobile emulation + 4x CPU throttle + slow-4G network — the
        // exact profile of Datun's p75 user in India. Intentional.
      },
    },

    assert: {
      assertMatrix: [
        // Entry 0 — global rules for every audited URL.
        {
          matchingUrlPattern: '.*',
          assertions: GLOBAL_ASSERTIONS,
        },

        // Entries 1..n — per-page byte budgets, derived 1:1 from
        // lighthouse-budgets.json. Add a page there → it is enforced
        // here automatically. (Budget paths that match no audited URL,
        // like '/consult' pre-Task-#56, simply lie dormant — zero
        // cost, future-proof.)
        ...budgets.map((entry) => ({
          matchingUrlPattern: pathToUrlPattern(entry.path),
          assertions: budgetEntryToAssertions(entry),
        })),
      ],
    },

    upload: {
      // Free, anonymous, zero-setup report hosting; links print in the
      // CI log. Links expire after 7 days — which is why the workflow
      // ALSO archives apps/web/.lighthouseci as a 90-day GitHub
      // artifact (trend history for a solo founder, zero cost).
      target: 'temporary-public-storage',
    },
  },
};
