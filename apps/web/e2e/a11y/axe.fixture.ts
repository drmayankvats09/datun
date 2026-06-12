// ═══════════════════════════════════════════════════════════════
// AXE FIXTURE — Task #54 shared E2E accessibility harness
// apps/web/e2e/a11y/axe.fixture.ts
//
// Every a11y spec imports { test, expect } from THIS file instead
// of '@playwright/test'. That buys three guarantees in one place:
//
//   1. ONE rule configuration. The WCAG tag set below is the single
//      source of truth for what "accessible" means in CI. A spec
//      can never accidentally audit against a weaker standard.
//   2. ONE evidence trail. Every analysis attaches its full axe
//      JSON to the test — pass or fail — so the Playwright HTML
//      report (uploaded 90 days by a11y.yml) is a complete audit
//      log, not just a red/green light. Task #75's manual audit and
//      any future IS-17802/EAA compliance request read straight
//      from these artifacts.
//   3. ONE failure voice. Violations print as a human-readable
//      brief (rule → impact → element → fix link) instead of a
//      JSON wall, so the engineer who broke it can fix it from the
//      CI log alone.
//
// TAGS — why exactly these five:
//   wcag2a/wcag2aa      → the 2.0 A/AA base (axe's core battery)
//   wcag21a/wcag21aa    → 2.1 additions (orientation, reflow…)
//   wcag22aa            → 2.2 additions (target-size & friends —
//                         the criteria India's IS-17802-aligned
//                         and EU EAA enforcement now expect)
//   'best-practice' is DELIBERATELY absent: those rules are
//   advisory, churn between axe releases, and would let opinion
//   noise block patient-facing merges. The gate enforces LAW, the
//   lint layer enforces taste.
//
// Verified against @axe-core/playwright 4.11.2 (axe-core 4.11.x),
// 2026-06-12 — wcag22aa is a supported tag in this line.
// ═══════════════════════════════════════════════════════════════

import { test as base, expect, type TestInfo } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

/** axe-core's violation shape (the slice we report on). */
interface AxeViolationNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  nodes: AxeViolationNode[];
}

interface AxeResults {
  violations: AxeViolation[];
  passes: unknown[];
  incomplete: unknown[];
  url: string;
}

/** The WCAG conformance bar for every Datun page. See header. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

/**
 * Render one violation as a terse, actionable block:
 *
 *   ✗ link-name (serious)
 *     Links must have discernible text
 *     fix: https://dequeuniversity.com/rules/axe/4.11/link-name
 *     at:  nav > a:nth-child(2)
 *          <a href="/x"><svg …
 */
function formatViolations(violations: AxeViolation[]): string {
  if (violations.length === 0) return '';
  const blocks = violations.map((v) => {
    const nodes = v.nodes
      .slice(0, 5) // first 5 offenders — enough to act, short enough to read
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
 * Run the configured audit against the current page state, attach
 * the complete axe JSON to the test report, and fail with a
 * human-readable brief if anything violates.
 *
 * @param label distinguishes multiple audits inside one test
 *              ("initial", "dialog-open", …) in the report.
 */
async function assertNoViolations(
  builder: AxeBuilder,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  const results = (await builder.analyze()) as unknown as AxeResults;

  // Evidence FIRST, verdict second — the JSON lands in the report
  // whether or not the expect below throws.
  await testInfo.attach(`axe-${label}.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  expect.soft(results.violations, formatViolations(results.violations)).toEqual([]);
  // soft → every audit in a multi-audit test reports its own
  // violations before the test concludes; Playwright still fails
  // the test if ANY soft expectation failed.
}

type A11yFixtures = {
  /**
   * Factory for a fresh, fully-tagged AxeBuilder bound to the
   * current page. Factory (not instance) because AxeBuilder is
   * single-use per analyze() chain and specs sometimes audit a page
   * in multiple UI states.
   */
  makeAxeBuilder: () => AxeBuilder;

  /**
   * One-call audit: build → analyze → attach → assert. The shape
   * 99% of specs need.
   */
  assertNoA11yViolations: (label: string) => Promise<void>;
};

// Note: Playwright's fixture callback param is conventionally named
// `use`, which trips react-hooks/rules-of-hooks (it pattern-matches
// React's use()). Playwright is name-agnostic — `provide` reads better
// and ends the false positive permanently.
export const test = base.extend<A11yFixtures>({
  makeAxeBuilder: async ({ page }, provide) => {
    await provide(() => new AxeBuilder({ page }).withTags([...WCAG_TAGS]));
  },

  assertNoA11yViolations: async ({ page }, provide, testInfo) => {
    await provide(async (label: string) => {
      const builder = new AxeBuilder({ page }).withTags([...WCAG_TAGS]);
      await assertNoViolations(builder, testInfo, label);
    });
  },
});

export { expect };
