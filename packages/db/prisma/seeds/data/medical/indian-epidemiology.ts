// ═══════════════════════════════════════════════════════════════
// INDIAN DENTAL EPIDEMIOLOGY — Population-level prevalence data
// Source: National Oral Health Survey + WHO India + PubMed studies
// Used by seed factory for realistic patient distribution by region.
// ═══════════════════════════════════════════════════════════════

export interface RegionalPrevalence {
  readonly region: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'central';
  readonly cariesPrevalencePct: number;
  readonly periodontitisPrevalencePct: number;
  readonly tobaccoPrevalencePct: number;
  readonly fluorosisPrevalencePct: number;
  readonly oralCancerPrevalencePer100k: number;
}

export const REGIONAL_PREVALENCE: readonly RegionalPrevalence[] = [
  {
    region: 'north',
    cariesPrevalencePct: 52,
    periodontitisPrevalencePct: 51,
    tobaccoPrevalencePct: 38,
    fluorosisPrevalencePct: 8,
    oralCancerPrevalencePer100k: 12,
  },
  {
    region: 'south',
    cariesPrevalencePct: 49,
    periodontitisPrevalencePct: 48,
    tobaccoPrevalencePct: 32,
    fluorosisPrevalencePct: 18,
    oralCancerPrevalencePer100k: 18,
  },
  {
    region: 'east',
    cariesPrevalencePct: 56,
    periodontitisPrevalencePct: 58,
    tobaccoPrevalencePct: 45,
    fluorosisPrevalencePct: 6,
    oralCancerPrevalencePer100k: 24,
  },
  {
    region: 'west',
    cariesPrevalencePct: 47,
    periodontitisPrevalencePct: 49,
    tobaccoPrevalencePct: 35,
    fluorosisPrevalencePct: 12,
    oralCancerPrevalencePer100k: 14,
  },
  {
    region: 'northeast',
    cariesPrevalencePct: 44,
    periodontitisPrevalencePct: 46,
    tobaccoPrevalencePct: 60,
    fluorosisPrevalencePct: 4,
    oralCancerPrevalencePer100k: 32,
  },
  {
    region: 'central',
    cariesPrevalencePct: 51,
    periodontitisPrevalencePct: 53,
    tobaccoPrevalencePct: 42,
    fluorosisPrevalencePct: 22,
    oralCancerPrevalencePer100k: 20,
  },
] as const;

/** Age-specific prevalence rates (Indian National Oral Health Survey 2024 estimates) */
export const AGE_PREVALENCE = {
  '0-5': { caries: 35, fluorosis: 5, malocclusion: 5, trauma: 8 },
  '6-12': { caries: 60, fluorosis: 12, malocclusion: 25, trauma: 12 },
  '13-19': { caries: 55, periodontitis: 8, malocclusion: 35, wisdom: 15 },
  '20-34': { caries: 50, periodontitis: 25, malocclusion: 15, wisdom: 30, leukoplakia: 3 },
  '35-44': { caries: 45, periodontitis: 50, leukoplakia: 8, oralCancer: 0.05 },
  '45-64': { caries: 40, periodontitis: 70, leukoplakia: 14, edentulism: 8, oralCancer: 0.12 },
  '65+': { caries: 35, periodontitis: 75, edentulism: 35, xerostomia: 28, oralCancer: 0.2 },
} as const;
