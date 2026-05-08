// ═══════════════════════════════════════════════════════════════
// CLINIC INVOICE FACTORY — Monthly subscription invoices to clinics
// GST-compliant Indian invoicing
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface ClinicInvoiceOutput {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly clinicId: string;
  readonly subscriptionId: string;
  readonly billingPeriodStart: Date;
  readonly billingPeriodEnd: Date;
  readonly subtotalInr: number;
  readonly cgstInr: number;
  readonly sgstInr: number;
  readonly igstInr: number;
  readonly discountInr: number;
  readonly totalInr: number;
  readonly currency: 'INR';
  readonly status:
    | 'DRAFT'
    | 'SENT'
    | 'PAID'
    | 'OVERDUE'
    | 'PARTIALLY_PAID'
    | 'VOID'
    | 'WRITTEN_OFF';
  readonly dueDate: Date;
  readonly issuedDate: Date;
  readonly paidDate: Date | null;
  readonly paymentLinkUrl: string | null;
  readonly pdfUrl: string;
  readonly lineItems: object;
  readonly billingAddress: object;
  readonly gstinClinic: string | null;
  readonly gstinDatun: string;
  readonly hsnCode: string;
  readonly placeOfSupply: string;
  readonly remindersSent: number;
  readonly lastReminderAt: Date | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface ClinicInvoiceTransient {
  readonly clinicId: string;
  readonly subscriptionId: string;
  readonly amountInr: number;
  readonly billingPeriodStart: Date;
}

// Deterministic fixture for module-load-time defaultTransient (snapshot determinism)
const FIXTURE_BILLING_PERIOD_START = new Date('2026-01-15T00:00:00.000Z');

export const clinicInvoiceFactory = defineFactory<ClinicInvoiceOutput, ClinicInvoiceTransient>({
  name: 'clinic' as 'clinic',
  defaultTransient: {
    clinicId: 'unknown',
    subscriptionId: 'unknown',
    amountInr: 999,
    billingPeriodStart: FIXTURE_BILLING_PERIOD_START,
  },

  build: ({ sequence, faker, transient }) => {
    const subtotalInr = transient.amountInr;
    const gstRate = 0.18;
    const gstAmount = Math.round(subtotalInr * gstRate);
    const totalInr = subtotalInr + gstAmount;

    const billingPeriodEnd = new Date(
      transient.billingPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const issuedDate = billingPeriodEnd;
    const dueDate = new Date(issuedDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const status = faker.helpers.weightedArrayElement([
      { weight: 75, value: 'PAID' as const },
      { weight: 10, value: 'SENT' as const },
      { weight: 8, value: 'OVERDUE' as const },
      { weight: 3, value: 'PARTIALLY_PAID' as const },
      { weight: 2, value: 'DRAFT' as const },
      { weight: 1, value: 'VOID' as const },
      { weight: 1, value: 'WRITTEN_OFF' as const },
    ]);

    return {
      id: `inv-${String(sequence).padStart(10, '0')}`,
      invoiceNumber: `DTN/INV/${new Date().getFullYear()}/${String(sequence).padStart(6, '0')}`,
      clinicId: transient.clinicId,
      subscriptionId: transient.subscriptionId,
      billingPeriodStart: transient.billingPeriodStart,
      billingPeriodEnd,
      subtotalInr,
      cgstInr: Math.round(subtotalInr * 0.09),
      sgstInr: Math.round(subtotalInr * 0.09),
      igstInr: 0,
      discountInr: 0,
      totalInr,
      currency: 'INR' as const,
      status,
      dueDate,
      issuedDate,
      paidDate: status === 'PAID' ? faker.date.between({ from: issuedDate, to: dueDate }) : null,
      paymentLinkUrl:
        status !== 'PAID' && status !== 'VOID' ? `https://pay.datunai.com/inv/${sequence}` : null,
      pdfUrl: `https://r2.datunai.com/invoices/inv-${sequence}.pdf`,
      lineItems: [
        {
          description: 'Datun Subscription - Monthly',
          quantity: 1,
          rateInr: subtotalInr,
          amountInr: subtotalInr,
        },
      ],
      billingAddress: {
        line1: faker.location.streetAddress(),
        city: faker.location.city(),
        state: 'Delhi',
        pincode: faker.location.zipCode('######'),
        country: 'IN',
      },
      gstinClinic:
        faker.helpers.maybe(() => `${faker.string.numeric(2)}AAAAA${faker.string.numeric(4)}A1Z5`, {
          probability: 0.6,
        }) ?? null,
      gstinDatun: '07AAGCD1234L1Z9',
      hsnCode: '998314',
      placeOfSupply: 'Delhi',
      remindersSent: status === 'OVERDUE' ? faker.number.int({ min: 1, max: 5 }) : 0,
      lastReminderAt: status === 'OVERDUE' ? faker.date.recent({ days: 7 }) : null,
      notes: null,
      createdAt: issuedDate,
      updatedAt: new Date(),
    };
  },

  persist: async (invoice) => invoice,
});
