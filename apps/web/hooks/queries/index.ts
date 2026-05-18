// apps/web/hooks/queries/index.ts
// ═══════════════════════════════════════════════════════════════
// QUERY HOOKS — Barrel export
//
// Components and pages should import from '@/hooks/queries',
// NEVER from sub-paths, so we can reorganise internals freely.
//
// Allowed:    import { useConsultations, useCurrentUser } from '@/hooks/queries'
// Forbidden:  import { useConsultations } from '@/hooks/queries/use-consultations'
// ═══════════════════════════════════════════════════════════════

// ── Auth / Users ──
export { useCurrentUser } from './use-current-user';
export type { UseCurrentUserOptions } from './use-current-user';

// ── Consultations ──
export { useConsultations, useInfiniteConsultations } from './use-consultations';
export { useConsultation, useConsultationPdf } from './use-consultation';

// ── Admin / Labeling ──
export { useLabelingQueue } from './use-labeling-queue';
export type { UseLabelingQueueOptions, LabelingQueueData } from './use-labeling-queue';
export { useLabelingStats, useLabelingConflicts } from './use-labeling-stats';
export type { LabelingConflictsData } from './use-labeling-stats';

// ── Clinics ──
export { useClinics, useClinicSearch } from './use-clinics';
export { useClinicDetail } from './use-clinic-detail';

// ── Appointments ──
export { useAppointments, useAppointmentDetail } from './use-appointments';
export type { AppointmentFilters } from './use-appointments';

// ── Health Score (Task #32 stub) ──
export { useHealthScore, useHealthScoreHistory } from './use-health-score';
export type { HealthScoreDTO, HealthScoreHistoryPoint, HealthScoreRange } from './use-health-score';

// ── Prescriptions (Task #58 stub) ──
export { usePrescriptions, usePrescriptionDetail } from './use-prescriptions';
export type {
  PrescriptionStatus,
  PrescriptionListItem,
  PrescriptionDetail,
} from './use-prescriptions';

// ── Notifications ──
export { useNotifications, useUnreadNotificationCount } from './use-notifications';

// ── Feature Flags (Task #49 stub) ──
export { useFeatureFlags, useFeatureFlag } from './use-feature-flags';
export type { FeatureFlagMap, UseFeatureFlagsOptions } from './use-feature-flags';

// ── Media ──
export { useMediaAsset } from './use-media-asset';
