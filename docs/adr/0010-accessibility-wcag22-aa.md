# ADR-0010: WCAG 2.2 AA as a CI-Enforced Architectural Property

- **Status:** Accepted
- **Date:** 2026-06-12
- **Task:** #54
- **Deciders:** Mayank (Founder), CTO review
- **Supersedes:** —
- **Superseded by:** —

## Context

Datun's patient base over-indexes on exactly the users accessibility
standards exist for: low-vision and blind patients, motor-impaired
patients, low-literacy users on entry-level Android devices, and
screen-reader users across 10 Indian languages. "Everyone Deserves a
Doctor" fails at the first unlabeled button.

Externally, WCAG 2.2 (ISO/IEC 40500:2025) is the bar regulators are
converging on: EN 301 549 — the European Accessibility Act's
presumptive standard — is adopting it, and India's RPwD Act 2016 /
IS 17802 point the same way. Clinic and insurance partnerships (B2B
revenue) will eventually ask for conformance evidence; a stale audit
PDF is not evidence, a CI trail is.

The June 10 audit additionally flagged "Playwright E2E config entirely
absent" — Task #54 was the natural owner to close it, since the first
E2E suites the product needs are accessibility audits.

## Decision

Accessibility is enforced as a **four-layer testing pyramid**, where
each layer catches what the previous one structurally cannot, and
layers 1–3 run on **every PR**:

| Layer        | Tooling                                                                                                                                                                                                         | Catches                                                                                                 | Cost of failure                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------- |
| L1 Static    | `eslint-plugin-jsx-a11y` strict layer in `@repo/eslint-config/a11y` (37 rules), spread into every React workspace                                                                                               | Structural mistakes at write-time (unlabeled controls, broken ARIA, mouse-only handlers)                | Seconds, in the editor          |
| L2 Component | Raw `axe-core` in vitest (`__tests__/a11y/`) — same engine version as L3                                                                                                                                        | Defects in `components/ui` primitives before any page composes them                                     | ~2s unit test                   |
| L3 E2E       | `@playwright/test` + `@axe-core/playwright` (`e2e/a11y/`), desktop + Pixel 7, light + dark, plus keyboard-journey and accessible-auth behavioral specs; Lighthouse `categories:accessibility` at `error ≥ 0.95` | Whole-page reality: contrast in real rendering, focus behavior, route announcements, paste/autocomplete | Built app + booted server in CI |
| L4 Human     | Monthly scripted NVDA audit (`docs/accessibility/SCREEN-READER-PROTOCOL.md`), feeding Task #75                                                                                                                  | The ~half of barriers no automation finds (flow comprehension, announcement quality)                    | 1 person-hour/month             |

Key sub-decisions and their reasoning:

1. **Lint layer lives in the shared package, not the app.**
   `apps/clinics` (Tasks #76–99) inherits enforcement on the day it is
   scaffolded. Retrofitting accessibility is the failure mode this ADR
   exists to prevent.
2. **`best-practice` axe tags are excluded from gates.** Gates enforce
   the standard (law); advisory rules churn between releases and would
   let opinion block patient-facing merges. Taste belongs to L1 lint.
3. **Raw axe-core in vitest instead of `vitest-axe`.** The wrapper's
   stable release is 0.1.0 (Oct 2022) with only a 1.0.0-pre since —
   an unmaintained type-surface against vitest 4. We own ~40 lines of
   glue and gain engine-version parity (`axe-core ^4.11`) with L3.
4. **`color-contrast` is disabled in L2 only.** jsdom has no layout or
   canvas, so the rule is unreliable there. Contrast is owned by the
   two real-browser engines (axe E2E + Lighthouse) and by the token
   math below. Disabling ≠ ignoring — it is assigning the check to
   the layer that can actually see.
5. **No custom route announcer.** Next.js App Router ships
   `<next-route-announcer>` (open shadow root, `aria-live="assertive"`,
   announces `document.title`). A custom one would double-announce.
   The keyboard E2E spec pins the built-in's presence so a framework
   upgrade can never silently remove it.
6. **Two independent engines on one bar.** axe (rule-exact) and
   Lighthouse (scored, `error ≥ 0.95`) both gate. Disagreement between
   them is a signal, not noise.

### The contrast token fix (the one real token defect found)

`--ring` was `#00A896` (brand teal) on white: **2.98:1**, failing
SC 1.4.11 Non-text Contrast (≥ 3:1) for the focus indicator — the one
piece of UI a keyboard user must always see. Fixed to `#0F766E`
(Tailwind teal-700): **5.47:1** on `#FFFFFF`, and ≥ 3:1 against every
surface token in both themes. One token, every `ring-ring` consumer
healed. Brand teal remains for non-informational uses. Math lives as
comments at the token definition in `globals.css`.

Additions in the same pass: `scroll-margin-top: 5rem` on
`:focus-visible`/`:target` (SC 2.4.11 Focus Not Obscured — proven by
E2E against the real sticky header), `.min-target` 24px utility
(SC 2.5.8, ready for Task #56 chips), `forced-colors` and
`prefers-contrast` focus treatments.

## Battle-scars (why the config looks the way it does)

Recorded so nobody "simplifies" these back into bugs:

1. **`polymorphicPropName: 'asChild'` crashes eslint-plugin-jsx-a11y.**
   That setting expects a string prop naming the rendered element;
   Radix's `asChild` is a boolean. Plugin threw on every
   dialog/sheet/alert-dialog. Removed; documented in `a11y.js`.
2. **`control-has-associated-label` is htmlFor-blind.** It false-flags
   correctly `<label htmlFor>`-paired fields. Native form elements are
   carved out via `ignoreElements`; the strict preset's htmlFor-aware
   `label-has-associated-control` guards them instead. The rule now
   polices only ARIA widgets — where it catches real bugs.
3. **`components: { Button: 'button' }` lies under `asChild`
   composition.** `<Button asChild><Link/></Button>` renders an `<a>`;
   the mapping made the linter assert button semantics on an anchor.
   Mapping leaned to `Image`/`ResponsiveImage`/`Link` only.
4. **Playwright 1.60 removed top-level `reducedMotion`.** A config
   written from memory failed real `tsc`; the 1.60 form is
   `use.contextOptions.reducedMotion` (verified from the release's own
   type-definition usage example). Every Task #54 file was re-verified
   against installed real packages after this catch.

## Rollout dial (runbook)

Neither workflow ever uses `continue-on-error`; enforcement is GitHub
branch protection:

1. **Merge day (2026-06-12):** "Accessibility Gate (WCAG 2.2 AA)"
   (a11y.yml) runs on every PR, visible but **not yet required**.
   Lighthouse `categories:accessibility` is already `error` inside its
   own workflow's verdict.
2. **After one green baseline week:** Settings → Branches → `main` →
   add **Accessibility Gate (WCAG 2.2 AA)** to required status checks
   (same dashboard step as ADR-0009's performance gate). From that
   moment, red = no merge.
3. **Loosening anything** (a tag, a rule, the Lighthouse min-score)
   requires amending this ADR. One-way quality valve, same as budgets.

## Consequences

**Positive:** WCAG regressions are caught at write-time or PR-time,
never by a patient; 90-day artifact trail = standing compliance
evidence for B2B/regulatory asks; `apps/clinics` starts gated;
the June-10 "no Playwright config" regression is closed with a
general-purpose E2E harness every future suite reuses.

**Negative / accepted costs:** +~4 min PR wall-time (parallel
workflow); Chromium-only E2E (axe results are engine-deterministic;
WebKit/Firefox belong to L4 + future visual testing); jsdom contrast
blindness accepted per sub-decision 4; one more required check to
remember in branch protection (mitigated by this runbook).

## Interlinks

#28 flips the `one-time-code` `test.fixme` in `auth-flows.a11y.spec.ts`
(contract written inside the test). #55/#56/#66 add their routes to
`public-pages.a11y.spec.ts` **in the same PR they ship**. #58 unlocks
seeded-session auth E2E + owns tagged PDFs (statement §4). #60 photo
alt-text, #61 voice captions (statement §4 commitments). #75 consumes
the axe JSON artifacts + the monthly protocol findings. #76–99 copy
the harness day-one. #160/#161 read this gate's evidence.
