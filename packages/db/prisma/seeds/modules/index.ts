// ═══════════════════════════════════════════════════════════════
// MASTER MODULE BARREL — All Wave 4 v2 modules + ALL_MODULES registry
// ═══════════════════════════════════════════════════════════════

import type { ModuleCategory, SeedModule } from './core/module.types';

// Domain barrels
export * from './core';
export * from './runtime';
export * from './reference';
export * from './identity';
export * from './organization';
export * from './people';
export * from './clinical';
export * from './operational';
export * from './compliance';
export * from './ai-ops';
export * from './commerce';
export * from './integrations';
export * from './support';
export * from './marketing';
export * from './analytics';
export * from './time-travel';
export * from './scenarios';
export * from './orchestrator';

// Direct module imports for ALL_MODULES registry
import { saltsCatalogModule } from './reference/salts-catalog.module';
import { conditionsCatalogModule } from './reference/conditions-catalog.module';
import { archetypesCatalogModule } from './reference/archetypes-catalog.module';
import { systemPromptsModule } from './reference/system-prompts.module';

import {
  adminUsersModule,
  ownerUsersModule,
  doctorUsersModule,
  patientUsersModule,
} from './identity/users.module';
import { teamUsersModule } from './identity/team-users.module';

import { clinicsModule } from './organization/clinics.module';
import { doctorsModule } from './organization/doctors.module';
import { teamMembersModule } from './organization/team-members.module';

import { patientsModule } from './people/patients.module';
import { familyThreadsModule } from './people/family-threads.module';
import { consentRecordsModule } from './people/consent-records.module';
import { journeysModule } from './people/journeys.module';

import { consultationsModule } from './clinical/consultations.module';
import { consultationMessagesModule } from './clinical/consultation-messages.module';
import { prescriptionsModule } from './clinical/prescriptions.module';
import {
  consultationPhotosModule,
  voiceTranscriptsModule,
  aiCostEventsModule,
  handoffEventsModule,
  followupConversationsModule,
} from './clinical/auxiliary.module';
import { refillsModule, adverseEventsModule } from './clinical/refills-adverse.module';

import { appointmentsModule } from './operational/appointments.module';
import { whatsAppMessagesModule, notificationsModule } from './operational/messaging.module';
import { paymentsModule, reviewsModule } from './operational/transactions.module';
import { reschedulesModule, cancellationsModule } from './operational/flow-events.module';

import { auditLogsModule } from './compliance/audit-logs.module';
import { jobLogsModule } from './compliance/job-logs.module';
import { dpdpRequestsModule, securityEventsModule } from './compliance/dpdp-security.module';

import { trainingLabelsModule, trainingExamplesModule } from './ai-ops/training-data.module';
import { chaosScenariosModule, aiCostAggregatesModule } from './ai-ops/chaos-aggregates.module';

import {
  subscriptionEventsModule,
  clinicInvoicesModule,
} from './commerce/subscriptions-invoices.module';
import { payoutsModule, leadsModule, leadActivitiesModule } from './commerce/payouts-leads.module';

import {
  webhooksModule,
  tokensModule,
  integrationEventsModule,
} from './integrations/integrations.module';

import { ticketsModule, ticketMessagesModule, kbArticlesModule } from './support/support.module';

import {
  campaignsModule,
  utmAttributionsModule,
  referralEventsModule,
} from './marketing/marketing.module';

import { dailyAggregatesModule } from './analytics/daily-aggregates.module';
import {
  cohortTablesModule,
  featureFlagsModule,
  experimentAssignmentsModule,
} from './analytics/flags-experiments.module';

import { historicalDataModule } from './time-travel/historical-data.module';
import { retentionCohortsModule } from './time-travel/retention-cohorts.module';

import { demoScenariosModule } from './scenarios/demo-scenarios.module';
import {
  edgeCaseScenariosModule,
  chaosScenarioConfigsModule,
} from './scenarios/edge-chaos-scenarios.module';

/** ALL_MODULES — single source of truth for orchestrator */
export const ALL_MODULES: readonly SeedModule[] = [
  // Reference
  saltsCatalogModule,
  conditionsCatalogModule,
  archetypesCatalogModule,
  systemPromptsModule,

  // Identity
  adminUsersModule,
  ownerUsersModule,
  doctorUsersModule,
  patientUsersModule,
  teamUsersModule,

  // Organization
  clinicsModule,
  doctorsModule,
  teamMembersModule,

  // People
  patientsModule,
  familyThreadsModule,
  consentRecordsModule,
  journeysModule,

  // Clinical
  consultationsModule,
  consultationMessagesModule,
  prescriptionsModule,
  consultationPhotosModule,
  voiceTranscriptsModule,
  aiCostEventsModule,
  handoffEventsModule,
  followupConversationsModule,
  refillsModule,
  adverseEventsModule,

  // Operational
  appointmentsModule,
  whatsAppMessagesModule,
  notificationsModule,
  paymentsModule,
  reviewsModule,
  reschedulesModule,
  cancellationsModule,

  // Compliance
  auditLogsModule,
  jobLogsModule,
  dpdpRequestsModule,
  securityEventsModule,

  // AI-Ops
  trainingLabelsModule,
  trainingExamplesModule,
  chaosScenariosModule,
  aiCostAggregatesModule,

  // Commerce
  subscriptionEventsModule,
  clinicInvoicesModule,
  payoutsModule,
  leadsModule,
  leadActivitiesModule,

  // Integrations
  webhooksModule,
  tokensModule,
  integrationEventsModule,

  // Support
  ticketsModule,
  ticketMessagesModule,
  kbArticlesModule,

  // Marketing
  campaignsModule,
  utmAttributionsModule,
  referralEventsModule,

  // Analytics
  dailyAggregatesModule,
  cohortTablesModule,
  featureFlagsModule,
  experimentAssignmentsModule,

  // Time-Travel
  historicalDataModule,
  retentionCohortsModule,

  // Scenarios
  demoScenariosModule,
  edgeCaseScenariosModule,
  chaosScenarioConfigsModule,
];

/** Filter modules by category */
export function getModulesByCategory(category: ModuleCategory): readonly SeedModule[] {
  return ALL_MODULES.filter((m) => m.category === category);
}

/** Quick lookup map */
export const MODULE_BY_NAME: ReadonlyMap<string, SeedModule> = new Map(
  ALL_MODULES.map((m) => [m.name, m]),
);

/** Module count by category */
export const MODULE_COUNT_BY_CATEGORY: Readonly<Record<ModuleCategory, number>> =
  ALL_MODULES.reduce(
    (acc, m) => ({ ...acc, [m.category]: (acc[m.category] ?? 0) + 1 }),
    {} as unknown as Record<ModuleCategory, number>,
  );

export const TOTAL_MODULE_COUNT = ALL_MODULES.length;
