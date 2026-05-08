// ═══════════════════════════════════════════════════════════════
// PATIENT ARCHETYPE TYPES — Schema for 50 realistic patient profiles
// Pattern: SAP industry personas, healthcare epi cohorts
// Each archetype = a realistic Indian patient cluster.
// Factory generates 1000s of patients matching archetype distribution.
// ═══════════════════════════════════════════════════════════════

import type { Gender, PregnancyStatus, SmokingStatus, UrgencyLevel } from '@prisma/client';

export type SocioEconomicTier = 'BPL' | 'lower-middle' | 'middle' | 'upper-middle' | 'HNI';
export type ResidenceType =
  | 'urban-tier-1'
  | 'urban-tier-2'
  | 'urban-tier-3'
  | 'semi-urban'
  | 'rural';
export type EducationLevel =
  | 'illiterate'
  | 'school'
  | 'undergraduate'
  | 'graduate'
  | 'postgraduate';
export type PreferredLanguage =
  | 'hindi'
  | 'english'
  | 'punjabi'
  | 'bengali'
  | 'tamil'
  | 'telugu'
  | 'marathi'
  | 'gujarati';

export interface PatientArchetype {
  readonly id: string;
  readonly label: string;
  readonly weight: number; // distribution weight (1-100)
  readonly age: { readonly min: number; readonly max: number };
  readonly gender: readonly Gender[];
  readonly pregnancyStatus: readonly PregnancyStatus[];
  readonly smokingStatus: readonly SmokingStatus[];
  readonly tobaccoUse: boolean | null; // null = either
  readonly residence: readonly ResidenceType[];
  readonly socioEconomicTier: readonly SocioEconomicTier[];
  readonly educationLevel: readonly EducationLevel[];
  readonly preferredLanguages: readonly PreferredLanguage[];
  readonly primaryConditionIcd10: string;
  readonly comorbidConditionIcd10: readonly string[];
  readonly medicalConditions: readonly string[]; // free-text systemic conditions
  readonly currentMedications: readonly string[];
  readonly allergies: readonly string[];
  readonly typicalUrgency: UrgencyLevel;
  readonly typicalChiefComplaint: string;
  readonly insuranceLikely: readonly string[]; // insurance provider IDs
  readonly referralChannels: readonly string[]; // how patient discovered Datun
}
