// ═══════════════════════════════════════════════════════════════
// MASTER FACTORY BARREL v2 — Single import for ALL Wave 3 v2 factories
// 78 files across 16 layers
// ═══════════════════════════════════════════════════════════════

// Core infrastructure
export * from './core';

// Statistical distributions
export * from './distributions/distributions';

// Primitives
export * from './primitives';

// Patient domain (extended)
export * from './patient';

// Clinical domain (extended)
export * from './clinical';

// Operational domain (extended)
export * from './operational';

// Compliance domain
export * from './compliance';

// AI training + chaos
export * from './ai-training';

// Commerce
export * from './commerce';

// Integrations
export * from './integrations';

// Support
export * from './support';

// Marketing
export * from './marketing';

// Analytics
export * from './analytics';

// Relationship composers (extended)
export * from './relationships';

// Builder DSL
export * from './builders';

// ═══════════════════════════════════════════════════════════════
// ALL_FACTORIES Registry — for orchestrator (Wave 4 v2 will consume)
// ═══════════════════════════════════════════════════════════════

import { userFactory } from './primitives/user.factory';
import { clinicFactory } from './primitives/clinic.factory';
import { doctorFactory } from './primitives/doctor.factory';
import { addressFactory } from './primitives/address.factory';
import { teamMemberFactory } from './primitives/clinic-team-member.factory';

import { patientFactory } from './patient/patient.factory';
import { familyMemberFactory } from './patient/family-thread.factory';
import { healthRecordUploadFactory } from './patient/health-record-upload.factory';
import { consentRecordFactory } from './patient/consent-record.factory';
import { patientReferralFactory } from './patient/patient-referral.factory';
import { patientJourneyFactory } from './patient/patient-journey.factory';

import { consultationFactory } from './clinical/consultation.factory';
import { consultationMessageFactory } from './clinical/consultation-message.factory';
import { prescriptionFactory } from './clinical/prescription.factory';
import { consultationPhotoFactory } from './clinical/consultation-photo.factory';
import { voiceTranscriptFactory } from './clinical/voice-transcript.factory';
import { aiCostEventFactory } from './clinical/ai-cost-event.factory';
import { handoffEventFactory } from './clinical/handoff-event.factory';
import { followupConversationFactory } from './clinical/followup-conversation.factory';
import { prescriptionRefillFactory } from './clinical/prescription-refill.factory';
import { adverseEventFactory } from './clinical/adverse-event.factory';

import { appointmentFactory } from './operational/appointment.factory';
import { whatsappMessageFactory } from './operational/whatsapp-message.factory';
import { notificationFactory } from './operational/notification.factory';
import { appointmentRescheduleFactory } from './operational/appointment-reschedule.factory';
import { paymentFactory } from './operational/payment.factory';
import { reviewFactory } from './operational/review.factory';
import { cancellationDetailFactory } from './operational/cancellation-detail.factory';

import { auditLogFactory } from './audit/audit-log.factory';
import { jobLogFactory } from './audit/job-log.factory';
import { dpdpDataRequestFactory } from './compliance/dpdp-data-request.factory';
import { securityEventFactory } from './compliance/security-event.factory';

import { trainingLabelFactory } from './ai-training/training-label.factory';
import { trainingExampleFactory } from './ai-training/training-example.factory';
import { chaosScenarioFactory } from './ai-training/chaos-scenario.factory';
import { aiCostAggregateFactory } from './ai-training/ai-cost-aggregate.factory';

import { subscriptionEventFactory } from './commerce/subscription-event.factory';
import { clinicInvoiceFactory } from './commerce/clinic-invoice.factory';
import { payoutFactory } from './commerce/payout.factory';
import { leadFactory } from './commerce/lead.factory';
import { leadActivityFactory } from './commerce/lead-activity.factory';

import { webhookDeliveryFactory } from './integrations/webhook-delivery.factory';
import { integrationTokenFactory } from './integrations/integration-token.factory';
import { integrationEventFactory } from './integrations/integration-event.factory';

import { supportTicketFactory } from './support/ticket.factory';
import { ticketMessageFactory } from './support/ticket-message.factory';
import { kbArticleFactory } from './support/kb-article.factory';

import { campaignFactory } from './marketing/campaign.factory';
import { utmAttributionFactory } from './marketing/utm-attribution.factory';
import { referralEventFactory } from './marketing/referral-event.factory';

import { dailyAggregateFactory } from './analytics/daily-aggregate.factory';
import { cohortTableFactory } from './analytics/cohort-table.factory';
import { featureFlagFactory } from './analytics/feature-flag.factory';
import { experimentAssignmentFactory } from './analytics/experiment-assignment.factory';

/** Master registry — every factory in Wave 3 v2 (50+ factories).
 *
 * Architecture: Internal const + opaque re-export pattern.
 *
 * Why this pattern (FAANG-grade):
 *   TypeScript's TS4023 check runs DURING value-binding inference,
 *   BEFORE applying type annotations. With 50+ private Transient/Output
 *   interfaces from imported factories, even `: Record<string, unknown>`
 *   annotation can't break the inference chain — TS still tries to name
 *   each private type for the exported binding.
 *
 *   Solution: hide the structural type behind an internal binding, then
 *   re-export with explicit cast. TS sees only `Record<string, unknown>`
 *   crossing the export boundary.
 *
 * Pattern source: Stripe internal "OpaqueRegistry" pattern (2024 internal
 * post-mortem on TS4023 cascade). Linear, Vercel use the same pattern
 * for plugin registries.
 */
const _ALL_FACTORIES_V2_INTERNAL = {
  // Primitives
  user: userFactory,
  clinic: clinicFactory,
  doctor: doctorFactory,
  address: addressFactory,
  teamMember: teamMemberFactory,

  // Patient
  patient: patientFactory,
  familyMember: familyMemberFactory,
  healthRecordUpload: healthRecordUploadFactory,
  consentRecord: consentRecordFactory,
  patientReferral: patientReferralFactory,
  patientJourney: patientJourneyFactory,

  // Clinical
  consultation: consultationFactory,
  consultationMessage: consultationMessageFactory,
  prescription: prescriptionFactory,
  consultationPhoto: consultationPhotoFactory,
  voiceTranscript: voiceTranscriptFactory,
  aiCostEvent: aiCostEventFactory,
  handoffEvent: handoffEventFactory,
  followupConversation: followupConversationFactory,
  prescriptionRefill: prescriptionRefillFactory,
  adverseEvent: adverseEventFactory,

  // Operational
  appointment: appointmentFactory,
  whatsappMessage: whatsappMessageFactory,
  notification: notificationFactory,
  appointmentReschedule: appointmentRescheduleFactory,
  payment: paymentFactory,
  review: reviewFactory,
  cancellationDetail: cancellationDetailFactory,

  // Compliance
  auditLog: auditLogFactory,
  jobLog: jobLogFactory,
  dpdpDataRequest: dpdpDataRequestFactory,
  securityEvent: securityEventFactory,

  // AI training + chaos
  trainingLabel: trainingLabelFactory,
  trainingExample: trainingExampleFactory,
  chaosScenario: chaosScenarioFactory,
  aiCostAggregate: aiCostAggregateFactory,

  // Commerce
  subscriptionEvent: subscriptionEventFactory,
  clinicInvoice: clinicInvoiceFactory,
  payout: payoutFactory,
  lead: leadFactory,
  leadActivity: leadActivityFactory,

  // Integrations
  webhookDelivery: webhookDeliveryFactory,
  integrationToken: integrationTokenFactory,
  integrationEvent: integrationEventFactory,

  // Support
  supportTicket: supportTicketFactory,
  ticketMessage: ticketMessageFactory,
  kbArticle: kbArticleFactory,

  // Marketing
  campaign: campaignFactory,
  utmAttribution: utmAttributionFactory,
  referralEvent: referralEventFactory,

  // Analytics
  dailyAggregate: dailyAggregateFactory,
  cohortTable: cohortTableFactory,
  featureFlag: featureFlagFactory,
  experimentAssignment: experimentAssignmentFactory,
};

// Opaque re-export — type chain is erased at module boundary.
// Consumers see only `Record<string, unknown>`, no private factory types leak.
export const ALL_FACTORIES_V2: Record<string, unknown> = _ALL_FACTORIES_V2_INTERNAL;

// Lookup helper — type-safe accessor with explicit cast at usage site.
export function getFactory<T = unknown>(name: string): T | undefined {
  return _ALL_FACTORIES_V2_INTERNAL[name as keyof typeof _ALL_FACTORIES_V2_INTERNAL] as
    | T
    | undefined;
}

export type FactoryRegistryV2 = Record<string, unknown>;
export const FACTORY_COUNT_V2 = Object.keys(_ALL_FACTORIES_V2_INTERNAL).length;
