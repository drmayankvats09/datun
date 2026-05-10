// ═══════════════════════════════════════════════════════════════
// PREFERENCE COLLECTOR — generate A/B candidates for human labeling
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { AnthropicAdapter, type ModelAdapter } from '../eval/eval-runner';

export interface CandidateGenOptions {
  prompt: string;
  modelA?: ModelAdapter;
  modelB?: ModelAdapter;
  systemPrompt?: string;
}

export async function generatePreferenceCandidates(
  opts: CandidateGenOptions,
): Promise<{ responseA: string; responseB: string; modelA: string; modelB: string }> {
  const a = opts.modelA ?? new AnthropicAdapter('claude-sonnet-4-6', 'claude-sonnet-4-6');
  const b = opts.modelB ?? new AnthropicAdapter('claude-haiku-4-5', 'claude-haiku-4-5-20251001');
  const sys = opts.systemPrompt ?? 'You are a dental triage AI. Provide concise clinical guidance.';
  const [responseA, responseB] = await Promise.all([
    a.generate(sys, opts.prompt),
    b.generate(sys, opts.prompt),
  ]);
  return { responseA, responseB, modelA: a.id, modelB: b.id };
}

export async function exportDpoDataset(
  prisma: PrismaClient,
  outputPath: string,
): Promise<{ rows: number; tieFraction: number }> {
  const pairs = await prisma.preferencePair.findMany({ orderBy: { reviewedAt: 'asc' } });
  const total = pairs.length;
  const ties = pairs.filter((p) => p.preferred === 'tie').length;
  const dpoRows = pairs
    .filter((p) => p.preferred !== 'tie')
    .map((p) => ({
      prompt: p.prompt,
      chosen: p.preferred === 'A' ? p.responseA : p.responseB,
      rejected: p.preferred === 'A' ? p.responseB : p.responseA,
    }));
  const { writeFileSync } = await import('node:fs');
  writeFileSync(outputPath, dpoRows.map((r) => JSON.stringify(r)).join('\n'));
  return { rows: dpoRows.length, tieFraction: total > 0 ? ties / total : 0 };
}
