// ═══════════════════════════════════════════════════════════════
// ε-DIFFERENTIAL PRIVACY validator
// Source: Dwork-Roth "The Algorithmic Foundations of Differential Privacy"
// ═══════════════════════════════════════════════════════════════
export interface EpsilonReport {
  epsilon: number;
  passed: boolean;
  recommendedEpsilon: number;
  membershipInferenceRisk: 'low' | 'medium' | 'high';
  notes: readonly string[];
}

/**
 * Approximates ε from k-anonymity: ε ≤ ln((n-k+1)/k) for naive bound.
 * For DPDP/HIPAA Safe Harbor, target ε ≤ 1.0 (strong privacy).
 */
export function computeEpsilon(
  populationSize: number,
  kAnonymity: number,
  noiseScale = 1.0,
): EpsilonReport {
  if (kAnonymity < 1 || populationSize < kAnonymity) {
    return {
      epsilon: Infinity,
      passed: false,
      recommendedEpsilon: 1.0,
      membershipInferenceRisk: 'high',
      notes: ['Invalid k or N'],
    };
  }
  const epsilon = Math.log((populationSize - kAnonymity + 1) / kAnonymity) / noiseScale;
  const risk: EpsilonReport['membershipInferenceRisk'] =
    epsilon < 1 ? 'low' : epsilon < 3 ? 'medium' : 'high';
  return {
    epsilon: Math.round(epsilon * 1000) / 1000,
    passed: epsilon <= 3.0,
    recommendedEpsilon: 1.0,
    membershipInferenceRisk: risk,
    notes: [
      `Naive ε bound: ln((${populationSize} - ${kAnonymity} + 1) / ${kAnonymity}) / ${noiseScale}`,
      epsilon > 3 ? 'Increase k or noise scale to reduce ε' : 'ε within acceptable range',
    ],
  };
}

export function validateForCompliance(
  epsilon: number,
  profile: 'DPDP' | 'HIPAA' | 'GDPR',
): boolean {
  const limits = { DPDP: 3.0, HIPAA: 1.0, GDPR: 1.0 };
  return epsilon <= limits[profile];
}
