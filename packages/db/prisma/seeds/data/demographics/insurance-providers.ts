// ═══════════════════════════════════════════════════════════════
// INSURANCE PROVIDERS — Indian health insurance landscape
// Source: IRDAI 2024 list + CGHS/ESIC/PMJAY official data
// Used for realistic patient insurance distribution in seed.
// ═══════════════════════════════════════════════════════════════

export type InsuranceCategory = 'government' | 'private' | 'corporate' | 'self-pay';

export interface InsuranceProvider {
  readonly id: string;
  readonly name: string;
  readonly category: InsuranceCategory;
  readonly coversDental: boolean;
  readonly coverageDentalScope:
    | 'comprehensive'
    | 'extraction-only'
    | 'rct-only'
    | 'preventive-only'
    | 'minimal'
    | 'none';
  readonly typicalCoverageInr: number;
  readonly populationCoveredCrore: number;
}

export const INSURANCE_PROVIDERS: readonly InsuranceProvider[] = [
  // ── Government ──
  {
    id: 'PMJAY',
    name: 'Ayushman Bharat PM-JAY',
    category: 'government',
    coversDental: false,
    coverageDentalScope: 'minimal',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 55,
  },
  {
    id: 'CGHS',
    name: 'Central Government Health Scheme',
    category: 'government',
    coversDental: true,
    coverageDentalScope: 'comprehensive',
    typicalCoverageInr: 0,
    populationCoveredCrore: 0.4,
  },
  {
    id: 'ESIC',
    name: 'Employees State Insurance Corporation',
    category: 'government',
    coversDental: true,
    coverageDentalScope: 'comprehensive',
    typicalCoverageInr: 0,
    populationCoveredCrore: 13,
  },
  {
    id: 'ECHS',
    name: 'Ex-Servicemen Contributory Health Scheme',
    category: 'government',
    coversDental: true,
    coverageDentalScope: 'comprehensive',
    typicalCoverageInr: 0,
    populationCoveredCrore: 0.5,
  },
  {
    id: 'STATE-AAROGYASRI',
    name: 'State Aarogyasri (AP, Telangana)',
    category: 'government',
    coversDental: false,
    coverageDentalScope: 'minimal',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 8,
  },

  // ── Private ──
  {
    id: 'STAR',
    name: 'Star Health Insurance',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'extraction-only',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 1.5,
  },
  {
    id: 'STAR-SENIOR',
    name: 'Star Senior Citizen Red Carpet',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'extraction-only',
    typicalCoverageInr: 1000000,
    populationCoveredCrore: 0.3,
  },
  {
    id: 'HDFC-ERGO',
    name: 'HDFC ERGO Health Insurance',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'extraction-only',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 1.2,
  },
  {
    id: 'NIVA-BUPA',
    name: 'Niva Bupa (formerly Max Bupa)',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'rct-only',
    typicalCoverageInr: 1000000,
    populationCoveredCrore: 1.0,
  },
  {
    id: 'CARE',
    name: 'Care Health Insurance',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'extraction-only',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 0.8,
  },
  {
    id: 'ICICI-LOMBARD',
    name: 'ICICI Lombard Complete Health',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'minimal',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 1.0,
  },
  {
    id: 'BAJAJ-ALLIANZ',
    name: 'Bajaj Allianz Health Insurance',
    category: 'private',
    coversDental: false,
    coverageDentalScope: 'none',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 0.7,
  },
  {
    id: 'ADITYA-BIRLA',
    name: 'Aditya Birla Health Insurance Activ Health',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'preventive-only',
    typicalCoverageInr: 1000000,
    populationCoveredCrore: 0.3,
  },
  {
    id: 'MANIPAL-CIGNA',
    name: 'ManipalCigna Health Insurance',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'extraction-only',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 0.2,
  },
  {
    id: 'TATA-AIG',
    name: 'Tata AIG MediCare',
    category: 'private',
    coversDental: true,
    coverageDentalScope: 'extraction-only',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 0.5,
  },
  {
    id: 'RGI',
    name: 'Reliance General Insurance',
    category: 'private',
    coversDental: false,
    coverageDentalScope: 'none',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 0.4,
  },
  {
    id: 'SBI-GENERAL',
    name: 'SBI General Health Insurance',
    category: 'private',
    coversDental: false,
    coverageDentalScope: 'none',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 0.3,
  },
  {
    id: 'ACKO',
    name: 'Acko Health Insurance',
    category: 'private',
    coversDental: false,
    coverageDentalScope: 'none',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 0.2,
  },

  // ── Corporate / Employer ──
  {
    id: 'GMC',
    name: 'Group Medical Cover (Corporate)',
    category: 'corporate',
    coversDental: true,
    coverageDentalScope: 'rct-only',
    typicalCoverageInr: 500000,
    populationCoveredCrore: 5,
  },
  {
    id: 'ONSURITY',
    name: 'Onsurity (SME healthcare)',
    category: 'corporate',
    coversDental: true,
    coverageDentalScope: 'preventive-only',
    typicalCoverageInr: 200000,
    populationCoveredCrore: 0.1,
  },
  {
    id: 'PLUM',
    name: 'Plum (startup-focused)',
    category: 'corporate',
    coversDental: true,
    coverageDentalScope: 'preventive-only',
    typicalCoverageInr: 300000,
    populationCoveredCrore: 0.05,
  },

  // ── Special schemes ──
  {
    id: 'NIRAMAYA',
    name: 'Niramaya Disability Insurance',
    category: 'government',
    coversDental: true,
    coverageDentalScope: 'comprehensive',
    typicalCoverageInr: 100000,
    populationCoveredCrore: 0.05,
  },
  {
    id: 'SMILE-TRAIN',
    name: 'Smile Train (Cleft NGO)',
    category: 'government',
    coversDental: true,
    coverageDentalScope: 'comprehensive',
    typicalCoverageInr: 0,
    populationCoveredCrore: 0.001,
  },

  // ── Self-pay ──
  {
    id: 'CASH',
    name: 'Self-pay (out of pocket)',
    category: 'self-pay',
    coversDental: false,
    coverageDentalScope: 'none',
    typicalCoverageInr: 0,
    populationCoveredCrore: 90,
  },
] as const;
