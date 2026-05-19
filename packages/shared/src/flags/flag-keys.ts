// packages/shared/src/flags/flag-keys.ts
// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG KEYS — Compile-time Registry (Task #49)
// ─────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for every flag identifier in the system.
//
// Every flag in the codebase MUST originate from this file. Hard-coding
// raw strings like `useFeatureFlag('new-chat-ui')` anywhere else is a
// lint-level violation — typos become silent production bugs.
//
// Naming convention: `<scope>.<feature>` in kebab-case.
//   ✅ `consultation.streaming`
//   ✅ `clinic.dashboard-v2`
//   ✅ `killswitch.ai-providers`
//   ❌ `newChatUI`        — must be kebab-case
//   ❌ `streaming`        — must have `<scope>.` prefix
//
// Categories (mirrored in Prisma enum FeatureFlagCategory):
//   - RELEASE     : Gating an unfinished feature for staged rollout
//   - EXPERIMENT  : A/B / multivariate testing
//   - OPERATIONAL : Ops toggles (e.g. enable_gpt_fallback)
//   - PERMISSION  : Plan / tier gating (e.g. clinic_pro_features)
//   - KILL_SWITCH : Emergency disable; instant rollback safety net
//   - BETA        : Beta / preview surfaces
//
// Lifecycle policy (LaunchDarkly + Uber):
//   Every flag MUST have a `staleAt` set in the DB row. After staleAt,
//   the admin dashboard surfaces the flag in a “to clean up” list.
//   Hygiene cron deletes archived flags older than 180 days.
//
// Reference patterns:
//   - LaunchDarkly: typed-flag generation
//   - Vercel Flags SDK: `const flag = flag<boolean>({ key: '…' })`
//   - Stripe internal: enum-keyed flag registry
// ═══════════════════════════════════════════════════════════════

/**
 * Canonical key registry. Add new flags HERE FIRST, then update
 * `FLAG_DEFAULTS` in `apps/api/src/services/flag/flag-defaults.ts`.
 *
 * Adding a key without a default = build failure in flag-defaults.test.
 */
export const FLAG_KEYS = {
  // ── KILL SWITCHES — Always start OFF in production ────────────
  KILLSWITCH_AI_PROVIDERS: 'killswitch.ai-providers',
  KILLSWITCH_PAYMENTS: 'killswitch.payments',
  KILLSWITCH_WHATSAPP_OUTBOUND: 'killswitch.whatsapp-outbound',
  KILLSWITCH_MEDIA_UPLOAD: 'killswitch.media-upload',
  KILLSWITCH_SIGNUP: 'killswitch.signup',

  // ── CONSULTATION (clinical core) ───────────────────────────────
  CONSULTATION_STREAMING: 'consultation.streaming',
  CONSULTATION_VOICE_INPUT: 'consultation.voice-input',
  CONSULTATION_PHOTO_ANALYSIS_V2: 'consultation.photo-analysis-v2',
  CONSULTATION_NEW_INTAKE_FLOW: 'consultation.new-intake-flow',

  // ── CLINIC (B2B revenue surface) ───────────────────────────────
  CLINIC_DASHBOARD_V2: 'clinic.dashboard-v2',
  CLINIC_APPOINTMENT_REMINDERS: 'clinic.appointment-reminders',
  CLINIC_BULK_EXPORT: 'clinic.bulk-export',
  CLINIC_FAMILY_THREAD: 'clinic.family-thread',

  // ── AI (provider control, RAG, fine-tune readiness) ───────────
  AI_RAG_ENABLED: 'ai.rag-enabled',
  AI_GPT_FALLBACK: 'ai.gpt-fallback',
  AI_GEMINI_FALLBACK: 'ai.gemini-fallback',
  AI_SHADOW_COMPARISON: 'ai.shadow-comparison',

  // ── MULTILINGUAL (regional rollout) ────────────────────────────
  MULTILINGUAL_TAMIL: 'multilingual.tamil',
  MULTILINGUAL_BENGALI: 'multilingual.bengali',
  MULTILINGUAL_MARATHI: 'multilingual.marathi',
  MULTILINGUAL_TELUGU: 'multilingual.telugu',

  // ── EXPERIMENTS (A/B — graduates to PostHog experiments) ──────
  EXPERIMENT_PRICING_V3: 'experiment.pricing-v3',
  EXPERIMENT_ONBOARDING_FLOW_V2: 'experiment.onboarding-flow-v2',
  EXPERIMENT_ASSESSMENT_CTA_COLOR: 'experiment.assessment-cta-color',

  // ── OPS (back-office, admin-only) ──────────────────────────────
  ADMIN_LABELING_QUEUE: 'admin.labeling-queue',
  ADMIN_AUTO_HANDOFF_EMERGENCY: 'admin.auto-handoff-emergency',
  ADMIN_BULK_EXPORT: 'admin.bulk-export',

  // ── UI / polish ────────────────────────────────────────────────
  UI_ANIMATIONS_V2: 'ui.animations-v2',
  UI_DARK_MODE: 'ui.dark-mode',
  UI_SKELETON_LOADERS: 'ui.skeleton-loaders',
} as const;

/**
 * Union of every valid flag key. Use this as the parameter type wherever
 * a flag key is accepted — TypeScript will reject any unknown string.
 */
export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

/**
 * All flag keys as a readonly array. Used by the API to validate that
 * a key arriving on the wire is in the registry before persisting it.
 */
export const ALL_FLAG_KEYS: readonly FlagKey[] = Object.values(FLAG_KEYS) as readonly FlagKey[];

/**
 * Quick lookup set — O(1) `has()` check at runtime.
 * The Express route handlers use this to reject unknown keys with 400.
 */
export const FLAG_KEY_SET: ReadonlySet<string> = new Set<string>(ALL_FLAG_KEYS);

/**
 * Type-guard: narrows an arbitrary string to `FlagKey` at compile time.
 *
 * @example
 *   const raw: string = req.params.key;
 *   if (!isKnownFlagKey(raw)) return res.status(400).end();
 *   // raw is now typed as FlagKey
 */
export function isKnownFlagKey(value: string): value is FlagKey {
  return FLAG_KEY_SET.has(value);
}

/**
 * Validate the kebab-case shape of a flag key at runtime. Used by the
 * admin CRUD route when an admin proposes a new flag — we accept the
 * key only if it matches this shape AND has a corresponding entry in
 * the registry (enforced by `isKnownFlagKey`).
 */
export const FLAG_KEY_PATTERN = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

export function isWellFormedFlagKey(value: string): boolean {
  return FLAG_KEY_PATTERN.test(value);
}
