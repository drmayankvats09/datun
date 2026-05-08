// ═══════════════════════════════════════════════════════════════
// CONDITIONS BARREL — Single import point for ICD-10 dental conditions
// ═══════════════════════════════════════════════════════════════

export {
  ICD10_DENTAL_CONDITIONS,
  getConditionByIcd10,
  getConditionsByChapter,
  getConditionsByUrgency,
  getConditionsForAge,
  pickRealisticCondition,
} from './icd10-dental';

export type { DentalCondition, ConditionChapter, ConditionSeverity } from './icd10-dental';
