// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG FACTORY — Task #49 production-grade rebuild
// ─────────────────────────────────────────────────────────────────
// Replaces the Phase 7 stub. Three corrections vs the prior version:
//
//   1. Uses REAL FLAG_KEYS from @repo/shared (kebab.case in the
//      "<scope>.<feature>" form, e.g. "consultation.streaming").
//      The Phase 7 factory generated fake keys like
//      "voice-input-enabled-7" which the evaluator's
//      `isKnownFlagKey` rejects as unknown — the seed produced
//      rows the runtime would never serve.
//
//   2. Uses the NEW FlagCategory enum (`BETA`, not `BETA_FEATURE`).
//      The Prisma schema (Task #49 addendum) refactored
//      `BETA_FEATURE` → `BETA` to match LaunchDarkly + Vercel's
//      naming convention.
//
//   3. `persist` is now a real Prisma upsert keyed on `flagKey`.
//      The prior version was a no-op that returned the in-memory
//      shape unchanged — the seed module then logged
//      "persisted only if schema supports". With Task #49 the
//      schema fully supports persistence, so the seed now
//      actually writes rows.
//
// Reference patterns:
//   - LaunchDarkly's seed deck (key + category + rollout combos).
//   - PostHog's flag-creation API shape.
//   - Datun training-example.factory.ts (same persist style).
// ═══════════════════════════════════════════════════════════════

import { FLAG_KEYS } from '@repo/shared';
import { defineFactory } from '../core';

// ─── Output shape — mirrors Prisma model (Task #49 schema) ─────

interface FeatureFlagOutput {
  readonly id: string;
  readonly flagKey: string;
  readonly name: string;
  readonly description: string;
  readonly category:
    | 'RELEASE'
    | 'EXPERIMENT'
    | 'OPERATIONAL'
    | 'PERMISSION'
    | 'KILL_SWITCH'
    | 'BETA';
  readonly status: 'OFF' | 'ON' | 'ROLLOUT_BUCKET' | 'TARGETED';
  readonly defaultValue: boolean;
  readonly rolloutPercent: number;
  readonly targetingRules: object;
  readonly variants: object;
  readonly enabledClinicIds: readonly string[];
  readonly disabledClinicIds: readonly string[];
  readonly evaluationCount: number;
  readonly lastEvaluatedAt: Date | null;
  readonly staleAt: Date | null;
  readonly createdByUserId: string;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface FeatureFlagTransient {
  /** Override the flag key (used to seed a specific key from the registry). */
  readonly flagKey?: string;
  /** Override the category — useful for seeding kill-switch fixtures. */
  readonly category?: FeatureFlagOutput['category'];
}

// ─── Registry-aligned templates ─────────────────────────────────
// Each template pairs a real FLAG_KEYS value with its display name
// and category. The factory rotates through the templates by
// sequence so a `buildList(N)` call covers a wide surface of the
// registry rather than landing on one key 30 times.

const TEMPLATES: ReadonlyArray<{
  key: string;
  name: string;
  cat: FeatureFlagOutput['category'];
}> = [
  // ── Kill switches (default OFF; status reset by factory) ─────
  { key: FLAG_KEYS.KILLSWITCH_AI_PROVIDERS, name: 'Kill: AI providers', cat: 'KILL_SWITCH' },
  { key: FLAG_KEYS.KILLSWITCH_PAYMENTS, name: 'Kill: Payments', cat: 'KILL_SWITCH' },
  {
    key: FLAG_KEYS.KILLSWITCH_WHATSAPP_OUTBOUND,
    name: 'Kill: WhatsApp outbound',
    cat: 'KILL_SWITCH',
  },
  { key: FLAG_KEYS.KILLSWITCH_MEDIA_UPLOAD, name: 'Kill: Media upload', cat: 'KILL_SWITCH' },
  { key: FLAG_KEYS.KILLSWITCH_SIGNUP, name: 'Kill: Signup', cat: 'KILL_SWITCH' },
  // ── Consultation surface ─────────────────────────────────────
  { key: FLAG_KEYS.CONSULTATION_STREAMING, name: 'Consultation streaming', cat: 'RELEASE' },
  { key: FLAG_KEYS.CONSULTATION_VOICE_INPUT, name: 'Voice input', cat: 'BETA' },
  { key: FLAG_KEYS.CONSULTATION_PHOTO_ANALYSIS_V2, name: 'Photo analysis v2', cat: 'EXPERIMENT' },
  { key: FLAG_KEYS.CONSULTATION_NEW_INTAKE_FLOW, name: 'New intake flow', cat: 'EXPERIMENT' },
  // ── Clinic surface ───────────────────────────────────────────
  { key: FLAG_KEYS.CLINIC_DASHBOARD_V2, name: 'Clinic dashboard v2', cat: 'RELEASE' },
  { key: FLAG_KEYS.CLINIC_APPOINTMENT_REMINDERS, name: 'Appointment reminders', cat: 'RELEASE' },
  { key: FLAG_KEYS.CLINIC_BULK_EXPORT, name: 'Clinic bulk export', cat: 'PERMISSION' },
  { key: FLAG_KEYS.CLINIC_FAMILY_THREAD, name: 'Family thread', cat: 'BETA' },
  // ── AI surface ───────────────────────────────────────────────
  { key: FLAG_KEYS.AI_RAG_ENABLED, name: 'AI RAG enabled', cat: 'EXPERIMENT' },
  { key: FLAG_KEYS.AI_GPT_FALLBACK, name: 'AI GPT fallback', cat: 'OPERATIONAL' },
  { key: FLAG_KEYS.AI_GEMINI_FALLBACK, name: 'AI Gemini fallback', cat: 'OPERATIONAL' },
  { key: FLAG_KEYS.AI_SHADOW_COMPARISON, name: 'AI shadow comparison', cat: 'EXPERIMENT' },
  // ── Locale surface ───────────────────────────────────────────
  { key: FLAG_KEYS.MULTILINGUAL_TAMIL, name: 'Multilingual: Tamil', cat: 'BETA' },
  { key: FLAG_KEYS.MULTILINGUAL_BENGALI, name: 'Multilingual: Bengali', cat: 'BETA' },
  { key: FLAG_KEYS.MULTILINGUAL_MARATHI, name: 'Multilingual: Marathi', cat: 'BETA' },
  { key: FLAG_KEYS.MULTILINGUAL_TELUGU, name: 'Multilingual: Telugu', cat: 'BETA' },
  // ── Experiments ──────────────────────────────────────────────
  { key: FLAG_KEYS.EXPERIMENT_PRICING_V3, name: 'Pricing v3', cat: 'EXPERIMENT' },
  { key: FLAG_KEYS.EXPERIMENT_ONBOARDING_FLOW_V2, name: 'Onboarding flow v2', cat: 'EXPERIMENT' },
  {
    key: FLAG_KEYS.EXPERIMENT_ASSESSMENT_CTA_COLOR,
    name: 'Assessment CTA colour',
    cat: 'EXPERIMENT',
  },
  // ── Admin / operational ──────────────────────────────────────
  { key: FLAG_KEYS.ADMIN_LABELING_QUEUE, name: 'Admin labeling queue', cat: 'PERMISSION' },
  {
    key: FLAG_KEYS.ADMIN_AUTO_HANDOFF_EMERGENCY,
    name: 'Auto-handoff emergency',
    cat: 'OPERATIONAL',
  },
  { key: FLAG_KEYS.ADMIN_BULK_EXPORT, name: 'Admin bulk export', cat: 'PERMISSION' },
  // ── UI polish ────────────────────────────────────────────────
  { key: FLAG_KEYS.UI_ANIMATIONS_V2, name: 'UI animations v2', cat: 'RELEASE' },
  { key: FLAG_KEYS.UI_DARK_MODE, name: 'UI dark mode', cat: 'RELEASE' },
  { key: FLAG_KEYS.UI_SKELETON_LOADERS, name: 'UI skeleton loaders', cat: 'RELEASE' },
];

export const featureFlagFactory = defineFactory<FeatureFlagOutput, FeatureFlagTransient>({
  name: 'featureFlag',
  defaultTransient: {},

  build: ({ sequence, faker, transient }) => {
    // Rotation strategy:
    // - When the caller supplies `transient.flagKey`, honour it exactly.
    // - Otherwise round-robin through TEMPLATES so `buildList(30)` covers
    //   the entire registry (mod-arithmetic on sequence handles N > 30).
    const template = transient.flagKey
      ? TEMPLATES.find((t) => t.key === transient.flagKey)
      : TEMPLATES[(sequence - 1) % TEMPLATES.length];

    if (!template) {
      throw new Error(
        `featureFlagFactory: unknown flag key "${transient.flagKey ?? '<sequence-derived>'}"`,
      );
    }

    // Kill switches deliberately seed in the SAFE state — status OFF
    // for every kill row, regardless of the random distribution below.
    // A seeded kill-switch ON would be a production-hostile fixture
    // (every fresh DB starts with payments dead).
    const isKill = template.cat === 'KILL_SWITCH';

    const status = isKill
      ? 'OFF'
      : faker.helpers.weightedArrayElement([
          { weight: 35, value: 'ON' as const },
          { weight: 25, value: 'ROLLOUT_BUCKET' as const },
          { weight: 20, value: 'OFF' as const },
          { weight: 20, value: 'TARGETED' as const },
        ]);

    return {
      // id is irrelevant for upsert (we key on flagKey) but the
      // factory contract requires a stable value.
      id: `seed-flag-${String(sequence).padStart(8, '0')}`,
      flagKey: template.key,
      name: template.name,
      description: `${template.name} — seeded by Task #49 factory`,
      category: transient.category ?? template.cat,
      status,
      defaultValue: status === 'ON',
      rolloutPercent: status === 'ROLLOUT_BUCKET' ? faker.number.int({ min: 5, max: 95 }) : 0,
      targetingRules:
        status === 'TARGETED'
          ? {
              combinator: 'AND' as const,
              rules: [
                {
                  attribute: 'region' as const,
                  op: 'in' as const,
                  values: ['IN'],
                },
              ],
            }
          : { combinator: 'AND' as const, rules: [] },
      variants: { control: false, treatment: true },
      enabledClinicIds:
        status === 'TARGETED'
          ? Array.from(
              { length: faker.number.int({ min: 1, max: 5 }) },
              () => `clinic-${String(faker.number.int({ min: 1, max: 50 })).padStart(6, '0')}`,
            )
          : [],
      disabledClinicIds: [],
      evaluationCount: faker.number.int({ min: 0, max: 1_000_000 }),
      lastEvaluatedAt:
        faker.helpers.maybe(() => faker.date.recent({ days: 1 }), { probability: 0.9 }) ?? null,
      // 90-day staleAt for non-kill flags so the hygiene cron surfaces them.
      // Kill switches have `null` staleAt — they live forever as infra.
      staleAt: isKill ? null : faker.date.soon({ days: 90 }),
      // Seed-user id; real persistence overrides via the module if needed.
      createdByUserId: 'user-000001',
      archivedAt: isKill
        ? null
        : (faker.helpers.maybe(() => faker.date.past({ years: 1 }), { probability: 0.1 }) ?? null),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
    };
  },

  // ─── Real persist — upsert on flagKey ──────────────────────────
  // The Phase 7 placeholder returned the in-memory object. We now
  // write to Postgres so the seed actually populates the
  // feature_flags table. Upsert keyed on `flagKey` makes the seed
  // idempotent — re-running it touches updatedAt only.
  persist: async (flag, prisma) => {
    return prisma.featureFlag.upsert({
      where: { flagKey: flag.flagKey },
      create: {
        id: flag.id,
        flagKey: flag.flagKey,
        name: flag.name,
        description: flag.description,
        category: flag.category,
        status: flag.status,
        defaultValue: flag.defaultValue,
        rolloutPercent: flag.rolloutPercent,
        targetingRules: flag.targetingRules as object,
        variants: flag.variants as object,
        enabledClinicIds: [...flag.enabledClinicIds],
        disabledClinicIds: [...flag.disabledClinicIds],
        evaluationCount: BigInt(flag.evaluationCount),
        lastEvaluatedAt: flag.lastEvaluatedAt,
        staleAt: flag.staleAt,
        createdByUserId: flag.createdByUserId,
        archivedAt: flag.archivedAt,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
      } as never,
      update: {
        // Idempotent re-seed: refresh derived fields only. Lifecycle
        // fields (status, rolloutPercent, archivedAt) stay sticky so
        // the seed cannot accidentally wipe a hand-tweaked dev row.
        name: flag.name,
        description: flag.description,
        updatedAt: new Date(),
      },
    }) as unknown as FeatureFlagOutput;
  },
});

// Exported so the module can iterate every registry key by name
// when seeding a baseline (`for (const t of FLAG_TEMPLATES)`).
export const FLAG_TEMPLATES = TEMPLATES;
