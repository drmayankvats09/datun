// apps/web/hooks/mutations/index.ts
// ═══════════════════════════════════════════════════════════════
// MUTATION HOOKS — Barrel export
//
// Components and pages should import from '@/hooks/mutations',
// NEVER from sub-paths.
//
// Allowed:    import { useSendMessage } from '@/hooks/mutations'
// Forbidden:  import { useSendMessage } from '@/hooks/mutations/use-send-message'
// ═══════════════════════════════════════════════════════════════

// ── Consultations ──
export { useSendMessage } from './use-send-message';
export type { UseSendMessageOptions, SendMessageVars } from './use-send-message';

export { useCompleteConsultation } from './use-complete-consultation';
export type { UseCompleteConsultationOptions } from './use-complete-consultation';

// ── Labeling (Task #44) ──
export { useSubmitLabel } from './use-submit-label';
export type { SubmitLabelInput, SubmitLabelResponse } from './use-submit-label';

// ── Auth ──
export { useLogout } from './use-logout';

// ── Appointments ──
export { useBookAppointment, useCancelAppointment } from './use-book-appointment';
export type { CancelAppointmentVars } from './use-book-appointment';

// ── Notifications ──
export { useMarkNotificationRead, useMarkAllNotificationsRead } from './use-mark-notification-read';
