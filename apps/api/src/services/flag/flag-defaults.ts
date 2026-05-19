// apps/api/src/services/flag/flag-defaults.ts
// ═══════════════════════════════════════════════════════════════
// FLAG DEFAULTS — Absolute safety fallback (Task #49)
// ─────────────────────────────────────────────────────────────────
// When every other layer fails (PostHog down, DB unreachable,
// Redis offline, in-memory cache cold) the evaluator returns the
// value defined HERE. This is the **last line of defence**.
//
// Memory rule #5 (no single point of failure): every flag MUST
// have a hard-coded default. The test suite asserts that every
// key in `FLAG_KEYS` is also a key in `FLAG_DEFAULTS` — a missing
// default breaks the build.
//
// Safety doctrine:
//   - KILL_SWITCH flags default to `false` (kill switch INACTIVE,
//     i.e. the feature it protects continues to work). The active
//     position requires deliberate admin action.
//   - RELEASE flags default to `false` (feature hidden until rolled out).
//   - EXPERIMENT flags default to `false` (control variant).
//   - OPERATIONAL flags default to safest setting (usually `true`
//     for "use proven fallback", e.g. AI_GPT_FALLBACK = true means
//     "yes, fall back to GPT if Claude fails").
//
// This file is intentionally a flat table — no logic, no imports
// from other flag-service files. The evaluator can read it from a
// catastrophic state (no DB, no Redis) and still answer.
// ═══════════════════════════════════════════════════════════════

import { FLAG_KEYS } from '@repo/shared';
import type { FlagKey } from '@repo/shared';

/**
 * Hard-coded last-resort defaults. The order below mirrors `flag-keys.ts`
 * exactly so reviewers can diff side-by-side.
 *
 * Every entry annotated with the chosen position + rationale.
 */
export const FLAG_DEFAULTS: Readonly<Record<FlagKey, boolean>> = Object.freeze({
  // ── Kill switches ── (false = NOT killed; system runs normally)
  [FLAG_KEYS.KILLSWITCH_AI_PROVIDERS]: false,
  [FLAG_KEYS.KILLSWITCH_PAYMENTS]: false,
  [FLAG_KEYS.KILLSWITCH_WHATSAPP_OUTBOUND]: false,
  [FLAG_KEYS.KILLSWITCH_MEDIA_UPLOAD]: false,
  [FLAG_KEYS.KILLSWITCH_SIGNUP]: false,

  // ── Consultation (clinical core) ── (false = feature hidden)
  [FLAG_KEYS.CONSULTATION_STREAMING]: false,
  [FLAG_KEYS.CONSULTATION_VOICE_INPUT]: false,
  [FLAG_KEYS.CONSULTATION_PHOTO_ANALYSIS_V2]: false,
  [FLAG_KEYS.CONSULTATION_NEW_INTAKE_FLOW]: false,

  // ── Clinic / B2B ── (false = stay on stable v1 surface)
  [FLAG_KEYS.CLINIC_DASHBOARD_V2]: false,
  [FLAG_KEYS.CLINIC_APPOINTMENT_REMINDERS]: false,
  [FLAG_KEYS.CLINIC_BULK_EXPORT]: false,
  [FLAG_KEYS.CLINIC_FAMILY_THREAD]: false,

  // ── AI providers / RAG ──
  //   GPT/Gemini fallback default = true so a Claude outage during
  //   a DB-down-incident still degrades gracefully (chain keeps working).
  [FLAG_KEYS.AI_RAG_ENABLED]: false,
  [FLAG_KEYS.AI_GPT_FALLBACK]: true,
  [FLAG_KEYS.AI_GEMINI_FALLBACK]: true,
  [FLAG_KEYS.AI_SHADOW_COMPARISON]: false,

  // ── Multilingual rollout ── (false = locale not yet available)
  [FLAG_KEYS.MULTILINGUAL_TAMIL]: false,
  [FLAG_KEYS.MULTILINGUAL_BENGALI]: false,
  [FLAG_KEYS.MULTILINGUAL_MARATHI]: false,
  [FLAG_KEYS.MULTILINGUAL_TELUGU]: false,

  // ── Experiments ── (false = control variant)
  [FLAG_KEYS.EXPERIMENT_PRICING_V3]: false,
  [FLAG_KEYS.EXPERIMENT_ONBOARDING_FLOW_V2]: false,
  [FLAG_KEYS.EXPERIMENT_ASSESSMENT_CTA_COLOR]: false,

  // ── Admin surfaces ── (false = hidden by default)
  [FLAG_KEYS.ADMIN_LABELING_QUEUE]: false,
  [FLAG_KEYS.ADMIN_AUTO_HANDOFF_EMERGENCY]: false,
  [FLAG_KEYS.ADMIN_BULK_EXPORT]: false,

  // ── UI polish ──
  //   Skeleton loaders + dark mode are pure-UX wins; safe to default ON.
  //   Animations v2 default off until perf budget is verified.
  [FLAG_KEYS.UI_ANIMATIONS_V2]: false,
  [FLAG_KEYS.UI_DARK_MODE]: true,
  [FLAG_KEYS.UI_SKELETON_LOADERS]: true,
});

/**
 * Get the hard-coded default for a flag.
 * Returns `false` when the key is unknown — a defensive, never-undefined
 * default that the evaluator can safely route to the caller.
 */
export function getFlagDefault(key: FlagKey | string): boolean {
  if (key in FLAG_DEFAULTS) {
    return FLAG_DEFAULTS[key as FlagKey];
  }
  return false;
}

/**
 * Return the full default map as a plain object (useful for the
 * anonymous-user `/api/flags` response so the marketing site has
 * something to render before login).
 */
export function getDefaultFlagMap(): Readonly<Record<string, boolean>> {
  return FLAG_DEFAULTS;
}
