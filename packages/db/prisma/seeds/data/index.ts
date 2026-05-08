// ═══════════════════════════════════════════════════════════════
// MASTER DATA BARREL — Single import point for ALL Wave 2 v2 data
// 4 layers: medical (brain) + demographics (realism) + linguistic
// (voice) + scenarios (diversity) + 4 kept Wave 2 v1 contracts.
// Pattern: Stripe products/, Linear @linear/data
// ═══════════════════════════════════════════════════════════════

// ── 4 NEW LAYERS (Wave 2 v2) ──
export * from './medical';
export {
  // explicit re-export — prevents SocioEconomicTier ambiguity
  INDIAN_CITIES,
  getCitiesByTier,
  INSURANCE_PROVIDERS,
  pickReferralChannel,
} from './demographics';
export * from './linguistic';
export * from './scenarios';

// ── 4 KEPT FROM WAVE 2 v1 (already FAANG-grade contracts) ──
export {
  DENTAL_QUALIFICATIONS,
  DENTAL_SPECIALIZATIONS,
  REGISTRATION_COUNCILS,
  generateRegistrationNumber,
  type DentalQualification,
  type DentalSpecialization,
} from './qualifications';

export {
  WHATSAPP_TEMPLATES,
  type WhatsAppTemplateName,
  type WhatsAppTemplateMeta,
} from './whatsapp-templates';

export { PROMPT_VERSIONS, ACTIVE_PROMPT_VERSION, type PromptVersion } from './system-prompts';

export {
  TRAINING_QUALITY_RUBRIC,
  OUTCOME_TAGS,
  type QualityScore,
  type OutcomeTag,
} from './training-quality-rubric';
