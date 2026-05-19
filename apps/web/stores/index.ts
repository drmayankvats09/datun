// ═══════════════════════════════════════════════════════════════
// STORES BARREL — Public API for the Datun state management layer
//
// Phase 3 final form: re-exports every stable surface from the stores
// directory in one place. Backward compatible — every import path that
// worked before Phase 3 still works (we never removed anything; we only
// added new groups).
//
// Sections (in order):
//   1. STORES — bound hooks for the three Zustand stores
//   2. CROSS-TAB AUTH SYNC — listener registered once in app shell
//   3. SELECTORS — atomic typed hooks for reading state slices
//   4. ACTIONS BUNDLES — multi-action grouped selectors
//   5. RESET UTILITIES — logout / account-deletion cleanup
//   6. TYPES — public types for components, hooks, and tests
// ═══════════════════════════════════════════════════════════════

// ─── 1. STORES ────────────────────────────────────────────────

export { useAuthStore } from './auth.store';
export { useConsultationStore } from './consultation.store';
export { useUIStore } from './ui.store';

// ─── 2. CROSS-TAB AUTH SYNC ───────────────────────────────────

export { listenCrossTabAuth } from './auth.store';

// ─── 3. SELECTORS ─────────────────────────────────────────────

export {
  // Auth
  useUser,
  useIsAuthenticated,
  useUserId,
  useUserEmail,
  useAuthLoading,
  useLastAuthSyncedAt,
  // Consultation
  useActiveConsultationId,
  useClientUuid,
  useMessages,
  useMessageCount,
  useLastMessage,
  useConsultationStatus,
  useIsConsultationActive,
  useIsConsultationCompleted,
  useIsConsultationIntake,
  useIntakeDraft,
  useIsIntakeComplete,
  useCurrentLanguage,
  useHasUnsavedChanges,
  useIntakeFields,
  // UI
  useSidebarCollapsed,
  useHistoryDrawerOpen,
  useLastVisitedRoute,
  useWelcomeBannerDismissed,
  useConsultationSortOrder,
} from './selectors';

// ─── 4. ACTIONS BUNDLES ───────────────────────────────────────

export {
  useAuthActions,
  useConsultationActions,
  useResumeConsultation,
  useUIActions,
} from './selectors';

// ─── 5. RESET UTILITIES ───────────────────────────────────────

export { resetAllStores, hardResetAllStores } from './reset';

// ─── 6. TYPES ─────────────────────────────────────────────────

// Original v1 types (existing components import these)
export type { ChatMessage, IntakeFormDraft } from './consultation.store';

// Phase 2 new types — shared across stores, slices, components
export type {
  WithHydration,
  ActionLabel,
  ConsultationStatus,
  ConsultationStatusFlat,
  Toast,
  ModalId,
  AuthUser,
} from './types';

// Phase 2 UI store types
export type { ConsultationSortOrder, ToastInput } from './ui.store';

// Phase 2 slice types — useful for tests + custom component typing
export type { MessagesSlice } from './slices/messages.slice';
export type { IntakeSlice } from './slices/intake.slice';
export type { MediaSlice, PhotoStatus, UploadedPhoto } from './slices/media.slice';
export type { StreamingSlice } from './slices/streaming.slice';

// Phase 2 store composition type — for advanced use cases
export type { ConsultationStore } from './consultation.store';
