import type { StrategySpec } from './strategy.types';

export const demoStrategy: StrategySpec = {
  name: 'demo',
  description: 'Sales-demo ready: 50 clinics + 200 doctors + 1000 patients + 2000 consultations',
  env: 'development',
  includeCategories: [
    'reference',
    'identity',
    'organization',
    'people',
    'clinical',
    'operational',
    'compliance',
  ],
  counts: {
    clinics: 50,
    doctors: 200,
    patients: 1000,
    consultations: 2000,
    appointments: 600,
    historicalDaysBack: 90,
  },
  anonymize: false,
  snapshotAfter: true,
  snapshotName: 'demo-baseline',
  parallelExec: true,
  dryRunFirst: false,
  stopOnError: true,
  compensateOnFailure: true,
  maxDurationMinutes: 5,
  memoryBudgetMb: 1024,
  expectedScenarioCount: 2000,
};
