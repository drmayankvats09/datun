import type { StrategySpec } from './strategy.types';

export const minimalStrategy: StrategySpec = {
  name: 'minimal',
  description: 'Reference catalogs + 5 clinics + 50 patients (smoke test, <30 sec)',
  env: 'development',
  includeCategories: ['reference', 'identity', 'organization', 'people'],
  counts: {
    clinics: 5,
    doctors: 5,
    patients: 50,
    consultations: 0,
    appointments: 0,
    historicalDaysBack: 0,
  },
  anonymize: false,
  snapshotAfter: false,
  parallelExec: false,
  dryRunFirst: false,
  stopOnError: true,
  compensateOnFailure: true,
  maxDurationMinutes: 1,
  memoryBudgetMb: 256,
  expectedScenarioCount: 50,
};
