// ═══════════════════════════════════════════════════════════════
// SALT TYPES — Shared schema for all medication salt files
// Source: DCI India formulary + ADA recommended drug regimens
//         + WHO Essential Medicines List + Indian Pharmacopoeia 2024
// Reference: PMC PMC10039494 (India 12-month national prescription audit)
// ═══════════════════════════════════════════════════════════════

import type { PregnancyStatus } from '@prisma/client';

export type SaltCategory =
  | 'analgesic'
  | 'antibiotic'
  | 'antifungal'
  | 'antiviral'
  | 'antiseptic'
  | 'local-anesthetic'
  | 'hemostatic'
  | 'desensitizer'
  | 'steroid'
  | 'antacid'
  | 'antihistamine'
  | 'supplement';

export type Route = 'PO' | 'IM' | 'IV' | 'topical' | 'rinse' | 'subcutaneous' | 'sublingual';

/** Pregnancy categories — FDA + Indian regulatory consensus */
export type PregnancyCategory = 'A' | 'B' | 'C' | 'D' | 'X' | 'NOT_RATED';

export interface DentalSalt {
  readonly id: string;
  readonly saltName: string;
  readonly category: SaltCategory;
  readonly atcCode?: string; // WHO ATC classification
  readonly route: Route;
  readonly adultDose: string;
  readonly pediatricDose: string | null;
  readonly minAgeYears: number;
  readonly maxAgeYears: number;
  readonly pregnancyCategory: PregnancyCategory;
  readonly safeInPregnancy: boolean;
  readonly safeInBreastfeeding: boolean;
  readonly safeWithBloodThinners: boolean;
  readonly safeInRenalImpairment: boolean;
  readonly safeInHepaticImpairment: boolean;
  readonly contraindicatedAllergies: readonly string[];
  readonly drugInteractions: readonly string[]; // common interaction salts
  /** ICD-10 codes where this salt is typically prescribed */
  readonly commonIndicationsIcd10: readonly string[];
  /** True if commonly available OTC in India (no prescription needed) */
  readonly availableOtc: boolean;
  /** Approx INR cost per defined daily dose (DDD) — cheapest brand */
  readonly approxCostInrPerDdd: number;
}

export interface SafeMedicationProfile {
  readonly ageYears: number;
  readonly pregnancyStatus: PregnancyStatus;
  readonly onBloodThinners: boolean;
  readonly hasRenalImpairment: boolean;
  readonly hasHepaticImpairment: boolean;
  readonly allergies: readonly string[];
  readonly currentMedications: readonly string[];
}

export function isSaltSafeFor(salt: DentalSalt, profile: SafeMedicationProfile): boolean {
  if (profile.ageYears < salt.minAgeYears) return false;
  if (profile.ageYears > salt.maxAgeYears) return false;
  if (profile.pregnancyStatus === 'PREGNANT' && !salt.safeInPregnancy) return false;
  if (profile.pregnancyStatus === 'BREASTFEEDING' && !salt.safeInBreastfeeding) return false;
  if (profile.onBloodThinners && !salt.safeWithBloodThinners) return false;
  if (profile.hasRenalImpairment && !salt.safeInRenalImpairment) return false;
  if (profile.hasHepaticImpairment && !salt.safeInHepaticImpairment) return false;

  const lowerAllergies = profile.allergies.map((a) => a.toLowerCase());
  if (salt.contraindicatedAllergies.some((c) => lowerAllergies.includes(c.toLowerCase()))) {
    return false;
  }

  const lowerCurrent = profile.currentMedications.map((m) => m.toLowerCase());
  if (salt.drugInteractions.some((d) => lowerCurrent.includes(d.toLowerCase()))) {
    return false;
  }

  return true;
}
