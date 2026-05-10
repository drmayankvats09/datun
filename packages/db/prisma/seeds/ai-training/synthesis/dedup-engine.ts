// ═══════════════════════════════════════════════════════════════
// DEDUP ENGINE — exact + semantic (cosine on hashed token n-grams)
// Source: PremAI synthetic data guide 2026
// ═══════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import type { SynthesizedExample } from './synthesis.types';

export function exactDedup(examples: readonly SynthesizedExample[]): readonly SynthesizedExample[] {
  const seen = new Set<string>();
  const out: SynthesizedExample[] = [];
  for (const e of examples) {
    const h = createHash('sha256').update(e.chiefComplaint.trim().toLowerCase()).digest('hex');
    if (!seen.has(h)) {
      seen.add(h);
      out.push(e);
    }
  }
  return out;
}

/** Token n-gram cosine similarity for fast semantic dedup (no embedding API). */
export async function semanticDedup(
  examples: readonly SynthesizedExample[],
  threshold = 0.85,
): Promise<readonly SynthesizedExample[]> {
  const out: SynthesizedExample[] = [];
  const fingerprints: Set<string>[] = [];

  for (const e of examples) {
    const fp = ngramFingerprint(e.chiefComplaint, 3);
    let isDup = false;
    for (const existing of fingerprints) {
      if (jaccardSim(fp, existing) >= threshold) {
        isDup = true;
        break;
      }
    }
    if (!isDup) {
      out.push(e);
      fingerprints.push(fp);
    }
  }
  return out;
}

function ngramFingerprint(text: string, n: number): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) grams.add(tokens.slice(i, i + n).join(' '));
  return grams;
}

function jaccardSim(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersect = 0;
  for (const x of a) if (b.has(x)) intersect++;
  return intersect / (a.size + b.size - intersect);
}
