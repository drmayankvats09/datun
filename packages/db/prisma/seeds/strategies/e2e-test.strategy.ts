import type { StrategySpec } from './strategy.types';

export const e2eTestStrategy: StrategySpec = {
  name: 'e2e-test',
  description: 'Hermetic test fixture — 3 clinics, 10 patients, 5 consultations (deterministic)',
  env: 'test',
  includeCategories: ['reference', 'identity', 'organization', 'people', 'clinical'],
  counts: {
    clinics: 3,
    doctors: 3,
    patients: 10,
    consultations: 5,
    appointments: 2,
    historicalDaysBack: 0,
  },
  anonymize: false,
  snapshotAfter: false,
  parallelExec: false,
  dryRunFirst: false,
  stopOnError: true,
  compensateOnFailure: true,
  masterSeedOverride: 42,
  maxDurationMinutes: 1,
  memoryBudgetMb: 512,
  expectedScenarioCount: 5,
};
