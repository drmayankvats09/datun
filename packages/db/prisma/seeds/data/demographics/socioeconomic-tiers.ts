// ═══════════════════════════════════════════════════════════════
// SOCIO-ECONOMIC TIERS — Indian household income brackets
// Source: NCAER ICE 360° Household Survey + RBI HFCE 2024
// Used for realistic patient distribution + insurance likelihood
// ═══════════════════════════════════════════════════════════════

export type SocioEconomicTier = 'BPL' | 'lower-middle' | 'middle' | 'upper-middle' | 'HNI';

export interface SocioEconomicProfile {
  readonly tier: SocioEconomicTier;
  readonly label: string;
  readonly labelHindi: string;
  readonly householdIncomeMonthlyInr: { readonly min: number; readonly max: number };
  readonly populationSharePct: number;
  readonly typicalDentalSpendAnnualInr: { readonly min: number; readonly max: number };
  readonly insuranceCoveragePct: number;
}

export const SOCIO_ECONOMIC_TIERS: readonly SocioEconomicProfile[] = [
  {
    tier: 'BPL',
    label: 'Below Poverty Line',
    labelHindi: 'गरीबी रेखा से नीचे',
    householdIncomeMonthlyInr: { min: 0, max: 15000 },
    populationSharePct: 22,
    typicalDentalSpendAnnualInr: { min: 0, max: 500 },
    insuranceCoveragePct: 5, // mostly PMJAY, ESIC
  },
  {
    tier: 'lower-middle',
    label: 'Lower Middle Class',
    labelHindi: 'निम्न मध्यम वर्ग',
    householdIncomeMonthlyInr: { min: 15000, max: 50000 },
    populationSharePct: 35,
    typicalDentalSpendAnnualInr: { min: 500, max: 5000 },
    insuranceCoveragePct: 25,
  },
  {
    tier: 'middle',
    label: 'Middle Class',
    labelHindi: 'मध्यम वर्ग',
    householdIncomeMonthlyInr: { min: 50000, max: 150000 },
    populationSharePct: 28,
    typicalDentalSpendAnnualInr: { min: 5000, max: 25000 },
    insuranceCoveragePct: 55,
  },
  {
    tier: 'upper-middle',
    label: 'Upper Middle Class',
    labelHindi: 'उच्च मध्यम वर्ग',
    householdIncomeMonthlyInr: { min: 150000, max: 500000 },
    populationSharePct: 12,
    typicalDentalSpendAnnualInr: { min: 25000, max: 100000 },
    insuranceCoveragePct: 80,
  },
  {
    tier: 'HNI',
    label: 'High Net-Worth Individual',
    labelHindi: 'उच्च आय वर्ग',
    householdIncomeMonthlyInr: { min: 500000, max: 10000000 },
    populationSharePct: 3,
    typicalDentalSpendAnnualInr: { min: 100000, max: 1000000 },
    insuranceCoveragePct: 95,
  },
] as const;

/** Pick SES tier by realistic population distribution */
export function pickSocioEconomicTier(seed: number): SocioEconomicTier {
  const target = seed % 100;
  let cumulative = 0;
  for (const profile of SOCIO_ECONOMIC_TIERS) {
    cumulative += profile.populationSharePct;
    if (cumulative >= target) return profile.tier;
  }
  return 'middle';
}
