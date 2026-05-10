// ═══════════════════════════════════════════════════════════════
// PAYMENT FACTORY — Razorpay/PhonePe/UPI transaction trail
// Source: Razorpay payment-status state machine
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type PaymentMode =
  | 'UPI'
  | 'CARD_DEBIT'
  | 'CARD_CREDIT'
  | 'NET_BANKING'
  | 'WALLET'
  | 'CASH'
  | 'EMI'
  | 'INSURANCE'
  | 'CGHS_ECHS';
type PaymentStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'CAPTURED'
  | 'AUTHORIZED'
  | 'REFUNDED'
  | 'PARTIAL_REFUND'
  | 'FAILED'
  | 'EXPIRED'
  | 'DISPUTED';

interface PaymentOutput {
  readonly id: string;
  readonly entityId: string;
  readonly entityType: 'APPOINTMENT' | 'CONSULTATION' | 'SUBSCRIPTION' | 'CLINIC_INVOICE';
  readonly clinicId: string;
  readonly patientId: string | null;
  readonly amountInr: number;
  readonly currency: 'INR';
  readonly mode: PaymentMode;
  readonly status: PaymentStatus;
  readonly gateway: 'RAZORPAY' | 'PHONEPE' | 'PAYTM' | 'CASHFREE' | 'STRIPE' | 'NONE';
  readonly gatewayTransactionId: string | null;
  readonly gatewayOrderId: string | null;
  readonly upiVpa: string | null;
  readonly cardLast4: string | null;
  readonly cardBrand: string | null;
  readonly bankName: string | null;
  readonly initiatedAt: Date;
  readonly capturedAt: Date | null;
  readonly refundedAt: Date | null;
  readonly refundAmountInr: number;
  readonly platformFeeInr: number;
  readonly gatewayFeeInr: number;
  readonly gstInr: number;
  readonly netSettlementInr: number;
  readonly receiptUrl: string | null;
  readonly invoiceNumber: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface PaymentTransient {
  readonly entityId: string;
  readonly entityType: 'APPOINTMENT' | 'CONSULTATION' | 'SUBSCRIPTION' | 'CLINIC_INVOICE';
  readonly clinicId: string;
  readonly patientId?: string | null;
  readonly forceAmount?: number;
  readonly forceMode?: PaymentMode;
  readonly forceStatus?: PaymentStatus;
}

export const paymentFactory = defineFactory<PaymentOutput, PaymentTransient>({
  name: 'appointment' as 'appointment',
  defaultTransient: { entityId: 'unknown', entityType: 'APPOINTMENT', clinicId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const amountInr =
      transient.forceAmount ??
      faker.helpers.weightedArrayElement([
        { weight: 25, value: 200 },
        { weight: 20, value: 500 },
        { weight: 18, value: 1000 },
        { weight: 12, value: 1500 },
        { weight: 10, value: 3000 },
        { weight: 8, value: 6000 },
        { weight: 4, value: 12000 },
        { weight: 2, value: 25000 },
        { weight: 1, value: 50000 },
      ]);

    const mode =
      transient.forceMode ??
      faker.helpers.weightedArrayElement([
        { weight: 55, value: 'UPI' as const },
        { weight: 15, value: 'CARD_DEBIT' as const },
        { weight: 10, value: 'CARD_CREDIT' as const },
        { weight: 8, value: 'CASH' as const },
        { weight: 5, value: 'NET_BANKING' as const },
        { weight: 3, value: 'WALLET' as const },
        { weight: 2, value: 'EMI' as const },
        { weight: 1, value: 'INSURANCE' as const },
        { weight: 1, value: 'CGHS_ECHS' as const },
      ]);

    const status =
      transient.forceStatus ??
      faker.helpers.weightedArrayElement([
        { weight: 80, value: 'CAPTURED' as const },
        { weight: 8, value: 'PENDING' as const },
        { weight: 5, value: 'FAILED' as const },
        { weight: 3, value: 'REFUNDED' as const },
        { weight: 2, value: 'PARTIAL_REFUND' as const },
        { weight: 1, value: 'AUTHORIZED' as const },
        { weight: 1, value: 'EXPIRED' as const },
      ]);

    const gateway =
      mode === 'CASH'
        ? 'NONE'
        : faker.helpers.weightedArrayElement([
            { weight: 60, value: 'RAZORPAY' as const },
            { weight: 20, value: 'PHONEPE' as const },
            { weight: 10, value: 'CASHFREE' as const },
            { weight: 7, value: 'PAYTM' as const },
            { weight: 3, value: 'STRIPE' as const },
          ]);

    const initiatedAt = faker.date.recent({ days: 90 });
    const capturedAt =
      status === 'CAPTURED' || status === 'REFUNDED' || status === 'PARTIAL_REFUND'
        ? new Date(initiatedAt.getTime() + faker.number.int({ min: 1000, max: 60000 }))
        : null;

    const platformFeePercent = 0.02;
    const gatewayFeePercent = mode === 'CARD_CREDIT' ? 0.024 : mode === 'UPI' ? 0 : 0.0175;
    const platformFeeInr = Math.round(amountInr * platformFeePercent);
    const gatewayFeeInr = Math.round(amountInr * gatewayFeePercent);
    const gstInr = Math.round((platformFeeInr + gatewayFeeInr) * 0.18);

    return {
      id: `pay-${String(sequence).padStart(12, '0')}`,
      entityId: transient.entityId,
      entityType: transient.entityType,
      clinicId: transient.clinicId,
      patientId: transient.patientId ?? null,
      amountInr,
      currency: 'INR' as const,
      mode,
      status,
      gateway,
      gatewayTransactionId: gateway !== 'NONE' ? `pay_${faker.string.alphanumeric(20)}` : null,
      gatewayOrderId: gateway !== 'NONE' ? `order_${faker.string.alphanumeric(20)}` : null,
      upiVpa:
        mode === 'UPI'
          ? `${faker.internet.username().toLowerCase()}@${faker.helpers.arrayElement(['oksbi', 'okicici', 'okhdfcbank', 'paytm', 'apl', 'ybl'])}`
          : null,
      cardLast4:
        mode === 'CARD_DEBIT' || mode === 'CARD_CREDIT'
          ? String(faker.number.int({ min: 1000, max: 9999 }))
          : null,
      cardBrand:
        mode === 'CARD_DEBIT' || mode === 'CARD_CREDIT'
          ? faker.helpers.arrayElement(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX'])
          : null,
      bankName:
        mode === 'NET_BANKING'
          ? faker.helpers.arrayElement(['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK'])
          : null,
      initiatedAt,
      capturedAt,
      refundedAt:
        status === 'REFUNDED' || status === 'PARTIAL_REFUND'
          ? faker.date.recent({ days: 30 })
          : null,
      refundAmountInr:
        status === 'REFUNDED'
          ? amountInr
          : status === 'PARTIAL_REFUND'
            ? Math.round(amountInr * 0.5)
            : 0,
      platformFeeInr,
      gatewayFeeInr,
      gstInr,
      netSettlementInr: amountInr - platformFeeInr - gatewayFeeInr - gstInr,
      receiptUrl:
        status === 'CAPTURED' ? `https://r2.datunai.com/receipts/pay-${sequence}.pdf` : null,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(sequence).padStart(8, '0')}`,
      createdAt: initiatedAt,
      updatedAt: new Date(),
    };
  },

  persist: async (payment) => payment,
});
