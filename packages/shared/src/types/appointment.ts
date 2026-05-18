// packages/shared/src/types/appointment.ts
// ═══════════════════════════════════════════════════════════════
// APPOINTMENT DTO TYPES — Task #47 Phase 1
//
// Patient ↔ clinic booking flow.
//
// Used by:
//   - Task #59  — Clinic owner dashboard (pending → confirmed)
//   - Task #157 — Advanced booking + reminder cascade
//   - Patient-facing "My Appointments" page (future)
//
// Reminder channels align with the documented WhatsApp-first strategy.
// SMS and email are fallbacks when WhatsApp delivery fails.
// ═══════════════════════════════════════════════════════════════

// ─── Enums ─────────────────────────────────────────────────

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED_BY_PATIENT'
  | 'CANCELLED_BY_CLINIC'
  | 'NO_SHOW';

export type AppointmentReminderChannel = 'whatsapp' | 'sms' | 'email';

// ─── DTO ───────────────────────────────────────────────────

export interface AppointmentDTO {
  readonly id: string;
  /** Source consultation (if booked off an AI assessment). Null for direct bookings. */
  readonly consultationId: string | null;
  readonly clinicId: string;
  readonly clinicName: string;
  readonly patientName: string;
  readonly patientPhone: string;
  readonly serviceName: string;
  /** ISO-8601 timestamp for the scheduled slot. */
  readonly scheduledAt: string;
  readonly durationMinutes: number;
  readonly status: AppointmentStatus;
  readonly notes: string | null;
  /** Channels through which a reminder has already been dispatched. */
  readonly remindersSent: readonly AppointmentReminderChannel[];
  /** ISO-8601 timestamp. */
  readonly createdAt: string;
  /** ISO-8601 timestamp. */
  readonly updatedAt: string;
}

// ─── Mutation inputs ───────────────────────────────────────

export interface BookAppointmentInput {
  readonly clinicId: string;
  /** Optional: links the booking back to the consultation that led to it. */
  readonly consultationId?: string;
  readonly serviceName: string;
  /** ISO-8601 timestamp for the requested slot. */
  readonly scheduledAt: string;
  readonly notes?: string;
}

export interface CancelAppointmentInput {
  /** Free-text reason. Required for analytics on cancellation patterns. */
  readonly reason: string;
}
