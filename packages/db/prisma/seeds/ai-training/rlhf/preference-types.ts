// ═══════════════════════════════════════════════════════════════
// PREFERENCE PAIR — DPO-compatible schema
// ═══════════════════════════════════════════════════════════════
export type Preference = 'A' | 'B' | 'tie';

export interface PreferencePair {
  readonly id: string;
  readonly prompt: string;
  readonly responseA: string;
  readonly responseB: string;
  readonly preferred: Preference;
  readonly confidence: 1 | 2 | 3 | 4 | 5;
  readonly rationale?: string;
  readonly reviewerId: string;
  readonly reviewedAt: Date;
  readonly modelA: string;
  readonly modelB: string;
  readonly safetyRelevant: boolean;
}

/** Build a DPO training row from a preference pair */
export function toDpoRow(
  p: PreferencePair,
): { prompt: string; chosen: string; rejected: string } | null {
  if (p.preferred === 'tie') return null;
  return {
    prompt: p.prompt,
    chosen: p.preferred === 'A' ? p.responseA : p.responseB,
    rejected: p.preferred === 'A' ? p.responseB : p.responseA,
  };
}
