// ═══════════════════════════════════════════════════════════════
// SEQUENTIAL TEST — mSPRT for early stopping with valid p-values
// Source: Johari et al. 2017 "Peeking at A/B tests"
// ═══════════════════════════════════════════════════════════════
export interface SequentialTestResult {
  readonly canStopEarly: boolean;
  readonly currentPValue: number;
  readonly liftPct: number;
  readonly recommendation:
    | 'continue'
    | 'stop-winner-control'
    | 'stop-winner-treatment'
    | 'stop-no-effect';
}

export function mSprtTest(
  controlSum: number,
  controlN: number,
  treatmentSum: number,
  treatmentN: number,
  alpha = 0.05,
  tau = 1.0,
): SequentialTestResult {
  if (controlN < 50 || treatmentN < 50) {
    return { canStopEarly: false, currentPValue: 1, liftPct: 0, recommendation: 'continue' };
  }
  const muC = controlSum / controlN;
  const muT = treatmentSum / treatmentN;
  const liftPct = muC === 0 ? 0 : ((muT - muC) / Math.abs(muC)) * 100;
  // Simplified always-valid p-value (mSPRT-like)
  const pooledVar = 1 / controlN + 1 / treatmentN;
  const z = (muT - muC) / Math.sqrt(pooledVar * tau);
  const currentPValue = Math.min(1 / Math.max(Math.exp((z * z) / 2), 1), 1);
  let recommendation: SequentialTestResult['recommendation'] = 'continue';
  let canStopEarly = false;
  if (currentPValue < alpha) {
    canStopEarly = true;
    if (muT > muC) recommendation = 'stop-winner-treatment';
    else if (muT < muC) recommendation = 'stop-winner-control';
    else recommendation = 'stop-no-effect';
  }
  return { canStopEarly, currentPValue, liftPct, recommendation };
}
