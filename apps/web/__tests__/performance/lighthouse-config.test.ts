// apps/web/__tests__/performance/lighthouse-config.test.ts
// ═══════════════════════════════════════════════════════════════
// LIGHTHOUSE CONFIG WATCHMEN — Task #53
//
// "Who watches the watchmen?" — these tests do. The performance gate
// (lighthouserc.cjs + lighthouse-budgets.json + lighthouse-ci.yml) is
// itself code, and code drifts. A silent mistake in any of the three
// makes the gate LIE GREEN — the most dangerous failure mode a guard
// can have. This suite turns every such mistake into a red test that
// runs in `pnpm test` locally AND in the CI quality job.
//
// What is guarded, and against what:
//   1. BUDGET SCHEMA  — a typo'd resourceType ("scripts") would be
//      silently ignored by Lighthouse → budget never enforced.
//   2. ADR CONTRACT   — the headline numbers (LCP 1500, TBT 200,
//      CLS 0.1, score floors) are an ADR-0009 contract; quietly
//      editing them must fail here until the ADR is amended too.
//   3. DERIVATION MATH — KB→bytes ×1024, path→regex anchoring, and
//      the budgets→assertMatrix mapping (the clever part is the
//      part most worth testing).
//   4. WORKFLOW TRIPWIRES — string-level guards that the CI workflow
//      still builds the web app, still runs `lhci autorun`, and
//      still archives reports. Deliberately coarse: they catch
//      deletion/rename of critical steps, not YAML style.
//
// Loading note: lighthouserc.cjs is CommonJS tooling and the budgets
// file is plain JSON; both are loaded via `createRequire` — exactly
// what Lighthouse CI itself does — and then narrowed onto the local
// interfaces below, which describe precisely the shape these tests
// consume. No `any`, no declaration files needed for `tsc --noEmit`.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// ── Shapes consumed by these tests ───────────────────────────────

/** One LHCI assertion tuple: [severity, options]. */
type LhciAssertion = [
  severity: 'error' | 'warn' | 'off',
  options: {
    maxNumericValue?: number;
    minScore?: number;
    aggregationMethod?: string;
  },
];

/** One entry of `ci.assert.assertMatrix`. */
interface MatrixEntry {
  matchingUrlPattern: string;
  assertions: Record<string, LhciAssertion>;
}

/** One `resourceSizes` / `resourceCounts` row in budget.json. */
interface BudgetResource {
  resourceType: string;
  budget: number;
}

/** One page entry in lighthouse-budgets.json. */
interface BudgetEntry {
  path: string;
  resourceSizes?: BudgetResource[];
  resourceCounts?: BudgetResource[];
}

/** The slice of lighthouserc.cjs these watchmen patrol. */
interface LighthouseRcConfig {
  ci: {
    collect: {
      numberOfRuns: number;
      startServerCommand: string;
      url: string[];
      settings: { budgets: BudgetEntry[] };
    };
    assert: { assertMatrix: MatrixEntry[] };
  };
}

// ── Load the real artifacts (the very files CI will use) ─────────

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = require('../../lighthouserc.cjs') as LighthouseRcConfig;
const budgets = require('../../lighthouse-budgets.json') as BudgetEntry[];

const BASE_URL = 'http://localhost:3000';

/** Resource types Lighthouse actually recognises in budget.json.
 *  Anything outside this set is SILENTLY ignored by Lighthouse —
 *  which is exactly why we hard-fail on it here. */
const VALID_RESOURCE_TYPES = new Set([
  'total',
  'document',
  'script',
  'stylesheet',
  'image',
  'media',
  'font',
  'other',
  'third-party',
]);

// ── Tiny safety helpers (loud failures > undefined surprises) ────

/** `Array.find` that throws a descriptive error instead of returning undefined. */
function mustFind<T>(items: T[], predicate: (item: T) => boolean, what: string): T {
  const found = items.find(predicate);
  if (!found) throw new Error(`watchman setup failed: ${what} not found`);
  return found;
}

/** Looks up an assertion by audit id, throwing loudly when absent. */
function assertionOf(entry: MatrixEntry, audit: string): LhciAssertion {
  const assertion = entry.assertions[audit];
  if (!assertion) {
    throw new Error(
      `watchman setup failed: assertion "${audit}" missing on ${entry.matchingUrlPattern}`,
    );
  }
  return assertion;
}

const matrix = config.ci.assert.assertMatrix;
const globalEntry = mustFind(
  matrix,
  (entry) => entry.matchingUrlPattern === '.*',
  'global ".*" matrix entry',
);

describe('lighthouse-budgets.json — schema guard', () => {
  it('has at least the five launch pages budgeted', () => {
    const paths = budgets.map((entry) => entry.path);
    expect(paths).toEqual(
      expect.arrayContaining(['/$', '/login', '/signup', '/privacy', '/consult']),
    );
  });

  it('every path starts with "/" (budget.json path semantics)', () => {
    for (const entry of budgets) {
      expect(entry.path, `path "${entry.path}"`).toMatch(/^\//);
    }
  });

  it('uses only resource types Lighthouse recognises (typos lie green)', () => {
    for (const entry of budgets) {
      for (const { resourceType } of [
        ...(entry.resourceSizes ?? []),
        ...(entry.resourceCounts ?? []),
      ]) {
        expect(
          VALID_RESOURCE_TYPES.has(resourceType),
          `unknown resourceType "${resourceType}" in path "${entry.path}"`,
        ).toBe(true);
      }
    }
  });

  it('every budget value is a positive integer (KB / count)', () => {
    for (const entry of budgets) {
      for (const { budget } of [...(entry.resourceSizes ?? []), ...(entry.resourceCounts ?? [])]) {
        expect(Number.isInteger(budget) && budget > 0, `budget ${budget}`).toBe(true);
      }
    }
  });

  it('keeps the homepage contract (ADR-0009 Amendment v2 interim): script ≤ 440 KB, total ≤ 580 KB', () => {
    // Amendment v2 (commit ed1051f): interim = measured (418/548 KB) +
    // headroom. Destinations stay 150/300 in ADR-0009 — this number
    // only ever ratchets DOWN. Editing it again? Amend the ADR first.
    const home = mustFind(budgets, (entry) => entry.path === '/$', 'homepage budget');
    const sizes = Object.fromEntries(
      (home.resourceSizes ?? []).map((resource) => [resource.resourceType, resource.budget]),
    );
    expect(sizes.script).toBe(440);
    expect(sizes.total).toBe(580);
  });
});

describe('lighthouserc.cjs — collect contract', () => {
  it('audits exactly the four launch URLs (update WITH Task #56)', () => {
    expect(config.ci.collect.url).toEqual([
      `${BASE_URL}/`,
      `${BASE_URL}/login`,
      `${BASE_URL}/signup`,
      `${BASE_URL}/privacy`,
    ]);
  });

  it('uses 3 runs (median stability) and boots the prod server', () => {
    expect(config.ci.collect.numberOfRuns).toBe(3);
    expect(config.ci.collect.startServerCommand).toBe('pnpm start');
  });

  it('feeds the SAME budgets into the report settings (single source of truth)', () => {
    expect(config.ci.collect.settings.budgets).toEqual(budgets);
  });
});

describe('lighthouserc.cjs — ADR-0009 assertion contract', () => {
  it('keeps the global entry first-class (pattern ".*")', () => {
    expect(globalEntry.matchingUrlPattern).toBe('.*');
  });

  // LCP/TBT carry Amendment-v2 INTERIM ceilings (worst measured median
  // +4–10%). Destinations 1500/200 live in ADR-0009; one-way ratchet.
  it.each([
    ['largest-contentful-paint', 'error', 5300],
    ['total-blocking-time', 'error', 1100], // re-anchored to first gate-run median (981ms) +12%
    ['cumulative-layout-shift', 'error', 0.1],
    ['server-response-time', 'warn', 800],
  ] as const)('%s is %s at maxNumericValue=%s', (audit, severity, max) => {
    const [level, options] = assertionOf(globalEntry, audit);
    expect(level).toBe(severity);
    expect(options.maxNumericValue).toBe(max);
    expect(options.aggregationMethod).toBe('median-run');
  });

  it.each([
    ['categories:performance', 'error', 0.55], // Amendment v2 interim; destination 0.90
    ['categories:accessibility', 'error', 0.95], // flipped by Task #54 (ADR-0010 dial)
    ['categories:best-practices', 'error', 0.95],
    ['categories:seo', 'error', 0.95],
  ] as const)('%s is %s at minScore=%s', (audit, severity, min) => {
    const [level, options] = assertionOf(globalEntry, audit);
    expect(level).toBe(severity);
    expect(options.minScore).toBe(min);
  });
});

describe('lighthouserc.cjs — budgets → assertMatrix derivation', () => {
  it('creates one matrix entry per budget path (plus the global entry)', () => {
    expect(matrix).toHaveLength(budgets.length + 1);
  });

  it('anchors the homepage pattern: matches "/" but never "/login"', () => {
    const home = mustFind(
      matrix,
      (entry) => entry.matchingUrlPattern.endsWith('/$'),
      'anchored homepage matrix entry',
    );
    const regex = new RegExp(home.matchingUrlPattern);
    expect(regex.test(`${BASE_URL}/`)).toBe(true);
    expect(regex.test(`${BASE_URL}/login`)).toBe(false);
  });

  it('converts KB budgets to byte assertions (×1024) at error severity', () => {
    const login = mustFind(
      matrix,
      (entry) => entry.matchingUrlPattern.includes('/login'),
      '/login matrix entry',
    );
    const [level, options] = assertionOf(login, 'resource-summary:script:size');
    expect(level).toBe('error');
    // Amendment v2 interim: /login script budget = 430 KB (was 175).
    expect(options.maxNumericValue).toBe(430 * 1024);
  });

  it('maps resourceCounts to :count assertions (third-party ≤ 10)', () => {
    const home = mustFind(
      matrix,
      (entry) => entry.matchingUrlPattern.endsWith('/$'),
      'anchored homepage matrix entry',
    );
    const [, options] = assertionOf(home, 'resource-summary:third-party:count');
    expect(options.maxNumericValue).toBe(10);
  });
});

describe('lighthouse-ci.yml — critical-step tripwires', () => {
  const workflow = readFileSync(
    path.join(__dirname, '../../../../.github/workflows/lighthouse-ci.yml'),
    'utf8',
  );

  it.each([
    ['runs the gate', 'lhci autorun'],
    ['builds only the web app', 'pnpm turbo run build --filter=web'],
    ['pins the LHCI major.minor line', '@lhci/cli@0.15.x'],
    ['archives 90-day report artifacts', 'actions/upload-artifact@v5'],
    ['keeps evidence even on failure', 'if: always()'],
  ])('%s (`%s` present)', (_label, needle) => {
    expect(workflow).toContain(needle);
  });
});
