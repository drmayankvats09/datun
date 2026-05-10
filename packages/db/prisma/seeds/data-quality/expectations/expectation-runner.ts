// ═══════════════════════════════════════════════════════════════
// EXPECTATION RUNNER — runs all expectations, aggregates results
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { Expectation, ExpectationResult } from './expectation.types';
import { MEDICATION_NSAID_BLOOD_THINNER_EXPECTATION } from './medication-safety-expectation';
import { AGE_SANITY_EXPECTATION } from './age-sanity-expectation';
import { LOCALE_VALIDITY_EXPECTATION } from './locale-validity-expectation';

export const ALL_EXPECTATIONS: readonly Expectation[] = [
  MEDICATION_NSAID_BLOOD_THINNER_EXPECTATION,
  AGE_SANITY_EXPECTATION,
  LOCALE_VALIDITY_EXPECTATION,
];

export interface ExpectationSuiteResult {
  readonly results: readonly ExpectationResult[];
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
    readonly criticalFailures: number;
    readonly totalDurationMs: number;
  };
}

export async function runAllExpectations(prisma: PrismaClient): Promise<ExpectationSuiteResult> {
  const start = performance.now();
  const results: ExpectationResult[] = [];
  for (const exp of ALL_EXPECTATIONS) {
    try {
      results.push(await exp.evaluate(prisma));
    } catch (err) {
      results.push({
        id: exp.id,
        name: exp.name,
        severity: exp.severity,
        passed: false,
        violatingRowIds: [],
        message: `Expectation crashed: ${err instanceof Error ? err.message : String(err)}`,
        checkedRows: 0,
        durationMs: 0,
      });
    }
  }
  const passed = results.filter((r) => r.passed).length;
  const criticalFailures = results.filter((r) => !r.passed && r.severity === 'critical').length;
  return {
    results,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      criticalFailures,
      totalDurationMs: Math.round(performance.now() - start),
    },
  };
}
