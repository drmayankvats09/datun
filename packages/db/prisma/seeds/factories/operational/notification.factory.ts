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
// NotificationType enum (schema):
//   CONSULTATION_COMPLETE | APPOINTMENT_REMINDER | FOLLOW_UP |
//   REVIEW_REQUEST | LEAD_NEW | PAYMENT_SUCCESS | PAYMENT_FAILED |
//   SYSTEM | PROMOTIONAL
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

import { randomUUID } from 'node:crypto';
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
    type: 'FOLLOW_UP',
    titleByLocale: {
      en: 'How are you feeling now?',
      hi: 'अब आप कैसा महसूस कर रहे हैं?',
    },
    bodyByLocale: {
      en: 'Your consultation was 3 days ago. Please share an update so we can help you better.',
      hi: 'आपकी consultation 3 दिन पहले हुई थी। कृपया अपनी update साझा करें।',
    },
    hasActionUrl: true,
  },
  {
    type: 'APPOINTMENT_REMINDER',
    titleByLocale: {
      en: 'Appointment reminder',
      hi: 'अपॉइंटमेंट याद दिलाना',
    },
    bodyByLocale: {
      en: 'You have an appointment tomorrow at the clinic.',
      hi: 'कल आपका clinic में appointment है।',
    },
    hasActionUrl: true,
  },
  {
    type: 'CONSULTATION_COMPLETE',
    titleByLocale: {
      en: 'Prescription ready',
      hi: 'प्रिस्क्रिप्शन तैयार है',
    },
    bodyByLocale: {
      en: 'Your consultation is complete and prescription PDF is ready to download.',
      hi: 'आपकी consultation पूरी हो गई है और prescription तैयार है। अभी download करें।',
    },
    hasActionUrl: true,
  },
  {
    type: 'SYSTEM',
    titleByLocale: {
      en: 'System update',
      hi: 'सिस्टम अपडेट',
    },
    bodyByLocale: {
      en: 'Datun has new features. Tap to explore.',
      hi: 'Datun में नई features हैं। Tap करें।',
    },
    hasActionUrl: false,
  },
  {
    type: 'PROMOTIONAL',
    titleByLocale: {
      en: 'New tip for you',
      hi: 'आपके लिए नई tip',
    },
    bodyByLocale: {
      en: 'Read this week’s dental health tip.',
      hi: 'इस हफ्ते की dental health tip पढ़ें।',
    },
    hasActionUrl: true,
  },
] as const;

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

/**
 * Add `days` (can be fractional) to a base date — replaces buggy
 * `faker.date.future({ years: 0, refDate })` which throws in faker 9+.
 * Faker validates `years > 0` strictly; we needed seconds-to-days offsets,
 * so we compute deterministically off the seeded RNG instead.
 */
function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────
// FACTORY DEFINITION
// ─────────────────────────────────────────────────────────────────
export const notificationFactory = defineFactory<Notification, NotificationTransient>({
  name: 'notification',
  defaultTransient: { userId: '' },

  build: ({ faker, transient }) => {
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

    // ── Scheduled for: future date (1-30 days ahead) ──
    // FIX: faker.date.future({ years: 0 }) throws in faker 9+ ("Years must be greater than 0").
    // We compute future offset deterministically using faker's seeded RNG.
    const scheduledFor =
      state === 'SCHEDULED'
        ? addDays(createdAt, faker.number.float({ min: 1, max: 30, fractionDigits: 2 }))
        : null;

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
    // Same fix as scheduledFor — faker.date.future does not accept years: 0.
    const expiresAt: Date | null =
      template!.type === 'PROMOTIONAL' || template!.type === 'SYSTEM'
        ? addDays(createdAt, faker.number.float({ min: 7, max: 90, fractionDigits: 2 }))
        : null;

    // FIX: id was `notif-XXX` non-UUID; schema requires @db.Uuid. Now real UUID.
    return {
      id: randomUUID(),
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
        locale: n.locale as LocaleCode,
        metadata: toNullableJsonInput(n.metadata),
        createdAt: (n.createdAt as Date | undefined) ?? new Date(),
        updatedAt: (n.updatedAt as Date | undefined) ?? new Date(),
      }),
    });
    return created as unknown as Notification;
  },
});
