// ═══════════════════════════════════════════════════════════════
// STORE SELECTORS — Custom hooks that subscribe to specific state slices
//
// Why we expose SELECTORS (not raw stores) to components:
// - Atomic subscriptions: each component re-renders only when ITS slice
//   changes, not on every store update. (TkDodo's #1 Zustand rule.)
// - Refactor safety: if we rename `user.firstName` to `user.fullName.first`,
//   we touch ONE file (this one), not 30 components.
// - Type inference: components get a fully-typed primitive value with no
//   inline selector annotations needed.
// - `useShallow` built-in for multi-value selectors — prevents the
//   "Maximum update depth exceeded" footgun (Zustand v5 stricter equality).
//
// Pattern source: TkDodo's "Working with Zustand" blog post + Pinterest /
// Linear engineering blogs. Standard 2026 React app architecture.
//
// Naming convention:
//   useX()         → returns a single value (atomic selector)
//   useXAndY()     → returns multiple values (uses useShallow)
//   useIsX()       → returns a derived boolean
//   useXActions()  → returns bundled action functions
//
// Phase 1 ships selectors for the CURRENT store shape. Phase 2 will
// extend this file with selectors for new state (toasts, modals,
// featureFlags, media, streaming slice) — purely additive, no breaking.
// ═══════════════════════════════════════════════════════════════

import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from './auth.store';
import { useConsultationStore, type ChatMessage, type IntakeFormDraft } from './consultation.store';
import { useUIStore } from './ui.store';
import type { AuthUser } from '@/lib/auth';

// ═══════════════════════════════════════════════════════════════
// AUTH SELECTORS
// ═══════════════════════════════════════════════════════════════

/**
 * Current authenticated user object, or `null` when logged out.
 *
 * Re-renders only when the user object's identity changes.
 * For partial field access, prefer the narrower selectors below
 * (e.g., `useUserId()`, `useUserEmail()`) so a profile edit doesn't
 * re-render every component that only cares about the user ID.
 */
export const useUser = (): AuthUser | null => useAuthStore((s) => s.user);

/**
 * Boolean — is the current session authenticated?
 *
 * Use this over `useUser() !== null` because it returns a primitive
 * boolean. React only re-renders on actual transitions (logged-in ↔
 * logged-out), not on every user object identity change (e.g., a
 * profile field edit creates a new user object reference).
 */
export const useIsAuthenticated = (): boolean => useAuthStore((s) => s.user !== null);

/**
 * Current user's ID, or `null` if logged out / not yet hydrated.
 *
 * The most-used selector in the entire app — every authenticated API
 * call, route guard, and analytics event reads it. Pure string primitive
 * = zero re-render footgun, maximally cache-friendly.
 */
export const useUserId = (): string | null => useAuthStore((s) => s.user?.id ?? null);

/**
 * Current user's email, or `null` if logged out.
 */
export const useUserEmail = (): string | null => useAuthStore((s) => s.user?.email ?? null);

/**
 * Whether the auth store is still in its initial loading state.
 *
 * `true` until the first `setUser()` or `clearUser()` call after app boot
 * (i.e., until we've checked the auth cookie). Render a global "Loading..."
 * splash on first paint while this is `true` to avoid logged-out flash.
 */
export const useAuthLoading = (): boolean => useAuthStore((s) => s.isLoading);

/**
 * Unix epoch ms of the last successful auth sync (login, refresh, or
 * cross-tab broadcast). `null` if user has never been authenticated this
 * session. Useful for "session expires in X minutes" warnings.
 */
export const useLastAuthSyncedAt = (): number | null => useAuthStore((s) => s.lastSyncedAt);

// ═══════════════════════════════════════════════════════════════
// CONSULTATION SELECTORS
// ═══════════════════════════════════════════════════════════════

/**
 * ID of the currently active consultation, or `null` if none.
 *
 * `null` in two cases:
 *   1. User hasn't started a consultation (status: 'idle' or 'intake').
 *   2. User cleared their last consultation.
 */
export const useActiveConsultationId = (): string | null =>
  useConsultationStore((s) => s.activeConsultationId);

/**
 * Stable client UUID for the current consultation session.
 *
 * Used by the backend to deduplicate concurrent intake submissions from
 * the same device. Generated on `startConsultation`, persisted with the
 * consultation, cleared on `clearConsultation`.
 */
export const useClientUuid = (): string | null => useConsultationStore((s) => s.clientUuid);

/**
 * Array of chat messages in the active consultation.
 *
 * ⚠ Returns the actual `messages` array reference. Appending a message
 * produces a new array, which re-renders all subscribers. If you only
 * need the count, use `useMessageCount()` (much cheaper). If you only
 * need the last message, use `useLastMessage()`.
 */
export const useMessages = (): ChatMessage[] => useConsultationStore((s) => s.messages);

/**
 * Count of messages in the active consultation (primitive number).
 *
 * Optimized for badges, counters, "1/10 messages" UI — DOES NOT re-render
 * on message content edits, only on add/remove (because length changes).
 */
export const useMessageCount = (): number => useConsultationStore((s) => s.messages.length);

/**
 * The most recent message in the consultation, or `null` if empty.
 *
 * Common uses: "last reply preview" in history sidebar, typing indicator,
 * scroll-to-bottom triggers.
 */
export const useLastMessage = (): ChatMessage | null =>
  useConsultationStore((s) => s.messages[s.messages.length - 1] ?? null);

/**
 * Current consultation status (flat string union — Phase 1 shape).
 *
 * Phase 2 will return a discriminated `ConsultationStatus` union internally,
 * but this string selector continues to work for existing comparisons
 * (`status === 'in_progress'`) — backward-compatible by design.
 */
export const useConsultationStatus = (): 'idle' | 'intake' | 'in_progress' | 'completed' =>
  useConsultationStore((s) => s.status);

/**
 * Boolean — is there an in-progress consultation right now?
 *
 * Used by route guards, navbar indicators, "Resume your consultation"
 * banners. Flips independently of message changes, so renders are minimal.
 */
export const useIsConsultationActive = (): boolean =>
  useConsultationStore((s) => s.status === 'in_progress');

/**
 * Boolean — has the user finished their consultation?
 * Drives "Download report" CTAs and post-consultation upsell modals.
 */
export const useIsConsultationCompleted = (): boolean =>
  useConsultationStore((s) => s.status === 'completed');

/**
 * Boolean — is the user currently in the intake form?
 * Drives the multi-step intake wizard rendering.
 */
export const useIsConsultationIntake = (): boolean =>
  useConsultationStore((s) => s.status === 'intake');

/**
 * Current intake form draft (PII — contains name, age, gender).
 *
 * ⚠ Phase 2 will route this through `createEncryptedStorage`. For now,
 * plain localStorage. Avoid rendering the entire draft into the DOM if
 * not necessary; prefer the narrower `useIntakeFields()` selector below.
 */
export const useIntakeDraft = (): IntakeFormDraft => useConsultationStore((s) => s.intakeDraft);

/**
 * Boolean — has the user filled in all required intake fields?
 *
 * Required = name, age, gender, language all non-empty (after trim).
 * Drives the "Start consultation" button's enabled / disabled state.
 */
export const useIsIntakeComplete = (): boolean =>
  useConsultationStore((s) => {
    const { name, age, gender, language } = s.intakeDraft;
    return (
      name.trim().length > 0 &&
      age.trim().length > 0 &&
      gender.trim().length > 0 &&
      language.trim().length > 0
    );
  });

/**
 * Currently selected AI conversation language code (e.g., 'en', 'hi', 'ta').
 *
 * Distinct from the i18n route locale — this is the user's chosen
 * language for the AI's responses, persisted across consultations.
 */
export const useCurrentLanguage = (): string => useConsultationStore((s) => s.language);

/**
 * Boolean — does the consultation have unsaved changes pending sync?
 *
 * Drives the `beforeunload` warning prompt and the "Saving..." indicator
 * in the header. Set to `false` by `markSaved()` after a successful POST.
 */
export const useHasUnsavedChanges = (): boolean => useConsultationStore((s) => s.hasUnsavedChanges);

/**
 * Composite selector — returns the four intake field values with shallow
 * equality comparison. Re-renders only when any individual field changes
 * (not on intakeDraft object identity changes).
 *
 * Use in the intake form component which displays all four fields together.
 *
 * Why `useShallow`: without it, the inline `(s) => ({...})` selector
 * returns a NEW object reference on every store update, causing Zustand v5
 * to throw "Maximum update depth exceeded" or render-loop. `useShallow`
 * does a key-by-key equality check so re-renders only happen on real change.
 */
export const useIntakeFields = (): {
  name: string;
  age: string;
  gender: string;
  language: string;
} =>
  useConsultationStore(
    useShallow((s) => ({
      name: s.intakeDraft.name,
      age: s.intakeDraft.age,
      gender: s.intakeDraft.gender,
      language: s.intakeDraft.language,
    })),
  );

// ═══════════════════════════════════════════════════════════════
// UI SELECTORS
// ═══════════════════════════════════════════════════════════════

/**
 * Boolean — is the desktop sidebar currently collapsed to icon-only mode?
 * Drives the sidebar width animation and label visibility.
 */
export const useSidebarCollapsed = (): boolean => useUIStore((s) => s.sidebarCollapsed);

/**
 * Boolean — is the consultation history drawer currently open (mobile)?
 */
export const useHistoryDrawerOpen = (): boolean => useUIStore((s) => s.historyDrawerOpen);

/**
 * Last route path the user visited.
 *
 * Used for "Continue where you left off" auto-redirect on app boot.
 * `null` for first-time users or after a hard reset.
 */
export const useLastVisitedRoute = (): string | null => useUIStore((s) => s.lastVisitedRoute);

/**
 * Boolean — has the user dismissed the first-time welcome banner?
 *
 * Persistent across logouts (UX preference, NOT auth state) —
 * `resetAllStores()` deliberately PRESERVES this flag so returning users
 * don't see the onboarding banner again.
 */
export const useWelcomeBannerDismissed = (): boolean => useUIStore((s) => s.welcomeBannerDismissed);

/**
 * Current sort order for the consultation history list.
 */
export const useConsultationSortOrder = (): 'newest' | 'oldest' =>
  useUIStore((s) => s.consultationSortOrder);

// ═══════════════════════════════════════════════════════════════
// ACTION SELECTORS — stable references, never trigger re-renders
// ═══════════════════════════════════════════════════════════════

/**
 * Auth store actions, bundled for ergonomic destructuring.
 *
 * Action function references are STABLE — Zustand never recreates them
 * on state changes — so this hook never causes re-renders. The shallow
 * equality wrapper is still beneficial for type inference and consistency.
 *
 * @example
 * ```tsx
 * function LoginButton() {
 *   const { setUser, setLoading } = useAuthActions();
 *   // setUser and setLoading are stable across renders
 * }
 * ```
 */
export const useAuthActions = (): {
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  setLoading: (loading: boolean) => void;
} =>
  useAuthStore(
    useShallow((s) => ({
      setUser: s.setUser,
      clearUser: s.clearUser,
      updateUser: s.updateUser,
      setLoading: s.setLoading,
    })),
  );

/**
 * Consultation store actions, bundled for chat-UI ergonomics.
 *
 * Mirrors the current `ConsultationState` action surface. Phase 2 may add
 * `setMediaUploadStatus` etc.; existing consumers won't break.
 */
export const useConsultationActions = (): {
  startConsultation: (consultationId: string, clientUuid: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  updateIntakeDraft: (draft: Partial<IntakeFormDraft>) => void;
  setStatus: (status: 'idle' | 'intake' | 'in_progress' | 'completed') => void;
  setLanguage: (language: string) => void;
  clearConsultation: () => void;
  markSaved: () => void;
} =>
  useConsultationStore(
    useShallow((s) => ({
      startConsultation: s.startConsultation,
      addMessage: s.addMessage,
      setMessages: s.setMessages,
      updateIntakeDraft: s.updateIntakeDraft,
      setStatus: s.setStatus,
      setLanguage: s.setLanguage,
      clearConsultation: s.clearConsultation,
      markSaved: s.markSaved,
    })),
  );

/**
 * The full resume-consultation action, exposed separately because its
 * signature is more complex than the bundled actions above (multi-arg).
 *
 * Function reference is stable, so calling this hook never re-renders.
 */
export const useResumeConsultation = (): ConsultationStore['resumeConsultation'] =>
  useConsultationStore((s) => s.resumeConsultation);

/** Type alias for the consultation store — used in `useResumeConsultation` return type. */
type ConsultationStore = ReturnType<typeof useConsultationStore.getState>;

/**
 * UI store actions, bundled for layout components.
 */
export const useUIActions = (): {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLastVisitedRoute: (route: string) => void;
  setHistoryDrawerOpen: (open: boolean) => void;
  dismissWelcomeBanner: () => void;
  setConsultationSortOrder: (order: 'newest' | 'oldest') => void;
} =>
  useUIStore(
    useShallow((s) => ({
      toggleSidebar: s.toggleSidebar,
      setSidebarCollapsed: s.setSidebarCollapsed,
      setLastVisitedRoute: s.setLastVisitedRoute,
      setHistoryDrawerOpen: s.setHistoryDrawerOpen,
      dismissWelcomeBanner: s.dismissWelcomeBanner,
      setConsultationSortOrder: s.setConsultationSortOrder,
    })),
  );
