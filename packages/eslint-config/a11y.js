// ═══════════════════════════════════════════════════════════════
// A11Y ESLINT LAYER — Task #54 (WCAG 2.2 AA, verified every PR)
// packages/eslint-config/a11y.js
//
// WHAT THIS IS
//   Layer 1 of the Datun accessibility testing pyramid:
//
//     L1  Static analysis   ← THIS FILE (eslint-plugin-jsx-a11y)
//     L2  Component tests      (vitest-axe — Task #54 Phase 2)
//     L3  E2E page audits      (@axe-core/playwright — Phase 2)
//     L4  Human audits         (NVDA/VoiceOver protocol — Phase 3,
//                               executed monthly + Task #75)
//
//   L1 is the cheapest, fastest layer: it flags missing alt text,
//   unlabeled controls, invalid ARIA, and keyboard traps AT AUTHOR
//   TIME — before the code even runs. Every violation caught here
//   costs seconds; the same violation caught in production costs a
//   patient their consultation.
//
// WHY IT LIVES IN packages/ (not apps/web)
//   Architecture law (locked 10 Jun 26): apps/web (patient) and
//   apps/clinics (clinic) are forever-separate Next.js apps sharing
//   one engineering spine. Putting the a11y ruleset in the shared
//   config package means apps/clinics inherits WCAG enforcement on
//   the DAY it is scaffolded (Tasks #76–99) — zero retrofit. The
//   same applies to packages/ui and any future React workspace.
//   "Retrofit is 10x harder" — so we make retrofit impossible.
//
// BASELINE: `strict` PRESET (33 rules), NOT `recommended`
//   The deltas between presets are exactly the failures India's
//   assistive-tech reality punishes hardest — e.g. strict forbids
//   redundant `role` on semantic elements and tightens label rules.
//   NVDA holds ~71% primary-screen-reader share in Asia (WebAIM
//   Survey #10), and NVDA is unforgiving about mislabeled controls.
//
// UPGRADES BEYOND STRICT (4 rules, all empirically validated against
// the full apps/web + packages/ui tree on 2026-06-12 — see PR body):
//   • anchor-ambiguous-text        — "click here" links are useless
//     when a screen-reader user pulls up the links list out of
//     context. 0 current violations; rule prevents regressions.
//   • lang                         — with 10 supported locales, a
//     wrong/missing lang attribute makes NVDA read Hindi text with
//     English phonetics (gibberish). Pairs with <LangSpan>.
//   • no-aria-hidden-on-focusable  — aria-hidden on a focusable
//     element creates a "ghost stop": keyboard focus lands on
//     something the screen reader cannot see. Worst-class bug.
//   • control-has-associated-label — every interactive control must
//     expose an accessible name. The ONE genuine violation this
//     surfaced (image-uploader ProgressBar) is fixed in this same
//     PR. `ignoreElements` below silences a known false-positive
//     where the rule flags bare table cells (<tr>/<th>/<td> carry
//     row/cell semantics natively and are labeled by their content;
//     verified against eslint-plugin-jsx-a11y@6.10.2).
//
// DOCUMENTED EXCEPTIONS (2 rules OFF — decisions, not oversights):
//   • no-autofocus — OFF.
//     The auth pages autofocus the single primary field (email /
//     OTP). On a one-field form this is predictable, announced by
//     the screen reader (focus lands WITH its label), and is the
//     established pattern (Stripe Checkout, Linear login). WCAG 2.2
//     does not prohibit it; the rule guards against DISORIENTING
//     mid-page focus steals, which a single-purpose auth screen is
//     not. Re-evaluate per-page if autofocus ever appears inside
//     long content pages (then prefer targeted eslint-disable with
//     justification over flipping this back on globally).
//   • prefer-tag-over-role — OFF.
//     Empirical run on 2026-06-12: 35 hits, ALL on canonical
//     WAI-ARIA Authoring Practices patterns the rule cannot model —
//     role="status" live regions on skeletons (the <output> element
//     it suggests is for calculation results, not status messages),
//     role="progressbar" on styled divs (native <progress> remains
//     unstylable cross-browser; Radix ships the ARIA pattern),
//     role="img" SVG wrappers, and Radix radio internals. Fighting
//     the design-system's correct ARIA with 35 disables would bury
//     real signal. The cases this rule *should* catch (a div
//     cosplaying as a button) are already covered by
//     no-noninteractive-element-to-interactive-role +
//     interactive-supports-focus + click-events-have-key-events
//     from the strict preset.
//
// INTERLINK — eslint-plugin-only-warn (packages/eslint-config/base.js)
//   The monorepo flattens EVERY rule to "warning" severity, and all
//   workspaces lint with `--max-warnings 0`. Net effect: the
//   error/warn distinction below is semantic documentation; the CI
//   gate is zero-tolerance either way. A single jsx-a11y hit FAILS
//   the build. That is intentional — this is the Task #54 contract:
//   "verified every PR".
//
// CONSUMERS
//   • ./next.js          → apps/web, (future) apps/clinics
//   • ./react-internal.js → packages/ui, future React libs
//   Both spread `a11yConfig` AFTER their react/hooks blocks so these
//   rules win any ordering disputes.
// ═══════════════════════════════════════════════════════════════

import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * Shared WCAG 2.2 AA static-analysis layer for every React surface
 * in the monorepo. Spread into a flat-config array AFTER framework
 * presets.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const a11yConfig = [
  {
    // Scope to JSX-bearing files only — running ARIA rules over
    // plain .ts (schemas, workers, configs) is wasted lint time on
    // the 924-file tree and produces zero additional safety.
    files: ['**/*.{jsx,tsx}'],

    // `flatConfigs.strict` ships the plugin + languageOptions
    // (ecmaFeatures.jsx) pre-wired for ESLint 9 flat config —
    // verified against eslint@9.39.1 / plugin@6.10.2.
    ...jsxA11y.flatConfigs.strict,

    settings: {
      'jsx-a11y': {
        // Component→element map: DELIBERATELY LEAN. Only wrappers
        // whose rendered element is unconditional are mapped — the
        // analyzer must never be told something the DOM can
        // contradict:
        //   • Image/ResponsiveImage → img  (alt-text rules fire on
        //     every image surface — highest-value mapping we have).
        //   • Link → a  (anchor-is-valid + anchor-ambiguous-text
        //     cover next-intl's <Link> exactly like a raw <a>).
        // Button is intentionally ABSENT: with Radix `asChild` it
        // renders whatever its child is (often <a>), and mapping it
        // to 'button' made control-has-associated-label flag every
        // `<Button asChild><Link>…` composition whose label sits
        // one level deeper than the rule can see (reproduced on
        // route-error/widget-error 2026-06-12). Form controls
        // (Input/Textarea/Label) are likewise unmapped — their
        // labeling is policed by the htmlFor-aware
        // label-has-associated-control rule, not by element
        // impersonation.
        components: {
          Image: 'img',
          ResponsiveImage: 'img',
          Link: 'a',
        },
        // NOTE — deliberately NO `polymorphicPropName` here.
        // That setting is for string-valued element props like
        // `as="nav"`. Radix's `asChild` is a BOOLEAN — declaring it
        // makes the analyzer treat `true` as a tag name and CRASHES
        // control-has-associated-label inside
        // isHiddenFromScreenReader (reproduced on dialog/sheet/
        // alert-dialog, plugin 6.10.2, 2026-06-12). asChild
        // composition is simply analyzed as the child element —
        // which is exactly the right semantics anyway.
      },
    },

    rules: {
      // Inherit all 33 strict rules…
      ...jsxA11y.flatConfigs.strict.rules,

      // ── aria-role: ignoreNonDOM (post-spread so it WINS) ──
      // A custom component's `role` PROP (<MessageSkeleton role="ai">)
      // is API design, not ARIA — this is the rule's own escape hatch
      // for exactly that. Real DOM elements with invalid roles still
      // fail (canary-verified: <div role="banana"> errors).
      'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],

      // ── Upgrades (rationale in header) ────────────────────────
      'jsx-a11y/anchor-ambiguous-text': 'error',
      'jsx-a11y/lang': 'error',
      'jsx-a11y/no-aria-hidden-on-focusable': 'error',
      'jsx-a11y/control-has-associated-label': [
        'error',
        {
          // Two false-positive classes carved out (both reproduced
          // against this tree on 2026-06-12, plugin 6.10.2):
          //   • tr/th/td — table structure derives its accessible
          //     name from cell CONTENT (HTML-AAM); demanding a
          //     label per cell is noise (hit: flag-row.tsx).
          //   • input/textarea/select — this rule does NOT track
          //     <Label htmlFor>↔id association, so it flags the
          //     CORRECT external-label pattern (hits: LabelingCard,
          //     CorrectionEditor — all properly labeled). Those
          //     controls are already policed by the htmlFor-aware
          //     `label-has-associated-control` in the strict
          //     preset. Net jurisdiction: THIS rule patrols ARIA
          //     widgets (role="progressbar" etc.) where htmlFor
          //     cannot exist — exactly where it caught the one
          //     genuine bug (image-uploader ProgressBar).
          ignoreElements: ['tr', 'th', 'td', 'input', 'textarea', 'select', 'audio', 'video'],
        },
      ],

      // ── Documented exceptions (rationale in header) ───────────
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/prefer-tag-over-role': 'off',
    },
  },
];
