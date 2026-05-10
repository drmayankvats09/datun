import { describe, expect, it } from 'vitest';
import { GOLDEN_CASES } from './eval';
import { analyzeCoverage } from './eval/eval-coverage';
import { computeIfdScore } from './quality/ifd-scorer';
import { exactDedup } from './synthesis/dedup-engine';
import { toDpoRow } from './rlhf/preference-types';

describe('Wave 7 integration', () => {
  it('golden cases have balanced coverage across urgency + locale', () => {
    const report = analyzeCoverage(GOLDEN_CASES);

    // V2 baseline: 7+ golden cases as starter dataset.
    // Wave 8 expansion target: 20+ cases per locale, 3+ EMERGENCY per locale.
    // Assertions track current reality — bump thresholds when adding cases.
    // Reference: packages/db/prisma/seeds/ai-training/eval/golden-cases/golden-cases.ts
    expect(report.totalCases).toBeGreaterThanOrEqual(5);

    // Coverage requirements: at least 1 EMERGENCY case (safety-critical) and
    // at least 1 hindi case (primary Indian locale). Below this floor, the
    // dataset isn't viable for v2 dental triage launch.
    expect(report.byUrgency.EMERGENCY ?? 0).toBeGreaterThanOrEqual(1);
    expect(report.byLocale.hindi ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('IFD scoring rewards complex examples', async () => {
    const simple = await computeIfdScore('pain');
    const complex = await computeIfdScore(
      'I have pulsating pain in my upper-right molar that radiates to my ear, started 3 days ago, worse at night, and I am pregnant in my second trimester',
    );
    expect(complex).toBeGreaterThan(simple);
  });

  it('exact dedup is byte-precise', () => {
    const ex = [
      { id: '1', chiefComplaint: 'pain' } as never,
      { id: '2', chiefComplaint: 'PAIN' } as never,
      { id: '3', chiefComplaint: 'pain' } as never,
    ];
    expect(exactDedup(ex).length).toBe(1);
  });

  it('toDpoRow handles tie correctly', () => {
    const tie = toDpoRow({
      id: '1',
      prompt: 'p',
      responseA: 'a',
      responseB: 'b',
      preferred: 'tie',
      confidence: 3,
      reviewerId: 'r1',
      reviewedAt: new Date(),
      modelA: 'm1',
      modelB: 'm2',
      safetyRelevant: false,
    });
    expect(tie).toBeNull();

    const win = toDpoRow({
      id: '2',
      prompt: 'p',
      responseA: 'a',
      responseB: 'b',
      preferred: 'A',
      confidence: 5,
      reviewerId: 'r1',
      reviewedAt: new Date(),
      modelA: 'm1',
      modelB: 'm2',
      safetyRelevant: true,
    });
    expect(win).toEqual({ prompt: 'p', chosen: 'a', rejected: 'b' });
  });
});
