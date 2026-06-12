// ═══════════════════════════════════════════════════════════════
// AXE UNIT RUNNER — Task #54 Layer-2 (component-level WCAG)
// apps/web/__tests__/a11y/axe.ts
//
// WHAT THIS IS
//   The component half of the automated a11y battery: run axe-core
//   directly against an element rendered in jsdom, fail the test
//   with a readable brief if anything violates. Imported by
//   ui-primitives.a11y.test.tsx today; ANY component test can pull
//   `expectNoA11yViolations` for a one-line audit.
//
// WHY RAW axe-core (a deliberate Phase-2 plan upgrade)
//   The original sketch named `vitest-axe`. June-2026 reality check
//   (recorded for the PR): its stable release is 0.1.0 from Oct
//   2022 with only a 1.0.0-pre since — against the repo's vitest 4
//   that is an unmaintained type-surface gamble wrapping ~40 lines
//   of glue. Current practice is to call the engine directly. So we
//   own the 40 lines: zero extra dependency, the SAME axe-core
//   ^4.11 engine version the Playwright layer uses (one truth, two
//   layers), and a failure format identical to the E2E fixture so
//   engineers read one violation dialect everywhere.
//
// JSDOM HONESTY — what this layer can and cannot judge
//   • color-contrast: DISABLED here. The rule needs real layout +
//     canvas sampling; jsdom has neither, so results are
//     unreliable-to-wrong. Contrast is owned by the real-browser
//     layers (axe E2E + Lighthouse), and the token math itself is
//     pinned in globals.css/ADR-0010. Disabling ≠ ignoring —
//     it's assigning the check to the layer that can actually see.
//   • Landmark/page-level rules ('region' etc.) carry the
//     best-practice tag, which our WCAG-only tag set already
//     excludes — isolated component fragments are not penalised
//     for lacking a <main>.
//
// CONCURRENCY NOTE
//   axe.run is not re-entrant within one document. Vitest runs
//   FILES in parallel workers (separate jsdom worlds — fine) and
//   tests within a file sequentially (fine). Do not wrap calls in
//   Promise.all inside a single test.
// ═══════════════════════════════════════════════════════════════

import { expect } from 'vitest';
import axe from 'axe-core';

/** Mirror of the E2E conformance bar (e2e/a11y/axe.fixture.ts). */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

/**
 * Run axe against an element — or, for portal-rendering components
 * (Dialog/Sheet/AlertDialog), against document.body, which is where
 * Radix portals mount AND is the deliberate scope boundary of this
 * layer: page-chrome rules (document-title, html-has-lang) target the
 * <html> element, which jsdom's bare scaffold legitimately lacks.
 * Those two are PAGE properties, owned and asserted by the E2E layer
 * against the real app (html[lang] in keyboard-nav.a11y.spec.ts;
 * document-title via every route's axe sweep). Scoping to body keeps
 * this layer judging components, not the test harness.
 */
export async function runA11y(
  container: Element | Document = document.body,
): Promise<axe.AxeResults> {
  return axe.run(container, {
    runOnly: { type: 'tag', values: [...WCAG_TAGS] },
    rules: {
      // jsdom cannot compute rendered colors — see header.
      'color-contrast': { enabled: false },
    },
    // Component tests assert on violations; skipping the "passes"
    // bookkeeping keeps each audit fast across a growing suite.
    resultTypes: ['violations'],
  });
}

/** Same terse, actionable format as the E2E fixture. */
function formatViolations(violations: axe.AxeResults['violations']): string {
  if (violations.length === 0) return '';
  const blocks = violations.map((v) => {
    const nodes = v.nodes
      .slice(0, 5)
      .map((n) => `    at:  ${n.target.join(' ')}\n         ${n.html.slice(0, 120)}`)
      .join('\n');
    const more = v.nodes.length > 5 ? `\n    …and ${v.nodes.length - 5} more node(s)` : '';
    return [
      `  ✗ ${v.id} (${v.impact ?? 'unknown'})`,
      `    ${v.help}`,
      `    fix: ${v.helpUrl}`,
      nodes + more,
    ].join('\n');
  });
  return `\n${violations.length} accessibility violation(s):\n\n${blocks.join('\n\n')}\n`;
}

/**
 * One-line component audit:
 *
 *   const { container } = render(<Button>Save</Button>);
 *   await expectNoA11yViolations(container);
 *
 * For portal components, pass nothing — document.body (including the
 * portal mount) is audited; page-chrome stays E2E's jurisdiction (see
 * runA11y note above).
 */
export async function expectNoA11yViolations(
  container: Element | Document = document.body,
): Promise<void> {
  const results = await runA11y(container);
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}
