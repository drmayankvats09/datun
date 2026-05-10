// ═══════════════════════════════════════════════════════════════
// SALTS MASTER INDEX — Aggregates all 80+ dental salts
// Single import point. Provides safety-aware filtering.
// Pattern: AWS SDK aggregator, Stripe products catalog
// ═══════════════════════════════════════════════════════════════

import { ANALGESICS } from './analgesics';
import { ANTIBIOTICS } from './antibiotics';
import { ANTIFUNGALS, ANTIVIRALS } from './antifungals';
import { ANTISEPTICS, LOCAL_ANESTHETICS, HEMOSTATICS } from './topicals-and-injectables';
import { STEROIDS, ANTACIDS, ANTIHISTAMINES, DESENSITIZERS, SUPPLEMENTS } from './adjuncts';

import type { DentalSalt, SafeMedicationProfile, SaltCategory } from './types';
import { isSaltSafeFor } from './types';

export type {
  DentalSalt,
  SaltCategory,
  Route,
  PregnancyCategory,
  SafeMedicationProfile,
} from './types';
export { isSaltSafeFor } from './types';

/** All dental salts in single read-only array (80+ entries) */
export const ALL_DENTAL_SALTS: readonly DentalSalt[] = [
  ...ANALGESICS,
  ...ANTIBIOTICS,
  ...ANTIFUNGALS,
  ...ANTIVIRALS,
  ...ANTISEPTICS,
  ...LOCAL_ANESTHETICS,
  ...HEMOSTATICS,
  ...STEROIDS,
  ...ANTACIDS,
  ...ANTIHISTAMINES,
  ...DESENSITIZERS,
  ...SUPPLEMENTS,
] as const;

/** Filter all salts by category */
export function getSaltsByCategory(category: SaltCategory): readonly DentalSalt[] {
  return ALL_DENTAL_SALTS.filter((s) => s.category === category);
}

/** Filter all salts by ICD-10 indication */
export function getSaltsForIcd10(icd10Code: string): readonly DentalSalt[] {
  return ALL_DENTAL_SALTS.filter((s) =>
    s.commonIndicationsIcd10.some((c) => icd10Code.startsWith(c)),
  );
}

/** Get salts safe for given patient profile */
export function getSafeSaltsFor(profile: SafeMedicationProfile): readonly DentalSalt[] {
  return ALL_DENTAL_SALTS.filter((s) => isSaltSafeFor(s, profile));
}

/** Get salts safe for given patient AND clinically indicated by ICD-10 */
export function getSafeSaltsForIcd10(
  profile: SafeMedicationProfile,
  icd10Code: string,
): readonly DentalSalt[] {
  return getSaltsForIcd10(icd10Code).filter((s) => isSaltSafeFor(s, profile));
}

/** Lookup salt by ID — fast O(1) Map */
const SALT_BY_ID = new Map(ALL_DENTAL_SALTS.map((s) => [s.id, s]));
export function getSaltById(id: string): DentalSalt | undefined {
  return SALT_BY_ID.get(id);
}

/** Lookup salt by name (case-insensitive) */
export function getSaltByName(name: string): DentalSalt | undefined {
  const lower = name.toLowerCase();
  return ALL_DENTAL_SALTS.find((s) => s.saltName.toLowerCase() === lower);
}

// Re-export category arrays for direct access
export {
  ANALGESICS,
  ANTIBIOTICS,
  ANTIFUNGALS,
  ANTIVIRALS,
  ANTISEPTICS,
  LOCAL_ANESTHETICS,
  HEMOSTATICS,
  STEROIDS,
  ANTACIDS,
  ANTIHISTAMINES,
  DESENSITIZERS,
  SUPPLEMENTS,
};
