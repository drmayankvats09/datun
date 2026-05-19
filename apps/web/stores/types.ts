// ═══════════════════════════════════════════════════════════════
// SHARED STATE TYPES — Cross-store type definitions
//
// Why a separate file (vs inlining in each store):
// - Discriminated unions and mixins are used by multiple stores,
//   middlewares, and selectors — single source of truth here.
// - Prevents circular imports between store files
//   (e.g., reset.ts imports all 3 stores; selectors.ts too).
// - Pattern: Linear engineering — "Types as documentation".
//
// Phase 1 ships the type definitions. Phase 2 migrates the stores
// to use them internally. Public store shapes stay backward-compatible.
// ═══════════════════════════════════════════════════════════════

import type { AuthUser } from '@/lib/auth';

// ─── Hydration tracking ───────────────────────────────────────

/**
 * Mixin interface for stores that track their persist hydration state.
 *
 * Components reading persisted state should check `__hasHydrated` before
 * rendering — this prevents the SSR ↔ client mismatch flash where a user
 * briefly sees "logged out" state before persist rehydrates them.
 *
 * Implemented by `with-hydration.middleware.ts` which wires the flag
 * into Zustand's persist `onRehydrateStorage` callback.
 *
 * The double-underscore prefix is convention for "internal, not for
 * direct component use" — components should use `useStoreHydration(store)`
 * (Phase 2) which is the typed reader hook.
 */
export interface WithHydration {
  /** `true` once persist middleware has loaded state from storage. */
  __hasHydrated: boolean;
  /** Internal — called by onRehydrateStorage. Not for component code. */
  __setHasHydrated: (value: boolean) => void;
}

// ─── Action labels ────────────────────────────────────────────

/**
 * Standard action label format: `<domain>/<verb>` (lowercase, slash-separated).
 *
 * Used as the third argument to Zustand's `set(state, replace, action)`
 * call. Powers Redux DevTools action names AND `logger.middleware` Sentry
 * breadcrumb categories.
 *
 * @example 'auth/setUser', 'consultation/addMessage', 'ui/toggleSidebar'
 */
export type ActionLabel = `${string}/${string}`;

// ─── Consultation state machine ───────────────────────────────

/**
 * Consultation status as a discriminated union.
 *
 * State transitions:
 *   idle → intake → in_progress → completed
 *   (any) → idle (via clearConsultation)
 *
 * Why discriminated union (vs the current flat string + nullable fields):
 * - TypeScript compiler enforces `activeConsultationId` presence in
 *   `in_progress` and `completed` — impossible states become impossible.
 * - Switch statements get exhaustive type inference for free.
 * - Refactor safety: adding a new status forces every consumer to handle it.
 *
 * Phase 1 ships the type. Phase 2 migrates consultation.store.ts to use
 * it internally while keeping the existing string union (`status: 'idle' | ...`)
 * as a derived public property for back-compat with existing components.
 */
export type ConsultationStatus =
  | { state: 'idle' }
  | { state: 'intake' }
  | {
      state: 'in_progress';
      activeConsultationId: string;
      clientUuid: string;
    }
  | {
      state: 'completed';
      activeConsultationId: string;
      reportUrl: string | null;
    };

/**
 * Flat status string — the current consultation.store.ts shape.
 *
 * Phase 1 compat. Phase 2 will derive this from the discriminated
 * `ConsultationStatus` so both shapes can coexist during migration.
 */
export type ConsultationStatusFlat = 'idle' | 'intake' | 'in_progress' | 'completed';

// ─── Chat message ─────────────────────────────────────────────

/**
 * Single message in a consultation conversation.
 *
 * Mirrors the `ChatMessage` interface currently in `consultation.store.ts`.
 * Re-exported here for use by selectors, analytics middleware, and Phase 2
 * slice extraction — without forcing consumers to import from the store file.
 */
export interface ChatMessage {
  /** Stable message ID — used for dedup and React keys. */
  id: string;
  /** Author role — drives message bubble styling. */
  role: 'user' | 'assistant' | 'system';
  /** Message text content (markdown allowed). */
  content: string;
  /** Unix epoch ms — for sort + age display. */
  timestamp: number;
}

// ─── Intake draft ─────────────────────────────────────────────

/**
 * Patient intake form draft.
 *
 * ⚠ Contains PII (name, age, gender). Persists across page reloads via
 * Zustand persist + localStorage.
 *
 * Phase 1 keeps the current plain-localStorage persistence (no behavior
 * change). Phase 2 will route this through `createEncryptedStorage` for
 * DPDP at-rest compliance.
 */
export interface IntakeFormDraft {
  /** Patient name (full or first only — UI doesn't separate). */
  name: string;
  /** Patient age — stored as string for free-text entry, parsed on submit. */
  age: string;
  /** Patient gender — free-text for inclusivity (M/F/Other/etc.). */
  gender: string;
  /** Preferred consultation language code (e.g., 'en', 'hi', 'ta'). */
  language: string;
}

// ─── Toast (UI store — Phase 2 will add these fields) ─────────

/**
 * Toast notification descriptor.
 *
 * Phase 1 ships the type so analytics middleware and selectors can
 * reference it. Phase 2 will add `toasts: Toast[]` state to ui.store
 * and wire up the rendering layer with Framer Motion (Task #50).
 */
export interface Toast {
  /** Unique ID — used for React keys and programmatic dismiss. */
  id: string;
  /** Visual variant — drives icon + color + a11y role. */
  variant: 'success' | 'error' | 'info' | 'warning';
  /** Bold heading line of the toast. */
  title: string;
  /** Optional secondary line shown below the title. */
  description?: string;
  /**
   * Auto-dismiss timeout in ms.
   * `null` = persistent until user dismisses (e.g., "Save failed — retry?").
   */
  durationMs: number | null;
  /** Unix epoch ms — for age-based grouping in stacks. */
  createdAt: number;
}

// ─── Modal (UI store — Phase 2 will add these fields) ─────────

/**
 * Modal identifier — finite type-safe enum for the single-active-modal pattern.
 *
 * Phase 2 will add `activeModal: ModalId | null` state to ui.store.
 *
 * Single-active rule (vs allowing modal stacks) prevents the classic
 * "modal-over-modal" UX hell that plagues most enterprise dashboards.
 * Stripe Dashboard, Linear, Notion all enforce single-active.
 *
 * Adding a new modal:
 *   1. Add the literal here (TypeScript compiler forces handling everywhere)
 *   2. Add the component to `components/ui/modals/`
 *   3. Add the routing entry in the modal renderer (Phase 2)
 */
export type ModalId =
  | 'logout-confirm'
  | 'delete-consultation-confirm'
  | 'language-picker'
  | 'photo-upload'
  | 'emergency-contact'
  | 'feedback-form';

// ─── Re-exports ───────────────────────────────────────────────

export type { AuthUser };
