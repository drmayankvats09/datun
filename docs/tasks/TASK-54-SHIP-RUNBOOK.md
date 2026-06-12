# Task #54 — Ship Runbook (WCAG 2.2 AA)

One PR · branch `task-54-accessibility-wcag22-aa` · 4 commits · push
once at the end. Every block below is copy-paste-whole into the VS
Code PowerShell terminal at `C:\Users\Admin\Projects\datun`. Husky is
the authoritative gate — **never `--no-verify`**.

Pre-condition: Phase 1 (8 files), Phase 2 (12), Phase 3 (24) placement
commands all reported `PLACED`.

## 1 · Install + full verification chain

New devDependencies (@playwright/test, @axe-core/playwright, axe-core)
mean the lockfile must update — plain install, NOT frozen:

```powershell
pnpm install
pnpm turbo run db:generate
pnpm turbo run check-types --concurrency=1
pnpm turbo run lint --concurrency=1
pnpm turbo run test --concurrency=1
pnpm turbo run build --filter=web
pnpm format
```

Expected: check-types green (e2e TS rides the app project via the
devDeps); lint green incl. the new jsx-a11y layer; test green with the
**7 new** `ui-primitives.a11y` cases in the count; build green.

Optional but recommended once (full E2E locally, ~4 min):

```powershell
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

## 2 · Review what's about to ship

```powershell
git status --short
git diff --stat
```

Expect ~44 changed/new paths (8 + 12 + 24, with two Phase-1/2 files
superseded in place by Phase 3) + `pnpm-lock.yaml`. Anything OUTSIDE
the lists in §3 → stop and investigate before staging.

## 3 · Branch + four commits

Bracketed paths use git's `:(literal)` magic — `[locale]` is a glob
char-class to git's pathspec engine and will NOT match its own
directory name otherwise.

```powershell
git checkout -b task-54-accessibility-wcag22-aa
```

**Commit 54.1 — shared lint layer, tokens, component fixes**

```powershell
git add packages/eslint-config/a11y.js packages/eslint-config/next.js packages/eslint-config/react-internal.js packages/eslint-config/package.json apps/web/app/globals.css apps/web/components/media/image-uploader.tsx apps/web/components/ui/button.tsx
git commit -m "feat(shared): jsx-a11y strict layer + accessible design tokens [54.1]" -m "37-rule a11y lint layer in @repo/eslint-config (3 documented battle-scars), --ring 2.98:1->5.47:1 contrast fix with math, SC 2.4.11 scroll-margin, .min-target 24px, forced-colors/prefers-contrast support, ProgressBar accessible name via aria-labelledby, button.tsx hit-box contract, theme-toggle ghost-stop groundwork."
```

**Commit 54.2 — test pyramid layers 2+3 with CI gate**

```powershell
git add apps/web/e2e apps/web/__tests__/a11y apps/web/__tests__/setup.ts apps/web/package.json pnpm-lock.yaml turbo.json .github/workflows/a11y.yml .gitignore
git commit -m "test(web): axe E2E + component a11y suites with CI gate [54.2]" -m "Playwright 1.60 harness (desktop+Pixel 7, prod server, en-US pin), 5-tag axe fixture with JSON evidence attachments, 10-route sweep (light+dark), keyboard journeys (skip link, lang, Escape/focus-return, route announcer, SC 2.4.11), SC 3.3.8 accessible-auth battery + #28 one-time-code fixme, raw axe-core unit runner (vitest-axe rejected: unmaintained vs vitest 4), 7 primitive suites, a11y.yml mirroring the lighthouse harness with 90-day artifacts. Closes the 10-Jun 'Playwright config absent' regression."
```

**Commit 54.3 — statement page, consistent help, i18n, gate flip**

```powershell
git add ':(literal)apps/web/app/[locale]/(legal)/accessibility/page.tsx' ':(literal)apps/web/app/[locale]/(legal)/layout.tsx' ':(literal)apps/web/app/[locale]/(auth)/layout.tsx' apps/web/components/legal/legal-nav.tsx apps/web/components/a11y/consistent-help.tsx apps/web/components/a11y/index.ts apps/web/components/theme-toggle.tsx apps/web/messages apps/web/e2e/a11y/public-pages.a11y.spec.ts apps/web/lighthouserc.cjs docs/adr/0010-accessibility-wcag22-aa.md docs/accessibility docs/tasks/TASK-54-SHIP-RUNBOOK.md
git commit -m "feat(web): accessibility statement + consistent help + lighthouse a11y flip [54.3]" -m "/accessibility statement (EAA Art.13(2) shape, honest known-limitations ledger for #58/#60/#61), 5th legal tab+footer link, SC 3.2.6 ConsistentHelp on auth (reuses ctaWhatsApp — zero new strings), theme-toggle labels via common.theme across all 10 locales, statement route self-registers in the E2E sweep, Lighthouse categories:accessibility warn->error (ADR-0010 dial), ADR-0010 + per-PR checklist + monthly NVDA protocol + this runbook."
```

**Commit 4 — CSP fix (rides the PR, honest separate history)**

```powershell
git add apps/web/lib/csp/allowed-origins.ts
git commit -m "fix(web): allow PostHog asset-host fetches in connect-src" -m "eu-assets.i.posthog.com added to CONNECT_ORIGINS.posthog — lazy modules (web-vitals, surveys, recorder) and their source maps fetch from the assets host; connect-src is not covered by strict-dynamic, producing the 12-Jun console violations. Dual-host pattern was already documented in the file header; the list now matches it."
```

Sanity: `git status --short` → clean. `git log --oneline -4` → the four
messages above.

## 4 · Push + PR

```powershell
git push -u origin task-54-accessibility-wcag22-aa
```

Open the printed GitHub URL → Create PR. Title:
`Task #54 — WCAG 2.2 AA: 4-layer enforcement + statement page`.
Body — paste and keep:

```md
## What

WCAG 2.2 AA as an enforced architectural property: lint layer (L1),
axe component suites (L2), Playwright axe E2E + keyboard/auth specs +
Lighthouse a11y error-gate (L3), monthly NVDA protocol (L4). Public
/accessibility statement (EAA Art.13(2) shape) with an honest
known-limitations ledger. Plus a connect-src fix for PostHog's asset
host.

## Decision record

ADR-0010 (pyramid, contrast math, rollout dial).

## Battle-scars (why configs look like this)

1. jsx-a11y `polymorphicPropName:'asChild'` crashes on boolean props.
2. `control-has-associated-label` is htmlFor-blind — native fields
   carved out, ARIA widgets still policed.
3. `Button:'button'` mapping lies under asChild — leaned to Image/Link.
4. Playwright 1.60 moved reducedMotion under `use.contextOptions` —
   caught by real tsc against installed 1.60, not by memory.

## Evidence per PR (this one included)

10 routes × 2 viewports + dark = 21 page audits with attached axe
JSON (90-day artifacts) · 5 keyboard journeys · SC 3.3.8 paste +
autocomplete battery · 7 primitive suites in `pnpm test`.

## Rollout

Gate visible-not-required for one green week, then add
"Accessibility Gate (WCAG 2.2 AA)" to required checks (ADR-0010 §dial).

## Interlinks armed

#28 fixme contract · #55/#56/#66 route-add rule in-spec · #58/#60/#61
on the public ledger · #75 consumes artifacts+protocol · #76–99
inherit day-one · #160/#161 evidence trail.
```

Merge when CI is green (a11y gate runs but doesn't block this first
PR — that's the dial working as designed).

## 5 · Post-merge (10 minutes, calendar them)

1. **+7 days, if the week stayed green:** Settings → Branches → main →
   require **Accessibility Gate (WCAG 2.2 AA)**.
2. Create the **monthly NVDA audit** recurring event (1st Monday) →
   protocol doc.
3. Verify on prod: console clean of the two PostHog CSP violations;
   `/accessibility` live and present in the legal tabs.
4. Tell Prasanth: ADR-0010 + CHECKLIST are now part of PR review.

## 6 · Definition of Done

- [ ] Full verify chain green locally (§1)
- [ ] 4 commits exactly as §3, single push
- [ ] PR body carries battle-scars + evidence + dial
- [ ] CI: quality + Lighthouse + Accessibility Gate all green
- [ ] `/accessibility` reachable from legal nav AND footer
- [ ] Theme toggle announces in Hindi when UI is Hindi (spot-check)
- [ ] Auth pages show the WhatsApp help in the same bottom slot
- [ ] PostHog CSP violations gone from prod console
- [ ] Branch-protection flip calendared (+7d)
- [ ] First NVDA audit calendared (next 1st Monday)
