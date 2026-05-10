// ═══════════════════════════════════════════════════════════════
// MODULE REGISTRY v2 — Cross-module data sharing
// Adds: required-key strict mode, type-safe key constants, snapshot
// ═══════════════════════════════════════════════════════════════

import type { ModuleRegistry } from './module.types';

class InMemoryRegistry implements ModuleRegistry {
  private store = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  getRequired<T>(key: string): T {
    if (!this.store.has(key)) {
      throw new Error(
        `[registry] Required key missing: ${key}. Available: ${this.keys().join(', ')}`,
      );
    }
    return this.store.get(key) as T;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  keys(): readonly string[] {
    return Array.from(this.store.keys());
  }

  reset(): void {
    this.store.clear();
  }

  snapshot(): Readonly<Record<string, unknown>> {
    return Object.fromEntries(this.store);
  }

  loadSnapshot(snapshot: Record<string, unknown>): void {
    this.store.clear();
    for (const [k, v] of Object.entries(snapshot)) this.store.set(k, v);
  }
}

export function createModuleRegistry(): ModuleRegistry & {
  loadSnapshot(s: Record<string, unknown>): void;
} {
  return new InMemoryRegistry();
}

/** Registry keys — type-safe constants */
export const REGISTRY_KEYS = {
  // Identity
  ADMIN_USER_IDS: 'identity.admin.userIds',
  OWNER_USER_IDS: 'identity.owner.userIds',
  DOCTOR_USER_IDS: 'identity.doctor.userIds',
  PATIENT_USER_IDS: 'identity.patient.userIds',
  TEAM_USER_IDS: 'identity.team.userIds',

  // Organization
  CLINIC_IDS: 'organization.clinic.ids',
  CLINIC_RECORDS: 'organization.clinic.records',
  DOCTOR_IDS: 'organization.doctor.ids',
  DOCTOR_RECORDS: 'organization.doctor.records',
  TEAM_MEMBER_IDS: 'organization.team.ids',
  CLINIC_SERVICE_IDS: 'organization.service.ids',

  // People
  PATIENT_IDS: 'people.patient.ids',
  PATIENT_RECORDS: 'people.patient.records',
  PATIENT_TO_CLINIC: 'people.patient.clinicMap',
  FAMILY_THREAD_IDS: 'people.family.threadIds',
  CONSENT_RECORD_IDS: 'people.consent.ids',
  HEALTH_UPLOAD_IDS: 'people.uploads.ids',
  REFERRAL_IDS: 'people.referrals.ids',
  JOURNEY_IDS: 'people.journey.ids',

  // Clinical
  CONSULTATION_IDS: 'clinical.consultation.ids',
  CONSULTATION_RECORDS: 'clinical.consultation.records',
  CONSULTATION_TO_PATIENT: 'clinical.consultation.patientMap',
  MESSAGE_IDS: 'clinical.message.ids',
  PRESCRIPTION_IDS: 'clinical.prescription.ids',
  PHOTO_IDS: 'clinical.photo.ids',
  VOICE_TRANSCRIPT_IDS: 'clinical.voice.ids',
  HANDOFF_EVENT_IDS: 'clinical.handoff.ids',
  FOLLOWUP_CONVERSATION_IDS: 'clinical.followup.ids',
  REFILL_IDS: 'clinical.refill.ids',
  ADVERSE_EVENT_IDS: 'clinical.adverse.ids',
  AI_COST_EVENT_IDS: 'clinical.aicost.ids',

  // Operational
  APPOINTMENT_IDS: 'operational.appointment.ids',
  WHATSAPP_IDS: 'operational.whatsapp.ids',
  NOTIFICATION_IDS: 'operational.notification.ids',
  PAYMENT_IDS: 'operational.payment.ids',
  REVIEW_IDS: 'operational.review.ids',
  RESCHEDULE_IDS: 'operational.reschedule.ids',
  CANCELLATION_IDS: 'operational.cancellation.ids',

  // Compliance
  AUDIT_LOG_IDS: 'compliance.audit.ids',
  JOB_LOG_IDS: 'compliance.job.ids',
  DPDP_REQUEST_IDS: 'compliance.dpdp.ids',
  SECURITY_EVENT_IDS: 'compliance.security.ids',

  // AI-Ops
  TRAINING_LABEL_IDS: 'ai-ops.label.ids',
  TRAINING_EXAMPLE_IDS: 'ai-ops.example.ids',
  CHAOS_SCENARIO_IDS: 'ai-ops.chaos.ids',
  AI_COST_AGGREGATE_IDS: 'ai-ops.aiagg.ids',

  // Commerce
  SUBSCRIPTION_EVENT_IDS: 'commerce.subevt.ids',
  INVOICE_IDS: 'commerce.invoice.ids',
  PAYOUT_IDS: 'commerce.payout.ids',
  LEAD_IDS: 'commerce.lead.ids',
  LEAD_ACTIVITY_IDS: 'commerce.activity.ids',

  // Integrations
  WEBHOOK_IDS: 'integrations.webhook.ids',
  TOKEN_IDS: 'integrations.token.ids',
  INTEGRATION_EVENT_IDS: 'integrations.event.ids',

  // Support
  TICKET_IDS: 'support.ticket.ids',
  TICKET_MESSAGE_IDS: 'support.message.ids',
  KB_ARTICLE_IDS: 'support.kb.ids',

  // Marketing
  CAMPAIGN_IDS: 'marketing.campaign.ids',
  UTM_IDS: 'marketing.utm.ids',
  REFERRAL_EVENT_IDS: 'marketing.refevt.ids',

  // Analytics
  DAILY_AGGREGATE_IDS: 'analytics.daily.ids',
  COHORT_IDS: 'analytics.cohort.ids',
  FLAG_IDS: 'analytics.flag.ids',
  EXPERIMENT_IDS: 'analytics.experiment.ids',
} as const;

export type RegistryKey = (typeof REGISTRY_KEYS)[keyof typeof REGISTRY_KEYS];

// ═══════════════════════════════════════════════════════════════
// REGISTRY REHYDRATION HELPER
//
// When a module passes idempotency check (data already in DB), the
// saga skips its run() — meaning registry keys are not populated.
// Downstream modules then crash on getRequired().
//
// Pattern: try registry first, fall back to DB query, cache result.
// Used by: clinics, doctors, patients, team-members, family-threads,
//          consent-records, journeys (anything depending on idempotent modules).
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

export interface RehydrationContext {
  readonly registry: { get: <T>(k: string) => T | undefined; set: <T>(k: string, v: T) => void };
  readonly prisma: PrismaClient;
}

/**
 * Get a registry value, or fetch from DB if missing (and cache for next caller).
 *
 * @example
 * const clinicIds = await getOrFetch(ctx, REGISTRY_KEYS.CLINIC_IDS, async () =>
 *   (await ctx.prisma.clinic.findMany({ select: { id: true } })).map((c) => c.id)
 * );
 */
export async function getOrFetch<T>(
  ctx: RehydrationContext,
  key: string,
  fallback: () => Promise<T>,
): Promise<T> {
  const cached = ctx.registry.get<T>(key);
  if (cached !== undefined && cached !== null) {
    if (Array.isArray(cached) && cached.length === 0) {
      // Empty array — try DB fallback
      const fetched = await fallback();
      ctx.registry.set(key, fetched);
      return fetched;
    }
    return cached;
  }
  const fetched = await fallback();
  ctx.registry.set(key, fetched);
  return fetched;
}
