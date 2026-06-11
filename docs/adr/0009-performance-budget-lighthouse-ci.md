# ADR-0009: Performance Budgets and Lighthouse CI Gate

**Status:** Accepted.
**Date:** June 10, 2026.
**Deciders:** CTO (Mayank Vats).
**Supersedes:** None.
**Superseded by:** None.

## Context

Datun's customer-acquisition strategy is organic search and word of mouth; the
p75 user is on a mid-range Android phone over an unstable 4G connection. Core
Web Vitals are therefore not a vanity metric here — they are a ranking input
(Google evaluates the 75th percentile of field data) and a conversion input
(bounce rates climb steeply past the two-second mark).

Until this ADR, the codebase had strong _foundations_ for performance
(Task #46 image pipeline with AVIF/WebP and a Cloudflare loader, Task #50
LazyMotion groundwork, Task #51 dimension-stable skeletons) but **no
enforcement**: nothing stopped a pull request from adding 300 KB of
JavaScript to the homepage. With a second developer joining on July 15, 2026
and the founder moving to sales after launch, review capacity will shrink
exactly when change volume grows. The protection has to be mechanical.

Two 2026-specific constraints shaped the design:

1. **Next.js 16 removed per-route build-time bundle statistics** (the old
   "First Load JS" table) because the numbers were unreliable under both
   bundlers. Build output can no longer be the source of truth for page
   weight.
2. **INP replaced FID** as the responsiveness Core Web Vital (March 2024),
   and INP cannot be fully measured in a lab — it requires real user
   interactions.

## Decision

Adopt a four-layer performance system, shipped as Task #53:

1. **Byte budgets as data** — `apps/web/lighthouse-budgets.json` (Google
   budget.json format) is the single source of truth for how heavy each
   page may be **on the wire**. Measuring transferred bytes sidesteps the
   Next 16 build-stats removal entirely: what the browser downloaded is the
   only number that cannot lie.
2. **Lab gate in CI** — `apps/web/lighthouserc.cjs` + the
   `Lighthouse CI` workflow (`.github/workflows/lighthouse-ci.yml`) audit
   `/`, `/login`, `/signup`, and `/privacy` on every relevant pull request:
   three runs per URL, median aggregation, mobile emulation (Lighthouse
   default — matches the p75 device profile). The config _derives_ its
   per-page assertions from the budgets JSON at runtime, so the report
   table and the enforcement can never drift apart. TBT (≤ 200 ms) serves
   as the lab proxy for INP.
3. **Field RUM, fleet view** — `@vercel/speed-insights` v2, mounted in
   `app/[locale]/layout.tsx` behind a server-side `process.env.VERCEL`
   gate. The gate keeps the collector out of Lighthouse CI and local
   `next start`, where its script would 404 and pollute our own audits.
4. **Field RUM, per-session view** — the upgraded
   `hooks/use-web-vitals.ts` attaches each vital, with its Google quality
   bucket (`good` / `needs-improvement` / `poor`), to the active Sentry
   span, making individual slow sessions queryable.

### Budget values and rationale

| Target                      | Value           | Why this number                                                                                                                        |
| --------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| LCP (lab)                   | ≤ 1500 ms       | Lab on a fast CI machine ≈ field p75 on a budget phone; 1.5 s lab headroom is what keeps field p75 under Google's 2.5 s "good" line.   |
| TBT (lab)                   | ≤ 200 ms        | Lab proxy for INP ≤ 200 ms; Datun is a chat product, so main-thread jank is a trust defect.                                            |
| CLS                         | ≤ 0.1           | Google "good"; doubles as the permanent regression test for Task #51's skeleton dimensions.                                            |
| TTFB                        | ≤ 800 ms (warn) | Separates "server slow" from "frontend heavy" during LCP triage; warn-level because CI cold starts spike it without a real regression. |
| Performance score           | ≥ 90            | Floor today; ratchets to 95 after Tasks #55/#56 land their final UIs.                                                                  |
| Accessibility score         | ≥ 95 (warn)     | Pre-wired for Task #54; flips to error when its remediation pass completes.                                                            |
| Best-practices / SEO scores | ≥ 95            | Catches console errors, mixed content, missing meta — cheap, high-signal.                                                              |
| Homepage script / total     | 150 / 300 KB    | The conversion engine stays light; numbers from the task specification, validated against the current build.                           |
| /login, /signup script      | 175 KB          | Form and auth logic allowance.                                                                                                         |
| /consult script             | 200 KB          | Streaming chat allowance; the budget exists now so Task #56 is born inside it.                                                         |
| Third-party requests        | ≤ 10 per page   | Every third party is a performance and privacy liability; ten is generous today and will ratchet down.                                 |

### Enforcement and rollout

The workflow never uses `continue-on-error`; enforcement is controlled by
GitHub branch protection:

- **Baseline week** — "Performance Budget Gate" is _not_ a required check.
  A red result is visible and informative but does not block merging.
- **After baseline** — the check is added to required status checks on
  `main`. From that point, red blocks merge.

**Ratchet policy (one-way valve):** budgets may be tightened freely; any
loosening requires an amendment to this ADR stating the reason. When a page
runs ≥ 20 % under a budget for two consecutive weeks, tighten the budget to
that level.

### Runbook — when the gate goes red

1. Open the failing job; the log prints a public report link per URL
   (links expire after seven days; the same reports persist for 90 days in
   the `lighthouse-reports-*` workflow artifact).
2. Identify the failing assertion: a **byte budget** failure names the
   resource type; a **metric** failure names LCP/TBT/CLS; a **score**
   failure lists the contributing audits.
3. For byte failures, run `pnpm analyze` in `apps/web`
   (Next 16's Turbopack Bundle Analyzer, `next experimental-analyze`) and
   trace the import chain of the heaviest new module. Typical fixes:
   dynamic-import the component, move the work to a server component, or
   replace the dependency.
4. Reproduce locally: after `pnpm build`, run `pnpm perf` in `apps/web`
   for the fast loop (single Lighthouse run, assert only, no upload);
   run `pnpm lhci` for the CI-identical ritual (three runs + upload).
   Iterate until green, then push.
5. If the increase is justified (new product surface), follow the ratchet
   policy: amend this ADR with the new number and the reason in the same
   pull request.

## Alternatives Considered

1. **`size-limit` (source-level bundle assertions).** Rejected: it measures
   bundler output, not network transfer, and Next 16's removal of per-route
   stats was a direct signal that build-side numbers are unreliable. Wire
   measurements via Lighthouse's resource summary are strictly truer.
2. **`@next/bundle-analyzer` (Webpack plugin).** Rejected: the production
   build runs on Turbopack; the Webpack plugin would analyze a bundle we do
   not ship. The built-in `next experimental-analyze` (v16.1+) analyzes the
   real Turbopack graph.
3. **Self-hosted LHCI server for historical trends.** Rejected for now:
   pre-launch it is infrastructure without an audience. The 90-day workflow
   artifacts cover lab history; Speed Insights covers field trends.
   Revisit when a team needs shared dashboards.
4. **Running `lhci` in the pre-push hook.** Rejected: the hook already runs
   a 22-task verify suite (~23 minutes); adding a build-and-audit cycle
   would push developers toward `--no-verify`, which is worse than no gate.
   Adopted instead: `pnpm perf` (single-run collect + assert, no upload) is
   a documented step of the manual pre-ship verification sequence, giving
   editing-time feedback without bloating hooks. Hook integration may be
   revisited post-launch if the team grows.
5. **`web-vitals/attribution` build in `use-web-vitals.ts`.** Rejected:
   several extra kilobytes against the very script budgets this ADR
   enforces, to answer questions Sentry traces usually answer already.
   Revisit only if a field regression cannot be explained from the trace.

## Consequences

- Every pull request touching `apps/web` or `packages/**` now produces a
  reproducible performance verdict; regressions are caught at review time,
  not in next month's Search Console.
- The gate itself is under test: `__tests__/performance/**` (run by every
  `pnpm test`, locally and in the CI quality job) guards the budget schema
  against silently-ignored typos, pins the ADR contract numbers, verifies
  the budgets→assertions derivation and URL anchoring, asserts the
  web-vitals→Sentry pipeline (including the CLS unit regression), and
  trips if critical workflow steps are deleted or renamed.
- Tasks #55 and #56 will be developed _inside_ their budgets rather than
  retrofitted — historically a 10× cost difference.
- The apps/clinics split (Tasks #216–221) inherits the harness by copying
  `lighthouserc.cjs` + a budgets file and adjusting paths.
- Lab Lighthouse does not measure soft navigations (SPA route changes) or
  true INP; those arrive only from the field layers. A green gate is
  necessary, not sufficient — field dashboards remain part of the weekly
  review.
- Known nit, deliberately not churned here: comment blocks in
  `lib/csp/allowed-origins.ts` reference "Task #53 (Razorpay)" from the
  **old 160-task list**; under the v2 215-task list, #53 is this ADR's
  subject. The pre-staged Razorpay origins themselves remain correct; only
  the comment numbering is stale. Fix opportunistically in the next CSP
  touch.

### External setup checklist (dashboard steps, in order)

1. **Vercel → Project → Speed Insights → Enable** (after this branch
   deploys). Data appears only from real production/preview traffic.
2. **Baseline week observation** — read the gate's reports on 3–5 PRs; fix
   or consciously accept each finding.
3. **GitHub → Settings → Branches → main → require "Performance Budget
   Gate"** — the moment enforcement turns on.
4. **Vercel Pro plan** — pre-launch checklist item (Hobby tier prohibits
   commercial use); required before public traffic, independent of this
   gate.

## References

- Lighthouse CI: <https://github.com/GoogleChrome/lighthouse-ci>
- Budget format: <https://web.dev/articles/use-lighthouse-for-performance-budgets>
- Turbopack Bundle Analyzer: <https://nextjs.org/docs/app/guides/package-bundling>
- Speed Insights package: <https://vercel.com/docs/speed-insights/package>
- Web Vitals thresholds: <https://web.dev/articles/vitals>
- Related ADRs: ADR-0005 (nonce-only CSP — why the RUM collector needs no
  nonce under `'strict-dynamic'`).
