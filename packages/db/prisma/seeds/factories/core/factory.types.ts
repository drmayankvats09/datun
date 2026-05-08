// ═══════════════════════════════════════════════════════════════
// FACTORY TYPES — Shared contracts (B-2 v2 — research-backed)
//
// Pattern foundations:
//   - Fishery (thoughtbot)        — build/buildList/create/createList API
//   - Interface Forge             — deterministic seeds + sequence-derived IDs
//   - Stripe dj-stripe            — override-first parameter ordering
//   - Faker.js v9                 — multi-locale fallback chain
//
// Sources verified:
//   - https://github.com/thoughtbot/fishery
//   - https://fakerjs.dev/guide/localization.html
//   - https://github.com/microsoft/TypeScript/issues/15300
//
// FAANG-grade decisions:
//   - TransientParams = `object` (not `Record<string, unknown>`)
//     Reason: Record<string, unknown> rejects interfaces due to TS issue
//     #15300 (open since 2017). `object` accepts ALL non-primitive
//     types, including all interface declarations.
//   - FactoryName = `string` (not narrow union)
//     Reason: 60+ factories in this codebase; hardcoded union becomes
//     a maintenance burden. String matches Prisma's own Model name approach.
//   - Strict readonly on contract surfaces — prevents accidental mutation
//     during build chain (Stripe convention).
// ═══════════════════════════════════════════════════════════════

import type { Faker } from '@faker-js/faker';
import type { PrismaClient } from '@prisma/client';

// ───────────────────────────────────────────────────────────────
// FOUNDATIONAL TYPES
// ───────────────────────────────────────────────────────────────

/**
 * Sequence counter — auto-increments for deterministic IDs across factory calls.
 * Pattern: Fishery sequences (1-indexed, monotonic).
 */
export type SequenceFn = () => number;

/**
 * Faker instance scoped to factory call — uses deterministic seed.
 * Locale chain: en_IN → en → base (per Faker.js v9 docs).
 */
export type FakerInstance = Faker;

/**
 * DeepPartial — recursive optional. Used for override application.
 *
 * `?: T extends Date | RegExp | (...args) => unknown` exclusions ensure
 * built-in types aren't recursively partialized (common Fishery bug).
 */
export type DeepPartial<T> = T extends Date | RegExp | ((...args: unknown[]) => unknown)
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends Array<infer U>
      ? Array<DeepPartial<U>>
      : T extends object
        ? { [P in keyof T]?: DeepPartial<T[P]> }
        : T;

// ───────────────────────────────────────────────────────────────
// TRANSIENT PARAMETERS — Build-time inputs that aren't in output
// ───────────────────────────────────────────────────────────────

/**
 * Base type for transient parameters — passed to factory but NOT in output.
 *
 * **Why `object` instead of `Record<string, unknown>`:**
 *
 * `Record<string, unknown>` requires an explicit index signature, which
 * regular interfaces don't have (TypeScript issue #15300). This caused
 * 33 errors across factory files like:
 *
 *     interface PatientTransient { homeClinicId?: string; }
 *     ↓
 *     "Index signature for type 'string' is missing in type 'PatientTransient'"
 *
 * `object` accepts any non-primitive type (interface, type alias, class,
 * Record, etc.) without requiring an index signature. This is the
 * idiomatic Fishery pattern (their `I` generic has no constraint).
 */
export type TransientParams = object;

// ───────────────────────────────────────────────────────────────
// FACTORY BUILD CONTEXT — DI bag passed to every factory
// ───────────────────────────────────────────────────────────────

/**
 * Factory build context — what every factory's `build` function receives.
 * Contains deterministic seed material + transient params.
 */
export interface FactoryBuildContext<TTransient extends TransientParams = TransientParams> {
  /** Sequence number for THIS factory call (1-indexed, monotonic) */
  readonly sequence: number;
  /** Faker instance pre-seeded for THIS call (deterministic) */
  readonly faker: FakerInstance;
  /** Transient params merged with defaults */
  readonly transient: TTransient;
  /** Deterministic seed — derived from master seed + factory name + sequence */
  readonly seed: number;
}

// ───────────────────────────────────────────────────────────────
// LIFECYCLE HOOKS
// ───────────────────────────────────────────────────────────────

/**
 * AfterBuild hook — runs AFTER object built but BEFORE returned.
 * Use for post-processing that should happen in both build() and create() paths.
 * MUST be synchronous — async work belongs in afterCreate.
 */
export type AfterBuildHook<TOutput> = (output: TOutput, context: FactoryBuildContext) => TOutput;

/**
 * AfterCreate hook — runs AFTER object persisted to DB.
 * Use for side effects: invalidating caches, triggering events, creating related rows.
 */
export type AfterCreateHook<TOutput> = (
  output: TOutput,
  context: FactoryBuildContext,
  prisma: PrismaClient,
) => Promise<void>;

// ───────────────────────────────────────────────────────────────
// FACTORY DEFINITION — Public contract
// ───────────────────────────────────────────────────────────────

/**
 * Factory definition — what each factory file exports.
 *
 * @template TOutput     The shape of the built/persisted object.
 * @template TTransient  Build-time inputs not present in output.
 */
export interface FactoryDefinition<TOutput, TTransient extends TransientParams = TransientParams> {
  /** Factory name — used for seed derivation + telemetry. */
  readonly name: FactoryName;

  /** Build object in-memory (no DB write). */
  build: (overrides?: DeepPartial<TOutput>, transient?: Partial<TTransient>) => TOutput;

  /** Build N objects. */
  buildList: (
    count: number,
    overrides?: DeepPartial<TOutput>,
    transient?: Partial<TTransient>,
  ) => readonly TOutput[];

  /** Create object AND persist to DB. */
  create: (
    prisma: PrismaClient,
    overrides?: DeepPartial<TOutput>,
    transient?: Partial<TTransient>,
  ) => Promise<TOutput>;

  /** Create N objects AND persist. */
  createList: (
    prisma: PrismaClient,
    count: number,
    overrides?: DeepPartial<TOutput>,
    transient?: Partial<TTransient>,
  ) => Promise<readonly TOutput[]>;
}

// ───────────────────────────────────────────────────────────────
// FACTORY NAME — Identifier for sequence + telemetry
// ───────────────────────────────────────────────────────────────

/**
 * Factory name identifier.
 *
 * Originally typed as a narrow string union covering 14 factories. Expanded
 * to `string` in B-2 because:
 *   1. The codebase has 60+ factories (counted: 47 in factories/, plus
 *      composers + builders).
 *   2. Adding new factories required updating the union — fragile coupling.
 *   3. Prisma itself uses `string` for ModelName at the runtime API surface.
 *   4. Telemetry only needs string equality, not type-level enumeration.
 *
 * Naming convention (enforced via lint, not type system):
 *   - kebab-case
 *   - singular noun (e.g., 'patient', not 'patients')
 *   - matches the Prisma model name where applicable
 */
export type FactoryName = string;

/**
 * Canonical factory names — for IDE autocomplete and runtime registry lookup.
 * Adding a name here is OPTIONAL but recommended for discoverability.
 */
export const KNOWN_FACTORY_NAMES = {
  // Primitives
  USER: 'user',
  CLINIC: 'clinic',
  DOCTOR: 'doctor',
  ADDRESS: 'address',
  CONTACT_INFO: 'contact-info',
  CLINIC_TEAM_MEMBER: 'clinic-team-member',

  // Patient
  PATIENT: 'patient',
  CONSENT_RECORD: 'consent-record',
  FAMILY_THREAD: 'family-thread',
  HEALTH_RECORD_UPLOAD: 'health-record-upload',
  PATIENT_JOURNEY: 'patient-journey',
  PATIENT_REFERRAL: 'patient-referral',

  // Clinical
  CONSULTATION: 'consultation',
  CONSULTATION_MESSAGE: 'consultation-message',
  CONSULTATION_PHOTO: 'consultation-photo',
  PRESCRIPTION: 'prescription',
  PRESCRIPTION_REFILL: 'prescription-refill',
  HANDOFF_EVENT: 'handoff-event',
  FOLLOWUP_CONVERSATION: 'followup-conversation',
  VOICE_TRANSCRIPT: 'voice-transcript',
  ADVERSE_EVENT: 'adverse-event',
  AI_COST_EVENT: 'ai-cost-event',

  // Operational
  APPOINTMENT: 'appointment',
  APPOINTMENT_RESCHEDULE: 'appointment-reschedule',
  CANCELLATION_DETAIL: 'cancellation-detail',
  PAYMENT: 'payment',
  REVIEW: 'review',
  NOTIFICATION: 'notification',
  WHATSAPP_MESSAGE: 'whatsapp-message',

  // Commerce
  LEAD: 'lead',
  LEAD_ACTIVITY: 'lead-activity',
  PAYOUT: 'payout',
  SUBSCRIPTION_EVENT: 'subscription-event',
  CLINIC_INVOICE: 'clinic-invoice',

  // Marketing
  CAMPAIGN: 'campaign',
  REFERRAL_EVENT: 'referral-event',
  UTM_ATTRIBUTION: 'utm-attribution',

  // Compliance
  DPDP_DATA_REQUEST: 'dpdp-data-request',
  SECURITY_EVENT: 'security-event',
  AUDIT_LOG: 'audit-log',

  // Integrations
  INTEGRATION_EVENT: 'integration-event',
  INTEGRATION_TOKEN: 'integration-token',
  WEBHOOK_DELIVERY: 'webhook-delivery',

  // Audit / observability
  JOB_LOG: 'job-log',

  // Support
  KB_ARTICLE: 'kb-article',
  TICKET: 'ticket',
  TICKET_MESSAGE: 'ticket-message',

  // Training (Wave 6+)
  TRAINING_LABEL: 'training-label',
  TRAINING_EXAMPLE: 'training-example',
} as const;

export type KnownFactoryName = (typeof KNOWN_FACTORY_NAMES)[keyof typeof KNOWN_FACTORY_NAMES];
