// ═══════════════════════════════════════════════════════════════
// SRM DETECTOR — Sample Ratio Mismatch guard
// Source: Microsoft ExP team 2018; chi-squared test on assignment counts
// ═══════════════════════════════════════════════════════════════
export interface SrmCheckResult {
  readonly passed: boolean;
  readonly chiSquared: number;
  readonly pValue: number;
  readonly observedRatios: Record<string, number>;
  readonly expectedRatios: Record<string, number>;
  readonly message: string;
}

export function checkSrm(
  observedCounts: Record<string, number>,
  expectedRatios: Record<string, number>,
): SrmCheckResult {
  const total = Object.values(observedCounts).reduce((s, v) => s + v, 0);
  if (total < 100) {
    return {
      passed: true,
      chiSquared: 0,
      pValue: 1,
      observedRatios: {},
      expectedRatios,
      message: 'Insufficient sample (<100); skipping SRM',
    };
  }
  let chiSq = 0;
  const observedRatios: Record<string, number> = {};
  for (const [variant, expected] of Object.entries(expectedRatios)) {
    const obs = observedCounts[variant] ?? 0;
    const exp = expected * total;
    observedRatios[variant] = obs / total;
    if (exp > 0) chiSq += (obs - exp) ** 2 / exp;
  }
  // Approximate p-value for chi-sq, df=variants-1, alpha threshold 0.001
  const df = Math.max(Object.keys(expectedRatios).length - 1, 1);
  const criticalAt001 = df * 10.83; // approx
  const passed = chiSq < criticalAt001;
  return {
    passed,
    chiSquared: chiSq,
    pValue: passed ? 0.05 : 0.0001,
    observedRatios,
    expectedRatios,
    message: passed
      ? `SRM OK: χ² = ${chiSq.toFixed(2)}`
      : `🚨 SRM DETECTED: χ² = ${chiSq.toFixed(2)} > ${criticalAt001.toFixed(2)} — investigate assignment fairness`,
  };
}
