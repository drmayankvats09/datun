// ═══════════════════════════════════════════════════════════════
// CO-MORBIDITY MATRIX — Realistic co-occurrence rates
// 60% of Indian dental patients have ≥2 conditions (PubMed Indian
// dental epidemiology). This matrix encodes which condition pairs
// commonly co-occur, used in patient seed for realistic generation.
// ═══════════════════════════════════════════════════════════════

export interface ComorbidityRule {
  /** Primary ICD-10 code */
  readonly primary: string;
  /** Co-occurring ICD-10 code */
  readonly comorbid: string;
  /** Probability of co-occurrence (0-1) */
  readonly probability: number;
  /** Source of this association */
  readonly evidence: 'high' | 'moderate' | 'clinical-experience';
}

export const COMORBIDITY_MATRIX: readonly ComorbidityRule[] = [
  // ── Periodontitis cluster ──
  { primary: 'K05.3', comorbid: 'K06.0', probability: 0.65, evidence: 'high' },
  { primary: 'K05.3', comorbid: 'K03.6', probability: 0.85, evidence: 'high' },
  { primary: 'K05.3', comorbid: 'K05.10', probability: 0.45, evidence: 'high' },
  { primary: 'K05.3', comorbid: 'K08.10', probability: 0.3, evidence: 'high' },
  { primary: 'K05.3', comorbid: 'K11.7', probability: 0.2, evidence: 'moderate' },

  // ── Caries cluster ──
  { primary: 'K02.51', comorbid: 'K03.6', probability: 0.7, evidence: 'high' },
  { primary: 'K02.52', comorbid: 'K05.10', probability: 0.4, evidence: 'high' },
  { primary: 'K02.53', comorbid: 'K04.0', probability: 0.55, evidence: 'high' },
  { primary: 'K04.0', comorbid: 'K04.1', probability: 0.35, evidence: 'high' },
  { primary: 'K04.1', comorbid: 'K04.5', probability: 0.5, evidence: 'high' },
  { primary: 'K04.5', comorbid: 'K04.8', probability: 0.3, evidence: 'moderate' },
  { primary: 'K04.7', comorbid: 'K10.2', probability: 0.4, evidence: 'high' },

  // ── TMJ + bruxism cluster ──
  { primary: 'K07.6', comorbid: 'M26.62', probability: 0.8, evidence: 'high' },
  { primary: 'K07.6', comorbid: 'G47.63', probability: 0.65, evidence: 'high' },
  { primary: 'G47.63', comorbid: 'K03.0', probability: 0.75, evidence: 'high' },
  { primary: 'G47.63', comorbid: 'K03.81', probability: 0.3, evidence: 'moderate' },

  // ── Erosion cluster ──
  { primary: 'K03.2', comorbid: 'K11.7', probability: 0.4, evidence: 'high' },
  { primary: 'K03.2', comorbid: 'K12.0', probability: 0.2, evidence: 'moderate' },

  // ── Wisdom tooth cluster ──
  { primary: 'K01.1', comorbid: 'K05.21', probability: 0.55, evidence: 'high' },
  { primary: 'K01.1', comorbid: 'K05.10', probability: 0.4, evidence: 'high' },

  // ── Tobacco/betel-nut pre-cancer cluster ──
  { primary: 'K13.21', comorbid: 'K13.5', probability: 0.45, evidence: 'high' },
  { primary: 'K13.5', comorbid: 'K13.7', probability: 0.3, evidence: 'moderate' },

  // ── Oral ulcers cluster ──
  { primary: 'K12.0', comorbid: 'K14.0', probability: 0.3, evidence: 'moderate' },
  { primary: 'K12.0', comorbid: 'K14.4', probability: 0.25, evidence: 'moderate' },

  // ── Edentulous + denture cluster ──
  { primary: 'K08.10', comorbid: 'K08.21', probability: 0.65, evidence: 'high' },
  { primary: 'K08.10', comorbid: 'K13.6', probability: 0.3, evidence: 'high' },
  { primary: 'K08.13', comorbid: 'K05.3', probability: 0.85, evidence: 'high' },

  // ── Oral candidiasis cluster ──
  { primary: 'B37.0', comorbid: 'K12.30', probability: 0.4, evidence: 'high' },
  { primary: 'B37.0', comorbid: 'K11.7', probability: 0.35, evidence: 'moderate' },

  // ── Xerostomia cluster ──
  { primary: 'K11.7', comorbid: 'K02.51', probability: 0.45, evidence: 'high' },
  { primary: 'K11.7', comorbid: 'K05.10', probability: 0.3, evidence: 'moderate' },

  // ── Trauma cluster ──
  { primary: 'S03.2', comorbid: 'S02.5', probability: 0.4, evidence: 'high' },
  { primary: 'S02.5', comorbid: 'K04.0', probability: 0.25, evidence: 'moderate' },
] as const;

/** Get all conditions that commonly co-occur with given primary ICD-10 */
export function getComorbidConditions(primaryIcd10: string, randomSeed: number): readonly string[] {
  const rules = COMORBIDITY_MATRIX.filter((r) => r.primary === primaryIcd10);
  const result: string[] = [];
  rules.forEach((rule, idx) => {
    const threshold = ((randomSeed + idx * 31) % 1000) / 1000;
    if (threshold < rule.probability) result.push(rule.comorbid);
  });
  return result;
}
