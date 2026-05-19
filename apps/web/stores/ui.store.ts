// ═══════════════════════════════════════════════════════════════
// UI STORE — Interface preferences + ephemeral UI state
//
// Phase 2 upgrades over the original ui.store.ts:
//   - Composes Phase 1 middleware stack (logger → analytics → devtools → persist)
//   - Hydration tracking via withHydration() + __hasHydrated flag
//   - Persist version bumped 1 → 2 with migration
//   - THREE NEW domains (purely additive, no breaking changes):
//       1. Toasts — Stripe-Dashboard-style notification stack with
//          auto-dismiss timeouts and stable IDs.
//       2. Modal singleton — Linear/Notion pattern: at most ONE modal
//          open at a time. Eliminates modal-over-modal UX hell.
//       3. Feature flags — manual A/B switches before PostHog feature
//          flags arrive in Task #49.
//
// What is NOT persisted (always fresh on reload):
//   - toasts (UI noise, not data — should not reappear on reload)
//   - activeModal (modals close on navigation, period)
//   - historyDrawerOpen (mobile drawer reopens by user gesture)
//   - __hasHydrated (hydration internal)
//
// What IS persisted:
//   - sidebarCollapsed (user preference)
//   - lastVisitedRoute (resume-where-you-left-off)
//   - welcomeBannerDismissed (onboarding state)
//   - consultationSortOrder (user preference)
//   - featureFlags (sticky A/B assignment — won't flip mid-test)
//
// NO encryption + NO TTL on UI store — no PII here, and UI preferences
// shouldn't expire (a year-old user still expects their sidebar collapsed).
// Note theme is NOT in this store — `next-themes` owns it for SSR-safe
// no-flash theming.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';

import { createSafeStorage } from '@/lib/storage';
import type { Toast, ModalId, WithHydration } from './types';

// Phase 1 middleware
import { devtoolsEnabled, devtoolsName } from './devtools-config';
import { logger, analytics, withHydration, createHydrationState } from './middleware';

// ─── Types ────────────────────────────────────────────────────

/**
 * Sort order for the consultation history list.
 * Exported so components/selectors can reference it without duplicating.
 */
export type ConsultationSortOrder = 'newest' | 'oldest';

/**
 * Toast configuration without the auto-generated fields.
 * Use this as the input shape for `pushToast`.
 */
export type ToastInput = Omit<Toast, 'id' | 'createdAt'>;

interface UIState extends WithHydration {
  // ─── Original v1 state (preserved exactly) ──────────────────
  sidebarCollapsed: boolean;
  lastVisitedRoute: string | null;
  historyDrawerOpen: boolean;
  welcomeBannerDismissed: boolean;
  consultationSortOrder: ConsultationSortOrder;

  // ─── Phase 2 NEW: Toasts ───────────────────────────────────
  /**
   * Active toast notification stack. Rendered top-to-bottom by the
   * Phase 2+ Toaster component (Task #50). Most-recent at the END of
   * the array. Each toast has a stable `id` for programmatic dismiss
   * and as the React key.
   */
  toasts: Toast[];

  // ─── Phase 2 NEW: Modal singleton ──────────────────────────
  /**
   * Currently-open modal ID, or `null` if none. Single-active rule
   * enforced — opening a new modal silently closes any prior modal.
   */
  activeModal: ModalId | null;

  // ─── Phase 2 NEW: Feature flags ────────────────────────────
  /**
   * Map of feature-flag key → boolean. Lazy A/B / kill-switch
   * mechanism for risky rollouts BEFORE PostHog feature flags
   * (Task #49) are wired up. Once Task #49 ships, this store will
   * become a fallback cache for the PostHog-resolved flags.
   *
   * Example keys (will be populated as features roll out):
   *   'ui.toasts-v2', 'consultation.streaming', 'media.upload-v2'
   */
  featureFlags: Record<string, boolean>;

  // ─── Original v1 actions (preserved exactly) ───────────────
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLastVisitedRoute: (route: string) => void;
  setHistoryDrawerOpen: (open: boolean) => void;
  dismissWelcomeBanner: () => void;
  setConsultationSortOrder: (order: ConsultationSortOrder) => void;

  // ─── Phase 2 NEW: Toast actions ────────────────────────────
  /**
   * Show a toast notification. Auto-generates ID + createdAt.
   * Returns the generated ID so callers can programmatically dismiss
   * (e.g., a long-running upload toast wants to update its title).
   */
  pushToast: (toast: ToastInput) => string;
  /** Dismiss a specific toast by ID (idempotent). */
  dismissToast: (id: string) => void;
  /** Dismiss all toasts at once (e.g., on route change). */
  dismissAllToasts: () => void;

  // ─── Phase 2 NEW: Modal actions ────────────────────────────
  /**
   * Open a modal. If another modal is already open, it's silently
   * replaced. (Single-active rule — see header comment.)
   */
  openModal: (id: ModalId) => void;
  /** Close the current modal (no-op if no modal is open). */
  closeModal: () => void;

  // ─── Phase 2 NEW: Feature flag actions ─────────────────────
  /** Set a single feature flag's value. */
  setFeatureFlag: (key: string, value: boolean) => void;
  /** Bulk-set multiple flags at once (e.g., from PostHog sync). */
  setFeatureFlags: (flags: Record<string, boolean>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Generate a stable, unique-enough ID for a toast.
 *
 * Format: `toast_<timestamp>_<random-suffix>`. Time-prefixed so the
 * array maintains chronological order even if randomness collides.
 * crypto.randomUUID is preferred when available; otherwise falls back
 * to Math.random-based suffix (collisions astronomically rare for
 * <100 simultaneous toasts).
 */
function generateToastId(): string {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `toast_${Date.now()}_${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Persist version + migration ──────────────────────────────

const PERSIST_VERSION = 2;

/**
 * v0 → v1: added consultationSortOrder
 * v1 → v2: added featureFlags (toasts + activeModal are not persisted)
 *
 * Idempotent — only sets defaults for missing fields.
 */
function migrate(persisted: unknown, version: number): Partial<UIState> {
  const state = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<
    string,
    unknown
  >;

  if (version < 1) {
    state.consultationSortOrder = state.consultationSortOrder ?? 'newest';
  }
  if (version < 2) {
    state.featureFlags = state.featureFlags ?? {};
  }
  return state as Partial<UIState>;
}

// ─── Store ────────────────────────────────────────────────────

export const useUIStore = create<UIState>()(
  logger(
    analytics(
      devtools(
        persist(
          (set) => ({
            // Hydration tracking (Phase 1 mixin)
            ...createHydrationState<UIState>(set),

            // ─── Original state defaults ──────────────────────
            sidebarCollapsed: false,
            lastVisitedRoute: null,
            historyDrawerOpen: false,
            welcomeBannerDismissed: false,
            consultationSortOrder: 'newest',

            // ─── Phase 2 NEW state defaults ───────────────────
            toasts: [],
            activeModal: null,
            featureFlags: {},

            // ─── Original actions (preserved) ─────────────────

            toggleSidebar: () =>
              set(
                (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
                false,
                'ui/toggleSidebar',
              ),

            setSidebarCollapsed: (collapsed) =>
              set({ sidebarCollapsed: collapsed }, false, 'ui/setSidebarCollapsed'),

            setLastVisitedRoute: (route) =>
              set({ lastVisitedRoute: route }, false, 'ui/setLastVisitedRoute'),

            setHistoryDrawerOpen: (open) =>
              set({ historyDrawerOpen: open }, false, 'ui/setHistoryDrawer'),

            dismissWelcomeBanner: () =>
              set({ welcomeBannerDismissed: true }, false, 'ui/dismissBanner'),

            setConsultationSortOrder: (order) =>
              set({ consultationSortOrder: order }, false, 'ui/setSortOrder'),

            // ─── Phase 2 NEW: Toast actions ──────────────────

            pushToast: (toast) => {
              const id = generateToastId();
              const newToast: Toast = {
                ...toast,
                id,
                createdAt: Date.now(),
              };
              set((state) => ({ toasts: [...state.toasts, newToast] }), false, 'ui/pushToast');
              return id;
            },

            dismissToast: (id) =>
              set(
                (state) => {
                  const next = state.toasts.filter((t) => t.id !== id);
                  // Avoid identity change if nothing to dismiss (idempotent).
                  if (next.length === state.toasts.length) return state;
                  return { toasts: next };
                },
                false,
                'ui/dismissToast',
              ),

            dismissAllToasts: () =>
              set(
                (state) => {
                  if (state.toasts.length === 0) return state;
                  return { toasts: [] };
                },
                false,
                'ui/dismissAllToasts',
              ),

            // ─── Phase 2 NEW: Modal actions ──────────────────

            openModal: (id) => set({ activeModal: id }, false, 'ui/openModal'),

            closeModal: () =>
              set(
                (state) => {
                  if (state.activeModal === null) return state;
                  return { activeModal: null };
                },
                false,
                'ui/closeModal',
              ),

            // ─── Phase 2 NEW: Feature flag actions ───────────

            setFeatureFlag: (key, value) =>
              set(
                (state) => ({
                  featureFlags: { ...state.featureFlags, [key]: value },
                }),
                false,
                'ui/setFeatureFlag',
              ),

            setFeatureFlags: (flags) =>
              set(
                (state) => ({
                  featureFlags: { ...state.featureFlags, ...flags },
                }),
                false,
                'ui/setFeatureFlags',
              ),
          }),
          withHydration<UIState>({
            name: 'datun-ui',
            version: PERSIST_VERSION,
            storage: createJSONStorage(() => createSafeStorage()),

            // Only persist user preferences + feature flags.
            // NOT persisted: toasts, activeModal, historyDrawerOpen,
            // __hasHydrated, __setHasHydrated.
            partialize: (state) =>
              ({
                sidebarCollapsed: state.sidebarCollapsed,
                lastVisitedRoute: state.lastVisitedRoute,
                welcomeBannerDismissed: state.welcomeBannerDismissed,
                consultationSortOrder: state.consultationSortOrder,
                featureFlags: state.featureFlags,
              }) as Partial<UIState>,

            migrate,
          }),
        ),
        // devtools options
        { name: devtoolsName('UI'), enabled: devtoolsEnabled },
      ),
      // analytics options
      {
        storeName: 'ui',
        events: {
          // Limited allowlist — UI events are noisy; only the high-signal
          // ones (welcome-banner dismissal, language switch via sort, etc.)
          // earn a PostHog event.
          'ui/dismissBanner': 'welcome_banner_dismissed',
          'ui/setFeatureFlag': 'feature_flag_changed',
          'ui/openModal': 'modal_opened',
        },
      },
    ),
    // logger options
    { name: 'UI' },
  ),
);
