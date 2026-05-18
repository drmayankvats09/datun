// packages/shared/src/types/notification.ts
// ═══════════════════════════════════════════════════════════════
// NOTIFICATION DTO TYPES — Task #47 Phase 1
//
// In-app notification feed — bell icon dropdown in the header,
// optionally mirrored as WhatsApp / email messages.
//
// `kind` values are aligned with the existing approved WhatsApp
// templates (`consultation_complete`, `3day_followup`, `7day_followup`,
// `appointment_reminder`, `weekly_tip`) plus new in-app-only kinds.
// ═══════════════════════════════════════════════════════════════

export type NotificationKind =
  | 'CONSULTATION_COMPLETED'
  | 'PDF_READY'
  | 'APPOINTMENT_REMINDER'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'FOLLOW_UP_3DAY'
  | 'FOLLOW_UP_7DAY'
  | 'WEEKLY_TIP'
  | 'CLINIC_REPLY'
  | 'SYSTEM_ALERT';

export interface NotificationDTO {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  /**
   * Deep-link to the related entity:
   *   - /consultation/:id   for CONSULTATION_*, PDF_READY
   *   - /appointment/:id    for APPOINTMENT_*
   *   - /tips/:slug         for WEEKLY_TIP
   *   - null                for SYSTEM_ALERT (no destination)
   */
  readonly href: string | null;
  /** ISO-8601 timestamp when read by the user. Null when unread. */
  readonly readAt: string | null;
  /** ISO-8601 timestamp. */
  readonly createdAt: string;
}

export interface NotificationListFilters {
  readonly unreadOnly?: boolean;
  readonly page?: number;
  readonly pageSize?: number;
}
