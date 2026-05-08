// ═══════════════════════════════════════════════════════════════
// NOTIFICATION FACTORY — Multi-channel notification (B-3 v2)
//
// Schema alignment (packages/db/prisma/schema.prisma → model Notification):
//   Required:  id, userId (cascade), type (NotificationType enum),
//              channel (NotificationChannel enum), title (String), body (Text),
//              isRead, isSent, retryCount, locale (LocaleCode @default(en)),
//              createdAt, updatedAt
//   Optional:  actionUrl, readAt, sentAt, failedAt, failureReason,
//              scheduledFor, expiresAt, relatedEntityType, relatedEntityId,
//              metadata (Json?)
//
// Status modelling — schema does NOT have a "status" enum.
// State derived from boolean + timestamp combinations:
//
//   QUEUED      → isSent=false, sentAt=null,    failedAt=null
//   SENT        → isSent=true,  sentAt=Date,    failedAt=null
//   READ        → isSent=true,  sentAt=Date,    isRead=true, readAt=Date
//   FAILED      → isSent=false, sentAt=null,    failedAt=Date, failureReason=string
//   SCHEDULED   → isSent=false, scheduledFor=Date (future), sentAt=null
//
// Pattern: Stripe webhook delivery state — boolean flags + timestamps
//          rather than enum status (better for indexing + partial indexes).
// ═══════════════════════════════════════════════════════════════

import {
  Prisma,
  type LocaleCode,
  type Notification,
  type NotificationChannel,
  type NotificationType,
} from '@prisma/client';
import { defineFactory, prismaInput, toNullableJsonInput } from '../core';

// ─────────────────────────────────────────────────────────────────
// LOCAL TYPE — Not a Prisma enum; derived state used by transient only.
// ─────────────────────────────────────────────────────────────────
type NotificationLifecycleState = 'QUEUED' | 'SENT' | 'READ' | 'FAILED' | 'SCHEDULED';

// ─────────────────────────────────────────────────────────────────
// TEMPLATES — Localized title/body per NotificationType.
// Schema's `title` is a single string; we pick title-by-locale at build time.
// ─────────────────────────────────────────────────────────────────
interface NotificationTemplate {
  readonly type: NotificationType;
  readonly titleByLocale: Partial<Record<LocaleCode, string>>;
  readonly bodyByLocale: Partial<Record<LocaleCode, string>>;
  readonly hasActionUrl: boolean;
}

const NOTIFICATION_TEMPLATES: readonly NotificationTemplate[] = [
  {
    type: 'CONSULTATION_COMPLETE',
    titleByLocale: {
      en: 'Consultation Complete',
      hi: 'सलाह पूरी हुई',
    },
    bodyByLocale: {
      en: 'Your dental consultation report is ready to view.',
      hi: 'आपकी डेंटल सलाह की रिपोर्ट तैयार है।',
    },
    hasActionUrl: true,
  },
  {
    type: 'APPOINTMENT_REMINDER',
    titleByLocale: {
      en: 'Appointment Tomorrow',
      hi: 'कल आपका अपॉइंटमेंट',
    },
    bodyByLocale: {
      en: 'Your appointment is scheduled for tomorrow at 10:00 AM.',
      hi: 'आपका अपॉइंटमेंट कल सुबह 10:00 बजे है।',
    },
    hasActionUrl: true,
  },
  {
    type: 'FOLLOW_UP',
    titleByLocale: {
      en: 'How are you feeling?',
      hi: 'आप कैसे हैं?',
    },
    bodyByLocale: {
      en: 'Just checking in after your consultation. Any concerns?',
      hi: 'सलाह के बाद आपका हाल जानने के लिए संदेश।',
    },
    hasActionUrl: true,
  },
  {
    type: 'REVIEW_REQUEST',
    titleByLocale: {
      en: 'Rate Your Experience',
      hi: 'अपने अनुभव को रेट करें',
    },
    bodyByLocale: {
      en: 'How was your consultation? Your feedback helps us improve.',
      hi: 'आपकी सलाह कैसी रही? आपकी राय हमें बेहतर बनाती है।',
    },
    hasActionUrl: true,
  },
  {
    type: 'LEAD_NEW',
    titleByLocale: {
      en: 'New Patient Lead',
      hi: 'नया मरीज़ लीड',
    },
    bodyByLocale: {
      en: 'A new patient has expressed interest in your clinic.',
      hi: 'एक नया मरीज़ आपके क्लिनिक में रुचि रखता है।',
    },
    hasActionUrl: true,
  },
  {
    type: 'PAYMENT_SUCCESS',
    titleByLocale: {
      en: 'Payment Successful',
      hi: 'भुगतान सफल',
    },
    bodyByLocale: {
      en: 'Your subscription payment has been processed successfully.',
      hi: 'आपकी सदस्यता का भुगतान सफलतापूर्वक हो गया है।',
    },
    hasActionUrl: true,
  },
  {
    type: 'PAYMENT_FAILED',
    titleByLocale: {
      en: 'Payment Failed',
      hi: 'भुगतान विफल',
    },
    bodyByLocale: {
      en: 'Your payment could not be processed. Please update your payment method.',
      hi: 'भुगतान नहीं हो सका। कृपया अपनी भुगतान विधि अपडेट करें।',
    },
    hasActionUrl: true,
  },
  {
    type: 'SYSTEM',
    titleByLocale: {
      en: 'System Update',
      hi: 'सिस्टम अपडेट',
    },
    bodyByLocale: {
      en: 'Datun has been updated with new features.',
      hi: 'Datun में नए फ़ीचर जोड़े गए हैं।',
    },
    hasActionUrl: false,
  },
  {
    type: 'PROMOTIONAL',
    titleByLocale: {
      en: 'Weekly Dental Tip',
      hi: 'इस हफ्ते का सुझाव',
    },
    bodyByLocale: {
      en: 'Brush twice daily for 2 minutes. Floss before bed for healthier gums.',
      hi: 'दिन में दो बार दो मिनट ब्रश करें। रात को फ्लॉस करना न भूलें।',
    },
    hasActionUrl: false,
  },
] as const;

const SUPPORTED_LOCALES: readonly LocaleCode[] = ['en', 'hi'] as const;

// ─────────────────────────────────────────────────────────────────
// TRANSIENT
// ─────────────────────────────────────────────────────────────────
interface NotificationTransient {
  /** Recipient user ID — required */
  readonly userId: string;
  /** Force a specific channel */
  readonly channel?: NotificationChannel;
  /** Force a specific type */
  readonly type?: NotificationType;
  /** Force a specific locale */
  readonly locale?: LocaleCode;
  /** Force a specific lifecycle state */
  readonly forceState?: NotificationLifecycleState;
  /** Cross-entity link */
  readonly relatedEntityType?: string;
  readonly relatedEntityId?: string;
}

// ─────────────────────────────────────────────────────────────────
// FACTORY DEFINITION
// ─────────────────────────────────────────────────────────────────
export const notificationFactory = defineFactory<Notification, NotificationTransient>({
  name: 'notification',
  defaultTransient: { userId: '' },

  build: ({ sequence, faker, transient }) => {
    if (!transient.userId) {
      throw new Error('[notification.factory] userId required');
    }

    // ── Channel distribution (Datun usage 2026 baseline) ──
    const channel: NotificationChannel =
      transient.channel ??
      faker.helpers.weightedArrayElement([
        { weight: 40, value: 'IN_APP' },
        { weight: 25, value: 'WHATSAPP' },
        { weight: 15, value: 'EMAIL' },
        { weight: 12, value: 'PUSH' },
        { weight: 8, value: 'SMS' },
      ]);

    // ── Locale (en dominant for adult patients; hi for tier-2/3) ──
    const locale: LocaleCode =
      transient.locale ??
      faker.helpers.weightedArrayElement([
        { weight: 60, value: 'en' as const },
        { weight: 40, value: 'hi' as const },
      ]);

    // ── Pick template (forced type or random) ──
    const template = transient.type
      ? (NOTIFICATION_TEMPLATES.find((t) => t.type === transient.type) ?? NOTIFICATION_TEMPLATES[0])
      : faker.helpers.arrayElement([...NOTIFICATION_TEMPLATES]);

    const title = template!.titleByLocale[locale] ?? template!.titleByLocale.en ?? 'Notification';
    const body = template!.bodyByLocale[locale] ?? template!.bodyByLocale.en ?? '';

    // ── Lifecycle state (boolean + timestamp pattern) ──
    const state: NotificationLifecycleState =
      transient.forceState ??
      faker.helpers.weightedArrayElement([
        { weight: 55, value: 'READ' as const },
        { weight: 25, value: 'SENT' as const },
        { weight: 12, value: 'QUEUED' as const },
        { weight: 5, value: 'FAILED' as const },
        { weight: 3, value: 'SCHEDULED' as const },
      ]);

    const createdAt = faker.date.recent({ days: 30 });
    const sentAt =
      state === 'SENT' || state === 'READ'
        ? faker.date.between({ from: createdAt, to: new Date() })
        : null;
    const readAt =
      state === 'READ' && sentAt ? faker.date.between({ from: sentAt, to: new Date() }) : null;
    const failedAt = state === 'FAILED' ? faker.date.recent({ days: 7 }) : null;
    const scheduledFor =
      state === 'SCHEDULED' ? faker.date.future({ years: 0, refDate: createdAt }) : null;

    const failureReason: string | null =
      state === 'FAILED'
        ? faker.helpers.arrayElement([
            'channel_unavailable',
            'recipient_opted_out',
            'invalid_token',
            'rate_limited',
            'provider_5xx',
          ])
        : null;

    const isSent = state === 'SENT' || state === 'READ';
    const isRead = state === 'READ';
    const retryCount = state === 'FAILED' ? faker.number.int({ min: 1, max: 5 }) : 0;

    // ── Action URL (template-driven) ──
    const actionUrl: string | null = template!.hasActionUrl
      ? `/${template!.type.toLowerCase()}/${faker.string.alphanumeric(10)}`
      : null;

    // ── Expires (promotional/system notifications expire faster) ──
    const expiresAt: Date | null =
      template!.type === 'PROMOTIONAL' || template!.type === 'SYSTEM'
        ? faker.date.future({ years: 0, refDate: createdAt })
        : null;

    return {
      id: `notif-${String(sequence).padStart(10, '0')}`,
      userId: transient.userId,
      type: template!.type,
      channel,
      title,
      body,
      actionUrl,
      isRead,
      readAt,
      isSent,
      sentAt,
      failedAt,
      failureReason,
      retryCount,
      scheduledFor,
      expiresAt,
      relatedEntityType: transient.relatedEntityType ?? null,
      relatedEntityId: transient.relatedEntityId ?? null,
      locale,
      metadata: null,
      createdAt,
      updatedAt: createdAt,
    } as unknown as Notification;
  },

  persist: async (notification, prisma) => {
    const n = notification as Record<string, unknown>;
    const created = await prisma.notification.create({
      data: prismaInput<Prisma.NotificationUncheckedCreateInput>({
        id: n.id as string,
        userId: n.userId as string,
        type: n.type as NotificationType,
        channel: n.channel as NotificationChannel,
        title: n.title as string,
        body: n.body as string,
        actionUrl: (n.actionUrl as string | null | undefined) ?? null,

        isRead: (n.isRead as boolean | undefined) ?? false,
        readAt: (n.readAt as Date | null | undefined) ?? null,
        isSent: (n.isSent as boolean | undefined) ?? false,
        sentAt: (n.sentAt as Date | null | undefined) ?? null,
        failedAt: (n.failedAt as Date | null | undefined) ?? null,
        failureReason: (n.failureReason as string | null | undefined) ?? null,
        retryCount: (n.retryCount as number | undefined) ?? 0,

        scheduledFor: (n.scheduledFor as Date | null | undefined) ?? null,
        expiresAt: (n.expiresAt as Date | null | undefined) ?? null,

        relatedEntityType: (n.relatedEntityType as string | null | undefined) ?? null,
        relatedEntityId: (n.relatedEntityId as string | null | undefined) ?? null,

        locale: (n.locale as LocaleCode | undefined) ?? 'en',
        metadata: toNullableJsonInput(n.metadata),
      }),
    });
    return created as unknown as Notification;
  },
});

// ─────────────────────────────────────────────────────────────────
// Convenience builders — one-line factory shortcuts
// ─────────────────────────────────────────────────────────────────

/** Consultation-complete notification (in-app, with action URL). */
export const buildConsultationCompleteNotification = (userId: string, locale: LocaleCode = 'en') =>
  notificationFactory.build(undefined, {
    userId,
    type: 'CONSULTATION_COMPLETE',
    channel: 'IN_APP',
    locale,
    forceState: 'SENT',
  });

/** Appointment reminder notification (24h before). */
export const buildAppointmentReminder = (userId: string, locale: LocaleCode = 'en') =>
  notificationFactory.build(undefined, {
    userId,
    type: 'APPOINTMENT_REMINDER',
    channel: 'WHATSAPP',
    locale,
    forceState: 'SCHEDULED',
  });

/** Payment failure notification (with retry count). */
export const buildPaymentFailedNotification = (userId: string) =>
  notificationFactory.build(undefined, {
    userId,
    type: 'PAYMENT_FAILED',
    channel: 'EMAIL',
    forceState: 'FAILED',
  });

/** System notification — broadcast feature update. */
export const buildSystemNotification = (userId: string, locale: LocaleCode = 'en') =>
  notificationFactory.build(undefined, {
    userId,
    type: 'SYSTEM',
    channel: 'IN_APP',
    locale,
    forceState: 'READ',
  });
