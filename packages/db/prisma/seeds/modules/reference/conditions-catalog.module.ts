// ═══════════════════════════════════════════════════════════════
// MODULE: reference.conditions-catalog v2.1
//
// Maps Wave 2 v2 ICD-10 dental conditions (100+ K-chapter codes)
// into v2 DentalCondition schema.
//
// ARCHITECTURE NOTE — Task #43 vs Task #43.5:
// ───────────────────────────────────────────────────────────────
// Task #43 (current): Adapter ships Wave 2 v2 conditions data
// into v2 schema with field renames + JSON wrapping for new fields.
//
// Task #43.5 Phase 2: Expand from 100 → 150 ICD-10 codes,
// populate symptoms/homeRemedies/typicalMedications JSON depth,
// add nameLocalized for all 8 supported Indian languages.
//
// Source: ADA-IHS-WHO ICD-10-CM 2024 official codeset
// ═══════════════════════════════════════════════════════════════

import { ICD10_DENTAL_CONDITIONS } from '../../data/medical/conditions';
import type { DentalCondition, ConditionChapter } from '../../data/medical/conditions/icd10-dental';
import { defineModule, environmentGuard, measureExecution, runInScope } from '../core';
import { bulkInsert } from '../../factories/core/bulk-insert';

// ─────────────────────────────────────────────────────────────────
// LOOKUP: ICD-10 K-chapter → category string
// ─────────────────────────────────────────────────────────────────
function mapChapterToCategory(chapter: ConditionChapter): string {
  switch (chapter) {
    case 'K00':
      return 'tooth-development-eruption';
    case 'K01':
      return 'embedded-impacted-teeth';
    case 'K02':
      return 'dental-caries';
    case 'K03':
      return 'hard-tissue-disease';
    case 'K04':
      return 'pulp-periapical';
    case 'K05':
      return 'gingivitis-periodontal';
    case 'K06':
      return 'gum-edentulous-ridge';
    case 'K07':
      return 'dentofacial-anomalies';
    case 'K08':
      return 'tooth-supporting-structures';
    case 'K09':
      return 'cysts-oral-region';
    case 'K10':
      return 'jaw-disease';
    case 'K11':
      return 'salivary-gland-disease';
    case 'K12':
      return 'stomatitis';
    case 'K13':
      return 'lip-mucosa-disease';
    case 'K14':
      return 'tongue-disease';
    default:
      return 'other';
  }
}

// ─────────────────────────────────────────────────────────────────
// ADAPTER: Wave 2 v2 DentalCondition → v2 DentalCondition schema
// ─────────────────────────────────────────────────────────────────
interface DentalConditionCreateInput {
  readonly icd10Code: string;
  readonly chapterCode: string;
  readonly subchapterCode: string | null;
  readonly parentCode: string | null;
  readonly name: string;
  readonly nameLocalized: Record<string, string>;
  readonly shortDescription: string | null;
  readonly fullDescription: string | null;
  readonly category: string;
  readonly subcategory: string | null;
  readonly isLeafCode: boolean;
  readonly excludesCodes: string[];
  readonly includesCodes: string[];
  readonly seeAlsoCodes: string[];
  readonly prevalencePercent: number | null;
  readonly typicalSeverity: 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'ROUTINE';
  readonly isUrgent: boolean;
  readonly requiresXray: boolean;
  readonly affectedAgeGroups: Record<string, number>;
  readonly riskFactors: Record<string, unknown> | null;
  readonly symptoms: Record<string, unknown> | null;
  readonly homeRemedies: Record<string, unknown> | null;
  readonly typicalMedications: Record<string, unknown>;
  readonly isActive: boolean;
}

function adaptConditionToV2Schema(c: DentalCondition): DentalConditionCreateInput {
  // Determine subchapter from icd10Code (e.g., 'K00.7' → 'K00')
  const dotIndex = c.icd10Code.indexOf('.');
  const subchapterCode = dotIndex > 0 ? c.icd10Code.substring(0, dotIndex) : null;

  // Convert per-100k prevalence to percent: per100k / 1000 = percent
  const prevalencePercent = c.indianPrevalencePer100k / 1000;

  // Map condition severity to UrgencyLevel enum
  const isUrgent = c.defaultUrgency === 'EMERGENCY' || c.defaultUrgency === 'URGENT';

  return {
    icd10Code: c.icd10Code,
    chapterCode: c.chapter,
    subchapterCode,
    parentCode: null, // Phase 0; Task #43.5 will populate hierarchy
    name: c.nameEnglish,
    nameLocalized: { hi: c.nameHindi },
    shortDescription: null,
    fullDescription: null,
    category: mapChapterToCategory(c.chapter),
    subcategory: c.severity, // Use severity as subcategory placeholder
    isLeafCode: dotIndex > 0, // Has decimal = leaf code
    excludesCodes: [],
    includesCodes: [],
    seeAlsoCodes: [],
    prevalencePercent,
    typicalSeverity: c.defaultUrgency,
    isUrgent,
    requiresXray: c.requiresXray,
    affectedAgeGroups: {
      minAgeYears: c.typicalAgeRange.min,
      maxAgeYears: c.typicalAgeRange.max,
    },
    riskFactors: c.comorbidityTags.length > 0 ? { tags: c.comorbidityTags } : null,
    symptoms: null, // Task #43.5 Phase 2
    homeRemedies: null, // Task #43.5 Phase 2
    typicalMedications: {
      categories: c.typicalSaltCategories,
      requiresOpg: c.requiresOpg,
      requiresCbct: c.requiresCbct,
      femaleFavored: c.femaleFavored,
    },
    isActive: true,
  };
}

// ─────────────────────────────────────────────────────────────────
// MODULE DEFINITION
// ─────────────────────────────────────────────────────────────────
export const conditionsCatalogModule = defineModule({
  name: 'reference.conditions-catalog',
  description: 'ICD-10 K00-K14 dental conditions (Wave 2 v2 → v2 schema adapter)',
  category: 'reference',
  version: '2.1.0',
  dependencies: [],
  modelsTouched: ['dentalCondition'],
  factoriesUsed: [],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: {
    kind: 'COUNT_THRESHOLD',
    modelName: 'dentalCondition',
    threshold: ICD10_DENTAL_CONDITIONS.length,
  },
  useTransaction: true,
  allowedEnvironments: ['development', 'test', 'staging', 'production'],
  providesRegistryKeys: ['reference.conditions.count'],

  checkIdempotency: async (ctx) => {
    const m = (
      ctx.prisma as unknown as {
        dentalCondition?: { count: () => Promise<number> };
      }
    ).dentalCondition;
    return m ? (await m.count()) >= ICD10_DENTAL_CONDITIONS.length : false;
  },

  run: async (ctx) =>
    measureExecution(conditionsCatalogModule, ctx, async () => {
      environmentGuard(conditionsCatalogModule, ctx);

      const records = ICD10_DENTAL_CONDITIONS.map(adaptConditionToV2Schema);

      let created = 0;
      await runInScope(conditionsCatalogModule, ctx, async (tx) => {
        const result = await bulkInsert(tx, 'dentalCondition' as never, records, {
          batchSize: 100,
          skipDuplicates: true,
        });
        created = result.totalInserted;
      });

      ctx.registry.set('reference.conditions.count', created);
      ctx.logger.info('✓ Conditions catalog seeded (Wave 2 v2 → v2 schema)', {
        created,
        adapterVersion: '2.1.0',
      });

      return {
        recordsCreated: created,
        recordsSkipped: ICD10_DENTAL_CONDITIONS.length - created,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: [],
        modelsTouched: ['dentalCondition'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {
          totalConditions: ICD10_DENTAL_CONDITIONS.length,
          adapterPhase: 0,
          taskRef: '#43.5',
        },
      };
    }),

  compensate: async (ctx) => {
    const m = (
      ctx.prisma as unknown as {
        dentalCondition?: { deleteMany: (args: object) => Promise<unknown> };
      }
    ).dentalCondition;
    if (m) {
      await m.deleteMany({
        where: { icd10Code: { in: ICD10_DENTAL_CONDITIONS.map((c) => c.icd10Code) } },
      });
    }
  },
});
