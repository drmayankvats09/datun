// ═══════════════════════════════════════════════════════════════
// SHADOW RUNNER — runs candidate model alongside production
// Fire-and-forget — doesn't affect production response.
// ═══════════════════════════════════════════════════════════════

import { performance } from 'node:perf_hooks';

// ─────────────────────────────────────────────────────────────────
// MODEL ADAPTER — Inlined contract (model-adapter.ts not present)
// Pattern: Stripe-style adapter interface for swappable backends.
// ─────────────────────────────────────────────────────────────────
export interface ModelAdapter {
  readonly id: string;
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface ShadowRunResult {
  productionResponse: string;
  candidateResponse: string;
  productionLatencyMs: number;
  candidateLatencyMs: number;
  productionModel: string;
  candidateModel: string;
}

interface ShadowResultPayload {
  r: string;
  ms: number;
}

export async function runShadow(
  systemPrompt: string,
  userPrompt: string,
  production: ModelAdapter,
  candidate: ModelAdapter,
): Promise<ShadowRunResult> {
  const startProd = performance.now();
  const startCand = performance.now();
  const [prodResp, candResp]: [ShadowResultPayload, ShadowResultPayload] = await Promise.all([
    production
      .generate(systemPrompt, userPrompt)
      .then((r: string): ShadowResultPayload => ({ r, ms: performance.now() - startProd })),
    candidate
      .generate(systemPrompt, userPrompt)
      .then((r: string): ShadowResultPayload => ({ r, ms: performance.now() - startCand }))
      .catch(
        (e: unknown): ShadowResultPayload => ({
          r: `[shadow error: ${String(e)}]`,
          ms: performance.now() - startCand,
        }),
      ),
  ]);
  return {
    productionResponse: prodResp.r,
    candidateResponse: candResp.r,
    productionLatencyMs: Math.round(prodResp.ms),
    candidateLatencyMs: Math.round(candResp.ms),
    productionModel: production.id,
    candidateModel: candidate.id,
  };
}
