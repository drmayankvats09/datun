// ═══════════════════════════════════════════════════════════════
// DISTRIBUTION INVARIANT
// PROPERTY: Pareto/exponential samplers produce values in expected ranges
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  paretoSample,
  exponentialSample,
  weightedChoice,
  realisticDaysAgo,
} from '../../../../../prisma/seeds/factories/distributions/distributions';

describe('Distribution Invariants', () => {
  it('Pareto sample is always >= xMin', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.float({ min: Math.fround(1.1), max: Math.fround(3) }),
        fc.integer({ min: 1, max: 100 }),
        (seed, alpha, xMin) => {
          const sample = paretoSample(seed, alpha, xMin);
          expect(sample).toBeGreaterThanOrEqual(xMin);
          expect(Number.isFinite(sample)).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('Exponential sample is always >= 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(10) }),
        (seed, lambda) => {
          const sample = exponentialSample(seed, lambda);
          expect(sample).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(sample)).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('weightedChoice always returns one of the input options', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        const options = [
          { weight: 30, value: 'A' },
          { weight: 50, value: 'B' },
          { weight: 20, value: 'C' },
        ];
        const result = weightedChoice(options, seed);
        expect(['A', 'B', 'C']).toContain(result);
      }),
      { numRuns: 1000 },
    );
  });

  it('realisticDaysAgo bounded by maxDays', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 365 }),
        (seed, maxDays) => {
          const result = realisticDaysAgo(seed, maxDays);
          expect(result).toBeGreaterThanOrEqual(1);
          expect(result).toBeLessThanOrEqual(maxDays);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
