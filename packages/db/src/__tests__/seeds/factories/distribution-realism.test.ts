// ═══════════════════════════════════════════════════════════════
// DISTRIBUTION REALISM TESTS — Verify Pareto matches real Datun usage
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  paretoSample,
  realisticDaysAgo,
  realisticTimestamp,
  realisticClinicHour,
  festivalSurgeFactor,
  weightedChoice,
  realisticConsultationDurationMinutes,
} from '../../../../prisma/seeds/factories/distributions/distributions';

describe('Distribution Realism', () => {
  it('Pareto sample distribution is heavy-tailed (most values small, few large)', () => {
    const samples = Array.from({ length: 1000 }, (_, i) => paretoSample(i, 1.16, 1));
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[500]!;
    const p99 = sorted[990]!;
    expect(p99 / median).toBeGreaterThan(5); // heavy tail
  });

  it('realisticDaysAgo skews toward recent days (Pareto behaviour)', () => {
    const samples = Array.from({ length: 1000 }, (_, i) => realisticDaysAgo(i, 365));
    const recentCount = samples.filter((d) => d <= 30).length;
    const oldCount = samples.filter((d) => d > 180).length;
    expect(recentCount).toBeGreaterThan(oldCount);
  });

  it('realisticTimestamp returns Date in past', () => {
    for (let i = 0; i < 100; i++) {
      const ts = realisticTimestamp(i, 90);
      expect(ts.getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  it('realisticClinicHour is in valid 24h range', () => {
    for (let i = 0; i < 1000; i++) {
      const h = realisticClinicHour(i);
      expect(h).toBeGreaterThanOrEqual(9);
      expect(h).toBeLessThanOrEqual(20);
    }
  });

  it('festivalSurgeFactor in expected range', () => {
    const diwali = new Date(2026, 10, 4);
    const regular = new Date(2026, 5, 15);
    expect(festivalSurgeFactor(diwali)).toBeGreaterThan(festivalSurgeFactor(regular));
  });

  it('weightedChoice respects approximate distribution over 10K samples', () => {
    const counts = { A: 0, B: 0, C: 0 };
    const options = [
      { weight: 70, value: 'A' as const },
      { weight: 20, value: 'B' as const },
      { weight: 10, value: 'C' as const },
    ];
    for (let i = 0; i < 10000; i++) {
      const result = weightedChoice(options, i);
      counts[result]++;
    }
    expect(counts.A).toBeGreaterThan(counts.B);
    expect(counts.B).toBeGreaterThan(counts.C);
    // ~70/20/10 ratio — allow 5% deviation
    expect(counts.A / 10000).toBeGreaterThan(0.65);
    expect(counts.A / 10000).toBeLessThan(0.75);
  });

  it('realisticConsultationDurationMinutes bounded and realistic', () => {
    for (let i = 0; i < 1000; i++) {
      const min = realisticConsultationDurationMinutes(i);
      expect(min).toBeGreaterThanOrEqual(2);
      expect(min).toBeLessThanOrEqual(120);
    }
  });
});
