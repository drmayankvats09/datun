// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG FACTORY — LaunchDarkly-style flags + per-clinic rollout
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface FeatureFlagOutput {
  readonly id: string;
  readonly flagKey: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'EXPERIMENT' | 'OPERATIONAL' | 'PERMISSION' | 'KILL_SWITCH' | 'BETA_FEATURE';
  readonly status: 'OFF' | 'ON' | 'ROLLOUT_BUCKET' | 'TARGETED';
  readonly defaultValue: boolean;
  readonly rolloutPercent: number;
  readonly targetingRules: object;
  readonly variants: object;
  readonly enabledClinicIds: readonly string[];
  readonly disabledClinicIds: readonly string[];
  readonly evaluationCount: number;
  readonly lastEvaluatedAt: Date | null;
  readonly createdByUserId: string;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface FeatureFlagTransient {
  readonly flagKey?: string;
}

const FLAG_TEMPLATES = [
  { key: 'voice-input-enabled', name: 'Voice Input', cat: 'BETA_FEATURE' as const },
  { key: 'photo-analysis-v2', name: 'Photo Analysis V2', cat: 'EXPERIMENT' as const },
  { key: 'multilingual-tamil', name: 'Tamil Language Support', cat: 'BETA_FEATURE' as const },
  { key: 'multilingual-bengali', name: 'Bengali Language Support', cat: 'BETA_FEATURE' as const },
  { key: 'auto-handoff-emergency', name: 'Auto-handoff on Emergency', cat: 'OPERATIONAL' as const },
  {
    key: 'killswitch-ai-providers',
    name: 'Kill Switch: AI Providers',
    cat: 'KILL_SWITCH' as const,
  },
  { key: 'killswitch-payments', name: 'Kill Switch: Payments', cat: 'KILL_SWITCH' as const },
  { key: 'experimental-pricing-v3', name: 'Pricing Page V3', cat: 'EXPERIMENT' as const },
  { key: 'admin-bulk-export', name: 'Admin Bulk Export', cat: 'PERMISSION' as const },
  { key: 'patient-family-thread', name: 'Family Thread', cat: 'BETA_FEATURE' as const },
];

export const featureFlagFactory = defineFactory<FeatureFlagOutput, FeatureFlagTransient>({
  name: 'clinic' as 'clinic',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    const template = transient.flagKey
      ? (FLAG_TEMPLATES.find((t) => t.key === transient.flagKey) ?? FLAG_TEMPLATES[0]!)
      : faker.helpers.arrayElement(FLAG_TEMPLATES);

    const status = faker.helpers.weightedArrayElement([
      { weight: 35, value: 'ON' as const },
      { weight: 25, value: 'ROLLOUT_BUCKET' as const },
      { weight: 20, value: 'OFF' as const },
      { weight: 20, value: 'TARGETED' as const },
    ]);

    return {
      id: `flag-${String(sequence).padStart(8, '0')}`,
      flagKey: `${template.key}-${sequence}`,
      name: template.name,
      description: `Feature flag for ${template.name}`,
      category: template.cat,
      status,
      defaultValue: status === 'ON',
      rolloutPercent: status === 'ROLLOUT_BUCKET' ? faker.number.int({ min: 5, max: 95 }) : 0,
      targetingRules:
        status === 'TARGETED'
          ? { rules: [{ attribute: 'clinic_tier', op: 'in', values: ['ENTERPRISE'] }] }
          : {},
      variants: { control: false, treatment: true },
      enabledClinicIds:
        status === 'TARGETED'
          ? Array.from(
              { length: faker.number.int({ min: 1, max: 5 }) },
              () => `clinic-${faker.number.int({ min: 1, max: 50 })}`,
            )
          : [],
      disabledClinicIds: [],
      evaluationCount: faker.number.int({ min: 0, max: 1000000 }),
      lastEvaluatedAt:
        faker.helpers.maybe(() => faker.date.recent({ days: 1 }), { probability: 0.9 }) ?? null,
      createdByUserId: 'user-000001',
      archivedAt:
        faker.helpers.maybe(() => faker.date.past({ years: 1 }), { probability: 0.1 }) ?? null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    };
  },

  persist: async (flag) => flag,
});
