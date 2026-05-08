// ═══════════════════════════════════════════════════════════════
// FEATURE FLAGS — Phase G activation switches
//
// All Phase G integrations are GATED behind these flags.
// Default: OFF in production. Existing code paths unchanged.
//
// Activation strategy:
//   1. Deploy with flag OFF (current behaviour)
//   2. Verify integration in staging with flag ON
//   3. Flip Railway env var → re-deploy → integration active
//   4. Monitor for 24h → if regression, flip OFF (instant rollback)
//
// FAANG philosophy: every cross-cutting change ships behind a flag.
// References: LaunchDarkly progressive delivery, Unleash, Netflix's
// Spinnaker canary pipelines.
// ═══════════════════════════════════════════════════════════════

import { env } from './env.js';

function asBool(v: string | undefined, defaultValue = false): boolean {
  if (v === undefined) return defaultValue;
  return v === 'true' || v === '1' || v === 'yes';
}

export const featureFlags = {
  /**
   * When true, WhatsApp + email sends route through the outbox table.
   * Outbox relay worker processes them asynchronously with at-least-once
   * semantics + DLQ on persistent failure.
   *
   * When false, sends go directly via whatsapp/email service (current).
   */
  outboxEnabled: asBool(process.env.OUTBOX_ENABLED, false),

  /**
   * When true, every Claude call records drift signals (input distribution
   * + concept distribution) for the hourly drift-check processor.
   *
   * When false, no drift recording happens. AI service unchanged.
   */
  driftTrackingEnabled: asBool(process.env.DRIFT_TRACKING_ENABLED, false),

  /**
   * When true, prompts are loaded from PromptVersion table (with rollout
   * percentages applied). When false, prompts are hardcoded in
   * apps/api/src/prompts/*.ts files (current).
   */
  promptVersioningEnabled: asBool(process.env.PROMPT_VERSIONING_ENABLED, false),

  /**
   * When true, runs the data-quality daily processor in apps/worker.
   * Independent of any user-facing flow — data quality runs against
   * production tables and surfaces results via /api/health/data-quality.
   */
  dataQualityEnabled: asBool(process.env.DATA_QUALITY_ENABLED, false),

  /**
   * When true, every Claude completion ALSO runs through a "shadow"
   * candidate prompt/model and the comparator records divergence.
   * Cost: 2x Claude tokens. Only enable for explicit shadow experiments.
   */
  shadowComparisonEnabled: asBool(process.env.SHADOW_COMPARISON_ENABLED, false),

  /**
   * When true, admin routes under /api/admin are mounted. Requires the
   * caller to be a user with role=ADMIN (enforced by middleware).
   */
  adminRoutesEnabled: asBool(process.env.ADMIN_ROUTES_ENABLED, env.NODE_ENV !== 'production'),
} as const;

export type FeatureFlag = keyof typeof featureFlags;

/**
 * Helper for log lines: emit current flag state on boot.
 * Call once during app startup so deployment logs capture the flag matrix.
 */
export function getFeatureFlagSnapshot(): Record<FeatureFlag, boolean> {
  return { ...featureFlags };
}
