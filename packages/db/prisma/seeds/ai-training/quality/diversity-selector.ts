// ═══════════════════════════════════════════════════════════════
// DIVERSITY SELECTOR — Maximum Marginal Relevance for diverse training set
// Source: Carbonell & Goldstein 1998 (MMR)
// ═══════════════════════════════════════════════════════════════
import type { SynthesizedExample } from '../synthesis/synthesis.types';

export function selectDiverse(
  candidates: readonly SynthesizedExample[],
  targetCount: number,
  lambda = 0.7,
): readonly SynthesizedExample[] {
  if (candidates.length <= targetCount) return candidates;
  const selected: SynthesizedExample[] = [];
  const remaining = [...candidates];

  // Seed: highest quality
  remaining.sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  selected.push(remaining.shift()!);

  while (selected.length < targetCount && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]!;
      const relevance = cand.qualityScore ?? 0;
      const maxSim = Math.max(
        ...selected.map((s) => textOverlap(cand.chiefComplaint, s.chiefComplaint)),
      );
      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = i;
      }
    }
    selected.push(remaining.splice(bestIdx, 1)[0]!);
  }
  return selected;
}

function textOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/));
  const tb = new Set(b.toLowerCase().split(/\s+/));
  let intersect = 0;
  for (const t of ta) if (tb.has(t)) intersect++;
  return intersect / Math.max(ta.size + tb.size - intersect, 1);
}
