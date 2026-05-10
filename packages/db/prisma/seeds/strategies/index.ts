import type { StrategyName, StrategySpec } from './strategy.types';
import { minimalStrategy } from './minimal.strategy';
import { demoStrategy } from './demo.strategy';
import { stagingStrategy } from './staging.strategy';
import { loadTestStrategy } from './load-test.strategy';
import { e2eTestStrategy } from './e2e-test.strategy';
import { perfBenchStrategy, regressionStrategy, recoveryStrategy } from './specialty.strategies';

export * from './strategy.types';
export {
  minimalStrategy,
  demoStrategy,
  stagingStrategy,
  loadTestStrategy,
  e2eTestStrategy,
  perfBenchStrategy,
  regressionStrategy,
  recoveryStrategy,
};

export const ALL_STRATEGIES: Readonly<Record<StrategyName, StrategySpec>> = {
  minimal: minimalStrategy,
  demo: demoStrategy,
  staging: stagingStrategy,
  'load-test': loadTestStrategy,
  'e2e-test': e2eTestStrategy,
  'perf-bench': perfBenchStrategy,
  regression: regressionStrategy,
  recovery: recoveryStrategy,
};

export function resolveStrategy(name: StrategyName): StrategySpec {
  const s = ALL_STRATEGIES[name];
  if (!s)
    throw new Error(
      `Unknown strategy: ${name}. Available: ${Object.keys(ALL_STRATEGIES).join(', ')}`,
    );
  return s;
}
