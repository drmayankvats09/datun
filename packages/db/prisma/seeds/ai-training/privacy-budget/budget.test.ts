import { describe, expect, it } from 'vitest';
import { BudgetAccumulator } from './budget-accumulator';

describe('Privacy Budget', () => {
  it('advancedComposition is tighter than basic composition for k>10', () => {
    const acc = new BudgetAccumulator(null as never);
    const epsilonPerQuery = 0.1;
    const k = 100;
    const advanced = acc.advancedComposition(epsilonPerQuery, k);
    const basic = epsilonPerQuery * k; // 10
    expect(advanced).toBeLessThan(basic);
  });
});
