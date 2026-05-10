import type { StrategySpec } from './strategy.types';

export const stagingStrategy: StrategySpec = {
  name: 'staging',
  description:
    'Production-mirror with anonymized data — 50 clinics, 5K patients, 10K consultations',
  env: 'staging',
  includeCategories: [
    'reference',
    'identity',
    'organization',
    'people',
    'clinical',
    'operational',
    'compliance',
    'commerce',
    'integrations',
    'analytics',
  ],
  counts: {
    clinics: 50,
    doctors: 200,
    patients: 5000,
    consultations: 10000,
    appointments: 3000,
    historicalDaysBack: 180,
  },
  anonymize: true,
  snapshotAfter: true,
  snapshotName: 'staging-anonymized',
  parallelExec: true,
  dryRunFirst: true,
  stopOnError: false,
  compensateOnFailure: false,
  maxDurationMinutes: 20,
  memoryBudgetMb: 4096,
  expectedScenarioCount: 10000,
};
