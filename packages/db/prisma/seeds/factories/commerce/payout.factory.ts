// ═══════════════════════════════════════════════════════════════
// PAYOUT FACTORY — Datun → Clinic revenue share payouts
// (For future referral revenue model — 2031 ready)
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface PayoutOutput {
  readonly id: string;
  readonly clinicId: string;
  readonly payoutPeriodStart: Date;
  readonly payoutPeriodEnd: Date;
  readonly grossRevenueInr: number;
  readonly platformFeeInr: number;
  readonly tdsInr: number;
  readonly netPayableInr: number;
  readonly status: 'PENDING' | 'INITIATED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'ON_HOLD';
  readonly transferMethod: 'NEFT' | 'IMPS' | 'RTGS' | 'UPI';
  readonly bankAccountLast4: string;
  readonly bankIfsc: string;
  readonly utrNumber: string | null;
  readonly initiatedAt: Date;
  readonly paidAt: Date | null;
  readonly failedAt: Date | null;
  readonly failureReason: string | null;
  readonly settlementCount: number;
  readonly invoiceUrl: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface PayoutTransient {
  readonly clinicId: string;
  readonly periodStart: Date;
}

// Deterministic fixture for module-load-time defaultTransient (snapshot determinism)
const FIXTURE_PERIOD_START = new Date('2026-01-15T00:00:00.000Z');

export const payoutFactory = defineFactory<PayoutOutput, PayoutTransient>({
  name: 'clinic' as 'clinic',
  defaultTransient: { clinicId: 'unknown', periodStart: FIXTURE_PERIOD_START },

  build: ({ sequence, faker, transient }) => {
    const grossRevenueInr = faker.number.int({ min: 5000, max: 200000 });
    const platformFeePercent = 0.15;
    const platformFeeInr = Math.round(grossRevenueInr * platformFeePercent);
    const tdsInr = Math.round((grossRevenueInr - platformFeeInr) * 0.1);
    const netPayableInr = grossRevenueInr - platformFeeInr - tdsInr;

    const status = faker.helpers.weightedArrayElement([
      { weight: 75, value: 'PAID' as const },
      { weight: 10, value: 'PROCESSING' as const },
      { weight: 7, value: 'PENDING' as const },
      { weight: 4, value: 'INITIATED' as const },
      { weight: 2, value: 'FAILED' as const },
      { weight: 2, value: 'ON_HOLD' as const },
    ]);

    return {
      id: `payout-${String(sequence).padStart(10, '0')}`,
      clinicId: transient.clinicId,
      payoutPeriodStart: transient.periodStart,
      payoutPeriodEnd: new Date(transient.periodStart.getTime() + 30 * 24 * 60 * 60 * 1000),
      grossRevenueInr,
      platformFeeInr,
      tdsInr,
      netPayableInr,
      status,
      transferMethod: faker.helpers.weightedArrayElement([
        { weight: 50, value: 'NEFT' as const },
        { weight: 30, value: 'IMPS' as const },
        { weight: 15, value: 'RTGS' as const },
        { weight: 5, value: 'UPI' as const },
      ]),
      bankAccountLast4: String(faker.number.int({ min: 1000, max: 9999 })),
      bankIfsc: `${faker.helpers.arrayElement(['HDFC', 'ICIC', 'SBIN', 'AXIS'])}0${faker.string.numeric(6)}`,
      utrNumber: status === 'PAID' ? faker.string.alphanumeric(22).toUpperCase() : null,
      initiatedAt: faker.date.recent({ days: 60 }),
      paidAt: status === 'PAID' ? faker.date.recent({ days: 50 }) : null,
      failedAt: status === 'FAILED' ? faker.date.recent({ days: 30 }) : null,
      failureReason: status === 'FAILED' ? 'Bank account validation failed' : null,
      settlementCount: faker.number.int({ min: 5, max: 100 }),
      invoiceUrl: `https://r2.datunai.com/payouts/payout-${sequence}.pdf`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  persist: async (payout) => payout,
});
