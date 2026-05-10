import { describe, expect, it } from 'vitest';
import { assignVariant } from './traffic-splitter';
import { checkSrm } from './srm-detector';
import { mSprtTest } from './sequential-test';
import type { ExperimentDefinition } from './experiment.types';

const exp: ExperimentDefinition = {
  key: 'test-exp',
  description: 'test',
  status: 'running',
  variants: [
    { key: 'control', weight: 50, description: 'A', config: {} },
    { key: 'treatment', weight: 50, description: 'B', config: {} },
  ],
  primaryMetric: 'conversion',
  guardrailMetrics: [],
  minSampleSizePerVariant: 100,
  mdePct: 5,
  startedAt: new Date(),
};

describe('Traffic splitter determinism', () => {
  it('same user always gets same variant', () => {
    const userId = 'user-test-12345';
    const a = assignVariant(exp, userId);
    const b = assignVariant(exp, userId);
    expect(a.key).toBe(b.key);
  });

  it('roughly 50/50 over 1000 users', () => {
    const counts = { control: 0, treatment: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = assignVariant(exp, `user-${i}`);
      counts[v.key as 'control' | 'treatment']++;
    }
    expect(counts.control).toBeGreaterThan(400);
    expect(counts.control).toBeLessThan(600);
  });
});

describe('SRM detector', () => {
  it('passes on clean 50/50', () => {
    const r = checkSrm({ control: 502, treatment: 498 }, { control: 0.5, treatment: 0.5 });
    expect(r.passed).toBe(true);
  });

  it('catches obvious skew', () => {
    const r = checkSrm({ control: 800, treatment: 200 }, { control: 0.5, treatment: 0.5 });
    expect(r.passed).toBe(false);
  });
});

describe('Sequential test (mSPRT)', () => {
  it('returns continue for tiny sample', () => {
    const r = mSprtTest(10, 30, 12, 30);
    expect(r.recommendation).toBe('continue');
  });

  it('detects a strong treatment effect', () => {
    // 100x more samples, treatment 20% better
    const r = mSprtTest(500, 5000, 600, 5000);
    expect(r.liftPct).toBeGreaterThan(0);
  });
});
