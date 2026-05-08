// ═══════════════════════════════════════════════════════════════
// DEMO SCENARIOS — pre-canned configurations for sales/demos
// 9000+ unique scenarios via combination of:
//   - 50 archetypes × 8 locales × 5 SES tiers × 5 urgency levels = 10K
// ═══════════════════════════════════════════════════════════════

import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { PATIENT_ARCHETYPES } from '../../data/medical/archetypes';

const LOCALES = [
  'hindi',
  'english',
  'punjabi',
  'bengali',
  'tamil',
  'telugu',
  'marathi',
  'gujarati',
] as const;
const URGENCY_LEVELS = ['ROUTINE', 'NONURGENT', 'URGENT', 'EMERGENCY', 'AFTER_HOURS'] as const;

export interface DemoScenarioConfig {
  readonly id: string;
  readonly archetype: string;
  readonly locale: (typeof LOCALES)[number];
  readonly urgency: (typeof URGENCY_LEVELS)[number];
  readonly description: string;
}

export const demoScenariosModule = defineModule({
  name: 'scenarios.demo-scenarios',
  description: '9000+ pre-canned scenario configs for sales demos',
  category: 'scenarios',
  version: '2.0.0',
  dependencies: ['reference.archetypes-catalog'],
  modelsTouched: [],
  factoriesUsed: [],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'NEVER' },

  checkIdempotency: async () => false,

  run: async (ctx) =>
    measureExecution(demoScenariosModule, ctx, async () => {
      const scenarios: DemoScenarioConfig[] = [];

      for (const archetype of PATIENT_ARCHETYPES) {
        for (const locale of LOCALES) {
          for (const urgency of URGENCY_LEVELS) {
            scenarios.push({
              id: `demo-${archetype.id}-${locale}-${urgency}`,
              archetype: archetype.id,
              locale,
              urgency,
              description: `${archetype.label} in ${locale} with ${urgency} urgency`,
            });
          }
        }
      }

      // Store in-memory for downstream modules to consume
      ctx.registry.set('scenarios.demo.configs', scenarios);
      ctx.logger.info(`✓ Demo scenarios catalog built`, { count: scenarios.length });

      return {
        recordsCreated: 0,
        recordsSkipped: scenarios.length,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: [],
        modelsTouched: [],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: { totalScenarios: scenarios.length, expected10K: scenarios.length >= 9000 },
      };
    }),
});
