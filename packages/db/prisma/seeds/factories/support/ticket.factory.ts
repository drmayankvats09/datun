// ═══════════════════════════════════════════════════════════════
// SUPPORT TICKET FACTORY — Patient + clinic complaint tickets
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type Category =
  | 'BILLING'
  | 'TECHNICAL_BUG'
  | 'AI_QUALITY'
  | 'WHATSAPP_DELIVERY'
  | 'APPOINTMENT'
  | 'PRESCRIPTION'
  | 'PAYMENT_REFUND'
  | 'DATA_PRIVACY'
  | 'ACCOUNT_ACCESS'
  | 'GENERAL_INQUIRY'
  | 'FEATURE_REQUEST'
  | 'CLINIC_DISPUTE'
  | 'OTHER';
type Priority = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
type Status =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_USER'
  | 'WAITING_INTERNAL'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

interface TicketOutput {
  readonly id: string;
  readonly ticketNumber: string;
  readonly raisedByUserId: string;
  readonly raisedByRole: 'PATIENT' | 'DOCTOR' | 'CLINIC_OWNER' | 'CLINIC_STAFF';
  readonly clinicId: string | null;
  readonly category: Category;
  readonly subcategory: string | null;
  readonly subject: string;
  readonly description: string;
  readonly priority: Priority;
  readonly status: Status;
  readonly assignedToUserId: string | null;
  readonly slaTargetResolutionAt: Date;
  readonly slaBreached: boolean;
  readonly tags: readonly string[];
  readonly attachmentUrls: readonly string[];
  readonly relatedEntityType: string | null;
  readonly relatedEntityId: string | null;
  readonly aiTriagedCategory: string | null;
  readonly aiTriageConfidence: number | null;
  readonly resolutionNote: string | null;
  readonly customerSatisfactionRating: number | null;
  readonly firstResponseAt: Date | null;
  readonly resolvedAt: Date | null;
  readonly closedAt: Date | null;
  readonly reopenedCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface TicketTransient {
  readonly raisedByUserId: string;
  readonly category?: Category;
}

const SLA_BY_PRIORITY = { P1_CRITICAL: 2, P2_HIGH: 8, P3_MEDIUM: 24, P4_LOW: 72 };

export const supportTicketFactory = defineFactory<TicketOutput, TicketTransient>({
  name: 'user' as 'user',
  defaultTransient: { raisedByUserId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const category =
      transient.category ??
      faker.helpers.weightedArrayElement([
        { weight: 25, value: 'AI_QUALITY' as const },
        { weight: 18, value: 'WHATSAPP_DELIVERY' as const },
        { weight: 15, value: 'APPOINTMENT' as const },
        { weight: 10, value: 'PAYMENT_REFUND' as const },
        { weight: 8, value: 'PRESCRIPTION' as const },
        { weight: 7, value: 'TECHNICAL_BUG' as const },
        { weight: 5, value: 'BILLING' as const },
        { weight: 4, value: 'ACCOUNT_ACCESS' as const },
        { weight: 3, value: 'GENERAL_INQUIRY' as const },
        { weight: 2, value: 'FEATURE_REQUEST' as const },
        { weight: 1, value: 'CLINIC_DISPUTE' as const },
        { weight: 1, value: 'DATA_PRIVACY' as const },
        { weight: 1, value: 'OTHER' as const },
      ]);

    const priority =
      category === 'DATA_PRIVACY' || category === 'TECHNICAL_BUG'
        ? ('P2_HIGH' as const)
        : category === 'PAYMENT_REFUND'
          ? faker.helpers.arrayElement(['P2_HIGH', 'P3_MEDIUM'] as const)
          : faker.helpers.weightedArrayElement([
              { weight: 60, value: 'P3_MEDIUM' as const },
              { weight: 25, value: 'P4_LOW' as const },
              { weight: 12, value: 'P2_HIGH' as const },
              { weight: 3, value: 'P1_CRITICAL' as const },
            ]);

    const status = faker.helpers.weightedArrayElement([
      { weight: 50, value: 'RESOLVED' as const },
      { weight: 18, value: 'CLOSED' as const },
      { weight: 12, value: 'IN_PROGRESS' as const },
      { weight: 8, value: 'OPEN' as const },
      { weight: 6, value: 'WAITING_USER' as const },
      { weight: 4, value: 'WAITING_INTERNAL' as const },
      { weight: 2, value: 'REOPENED' as const },
    ]);

    const createdAt = faker.date.recent({ days: 90 });
    const slaHours = SLA_BY_PRIORITY[priority];
    const slaTargetResolutionAt = new Date(createdAt.getTime() + slaHours * 3600000);

    return {
      id: `tkt-${String(sequence).padStart(10, '0')}`,
      ticketNumber: `DT-${String(sequence).padStart(8, '0')}`,
      raisedByUserId: transient.raisedByUserId,
      raisedByRole: faker.helpers.weightedArrayElement([
        { weight: 70, value: 'PATIENT' as const },
        { weight: 15, value: 'CLINIC_OWNER' as const },
        { weight: 10, value: 'DOCTOR' as const },
        { weight: 5, value: 'CLINIC_STAFF' as const },
      ]),
      clinicId:
        faker.helpers.maybe(() => `clinic-${faker.number.int({ min: 1, max: 50 })}`, {
          probability: 0.4,
        }) ?? null,
      category,
      subcategory: null,
      subject: `${category.replace(/_/g, ' ').toLowerCase()} issue`,
      description: faker.lorem.paragraph(),
      priority,
      status,
      assignedToUserId: status !== 'OPEN' ? `admin-${faker.number.int({ min: 1, max: 5 })}` : null,
      slaTargetResolutionAt,
      slaBreached: status === 'RESOLVED' && faker.number.float() < 0.1,
      tags: [category.toLowerCase()],
      attachmentUrls:
        faker.helpers.maybe(() => [`https://r2.datunai.com/tickets/tkt-${sequence}-1.png`], {
          probability: 0.3,
        }) ?? [],
      relatedEntityType: faker.helpers.maybe(() => 'consultation', { probability: 0.5 }) ?? null,
      relatedEntityId:
        faker.helpers.maybe(() => `consultation-${faker.string.alphanumeric(10)}`, {
          probability: 0.5,
        }) ?? null,
      aiTriagedCategory: category,
      aiTriageConfidence: faker.number.float({ min: 0.7, max: 0.99 }),
      resolutionNote:
        status === 'RESOLVED' || status === 'CLOSED' ? 'Resolved via guided workflow' : null,
      customerSatisfactionRating:
        status === 'RESOLVED'
          ? (faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 }), {
              probability: 0.4,
            }) ?? null)
          : null,
      firstResponseAt:
        status !== 'OPEN' ? faker.date.between({ from: createdAt, to: new Date() }) : null,
      resolvedAt:
        status === 'RESOLVED' || status === 'CLOSED'
          ? faker.date.between({ from: createdAt, to: new Date() })
          : null,
      closedAt: status === 'CLOSED' ? faker.date.recent({ days: 30 }) : null,
      reopenedCount: status === 'REOPENED' ? faker.number.int({ min: 1, max: 3 }) : 0,
      createdAt,
      updatedAt: new Date(),
    };
  },

  persist: async (ticket) => ticket,
});
