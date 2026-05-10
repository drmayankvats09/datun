// ═══════════════════════════════════════════════════════════════
// MODULE: reference.archetypes-catalog v2.1
//
// Maps Wave 2 v2 patient archetypes (50 archetypes) into v2
// PatientArchetype schema.
//
// Key transformations:
//   - id 'arch-001' → randomUUID() (schema requires @db.Uuid)
//   - archetypeKey field (REQUIRED unique): derived from 'arch-001'
//   - label → name field
//   - weight → populationWeight
//   - locale field (REQUIRED ArchetypeLocale enum): derived heuristically
//   - JSON fields: pass as objects, not stringified
//   - extra v1 fields (tobaccoUse, medicalConditions, currentMedications,
//     allergies, typicalChiefComplaint, typicalUrgency) → behaviors JSON
//
// Task #43.5 Phase 2 will:
//   - Add 25 more archetypes (total 75)
//   - Populate safetyConstraints JSON per archetype
//   - Add NFHS-5 demographic precision
//   - Cultural pattern enrichment
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import { PATIENT_ARCHETYPES } from '../../data/medical/archetypes';
import type { PatientArchetype } from '../../data/medical/archetypes/types';
import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { bulkInsert } from '../../factories/core/bulk-insert';

// ─────────────────────────────────────────────────────────────────
// LOOKUP: Heuristic ArchetypeLocale derivation from residence + language
// ─────────────────────────────────────────────────────────────────
type ArchetypeLocaleEnum =
  | 'NORTH_INDIA_URBAN'
  | 'NORTH_INDIA_RURAL'
  | 'SOUTH_INDIA_URBAN'
  | 'SOUTH_INDIA_RURAL'
  | 'EAST_INDIA_URBAN'
  | 'EAST_INDIA_RURAL'
  | 'WEST_INDIA_URBAN'
  | 'WEST_INDIA_RURAL'
  | 'CENTRAL_INDIA_URBAN'
  | 'CENTRAL_INDIA_RURAL'
  | 'METRO_TIER_1'
  | 'METRO_TIER_2'
  | 'METRO_TIER_3';

function deriveLocale(a: PatientArchetype): ArchetypeLocaleEnum {
  const langs = a.preferredLanguages.map((l) => l.toLowerCase());
  const residences = a.residence.map((r) => r.toLowerCase());

  const hasUrbanT1 = residences.includes('urban-tier-1');
  const hasUrbanT2 = residences.includes('urban-tier-2');
  const hasRural = residences.includes('rural') || residences.includes('semi-urban');

  // Tier-1 metros take priority
  if (hasUrbanT1 && !hasRural) return 'METRO_TIER_1';
  if (hasUrbanT2 && !hasRural) return 'METRO_TIER_2';

  // Region from language
  const isSouth = langs.some((l) => ['tamil', 'telugu', 'kannada', 'malayalam'].includes(l));
  const isEast = langs.some((l) => ['bengali', 'odia', 'assamese'].includes(l));
  const isWest = langs.some((l) => ['gujarati', 'marathi'].includes(l));

  if (isSouth) return hasRural ? 'SOUTH_INDIA_RURAL' : 'SOUTH_INDIA_URBAN';
  if (isEast) return hasRural ? 'EAST_INDIA_RURAL' : 'EAST_INDIA_URBAN';
  if (isWest) return hasRural ? 'WEST_INDIA_RURAL' : 'WEST_INDIA_URBAN';

  // Default: North India
  return hasRural ? 'NORTH_INDIA_RURAL' : 'NORTH_INDIA_URBAN';
}

// ─────────────────────────────────────────────────────────────────
// ADAPTER: Wave 2 v2 PatientArchetype → v2 PatientArchetype schema
// ─────────────────────────────────────────────────────────────────
interface PatientArchetypeCreateInput {
  readonly id: string;
  readonly archetypeKey: string;
  readonly name: string;
  readonly description: string | null;
  readonly locale: ArchetypeLocaleEnum;
  readonly ageMin: number;
  readonly ageMax: number;
  readonly gender: readonly string[];
  readonly sesTiers: readonly string[];
  readonly residence: readonly string[];
  readonly educationLevels: readonly string[];
  readonly populationWeight: number;
  readonly primaryConditionIcd10: string;
  readonly comorbidConditionsIcd10: readonly string[];
  readonly pregnancyStatus: readonly string[];
  readonly smokingStatus: readonly string[];
  readonly preferredLanguages: readonly string[];
  readonly insuranceLikely: readonly string[];
  readonly referralChannels: readonly string[];
  readonly behaviors: Record<string, unknown>;
  readonly safetyConstraints: Record<string, unknown> | null;
  readonly isActive: boolean;
}

function adaptArchetypeToV2Schema(a: PatientArchetype): PatientArchetypeCreateInput {
  return {
    id: randomUUID(),
    archetypeKey: a.id, // 'arch-001' becomes the unique key
    name: a.label, // v1 'label' → schema 'name'
    description: a.typicalChiefComplaint, // chief complaint is a description
    locale: deriveLocale(a),
    ageMin: a.age.min,
    ageMax: a.age.max,
    gender: a.gender,
    sesTiers: a.socioEconomicTier,
    residence: a.residence,
    educationLevels: a.educationLevel,
    populationWeight: a.weight,
    primaryConditionIcd10: a.primaryConditionIcd10,
    comorbidConditionsIcd10: a.comorbidConditionIcd10,
    pregnancyStatus: a.pregnancyStatus,
    smokingStatus: a.smokingStatus,
    preferredLanguages: a.preferredLanguages,
    insuranceLikely: a.insuranceLikely,
    referralChannels: a.referralChannels,
    behaviors: {
      tobaccoUse: a.tobaccoUse,
      medicalConditions: a.medicalConditions,
      currentMedications: a.currentMedications,
      allergies: a.allergies,
      typicalChiefComplaint: a.typicalChiefComplaint,
      typicalUrgency: a.typicalUrgency,
    },
    safetyConstraints: null, // Task #43.5 Phase 2
    isActive: true,
  };
}

// ─────────────────────────────────────────────────────────────────
// MODULE DEFINITION
// ─────────────────────────────────────────────────────────────────
export const archetypesCatalogModule = defineModule({
  name: 'reference.archetypes-catalog',
  description: '50 patient archetypes (Wave 2 v2 → v2 schema adapter)',
  category: 'reference',
  version: '2.1.0',
  dependencies: [],
  modelsTouched: ['patientArchetype'],
  factoriesUsed: [],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: {
    kind: 'COUNT_THRESHOLD',
    modelName: 'patientArchetype',
    threshold: PATIENT_ARCHETYPES.length,
  },
  useTransaction: true,
  allowedEnvironments: ['development', 'test', 'staging', 'production'],
  providesRegistryKeys: ['reference.archetypes.count'],

  checkIdempotency: async (ctx) => {
    const m = (
      ctx.prisma as unknown as {
        patientArchetype?: { count: () => Promise<number> };
      }
    ).patientArchetype;
    return m ? (await m.count()) >= PATIENT_ARCHETYPES.length : false;
  },

  run: async (ctx) =>
    measureExecution(archetypesCatalogModule, ctx, async () => {
      environmentGuard(archetypesCatalogModule, ctx);

      const records = PATIENT_ARCHETYPES.map(adaptArchetypeToV2Schema);

      let created = 0;
      await runInScope(archetypesCatalogModule, ctx, async (tx) => {
        const result = await bulkInsert(tx, 'patientArchetype' as never, records, {
          batchSize: 50,
          skipDuplicates: true,
        });
        created = result.totalInserted;
      });

      ctx.registry.set('reference.archetypes.count', created);
      ctx.logger.info('✓ Archetypes catalog seeded (Wave 2 v2 → v2 schema)', {
        created,
        adapterVersion: '2.1.0',
      });

      return {
        recordsCreated: created,
        recordsSkipped: PATIENT_ARCHETYPES.length - created,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: [],
        modelsTouched: ['patientArchetype'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {
          totalArchetypes: PATIENT_ARCHETYPES.length,
          adapterPhase: 0,
          taskRef: '#43.5',
        },
      };
    }),

  compensate: async (ctx) => {
    const m = (
      ctx.prisma as unknown as {
        patientArchetype?: { deleteMany: (args: object) => Promise<unknown> };
      }
    ).patientArchetype;
    if (m) {
      await m.deleteMany({
        where: { archetypeKey: { in: PATIENT_ARCHETYPES.map((a) => a.id) } },
      });
    }
  },
});
