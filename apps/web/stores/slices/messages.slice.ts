// ═══════════════════════════════════════════════════════════════
// MESSAGES SLICE — Chat messages state for the consultation store
//
// This slice owns:
//   - `messages` array (chat history for the active consultation)
//   - `addMessage` (idempotent — dedupes by ID to survive network retries)
//   - `setMessages` (bulk replace — used on consultation resume from server)
//   - `clearMessages` (wipes the array — used internally by clearConsultation)
//
// Cross-slice writes:
//   - `hasUnsavedChanges` (owned by the consultation-core slice) is flipped
//     to `true` on addMessage, `false` on setMessages — drives the
//     beforeunload-save hook and the "Saving..." indicator.
//
// Why a slice (vs everything in one giant store file):
//   - One concern, one file: messages logic lives in ~120 lines you can
//     fully load in your head. The store file becomes a thin composer.
//   - Independent test surface: unit-tested in isolation in Phase 3.
//   - Streaming support (Phase 2 file 4) layers cleanly on top — the
//     streaming slice writes to messages, this slice doesn't need to know.
//
// Pattern source: Zustand official docs § "Slices Pattern" + Linear's
// 2024 engineering blog post on splitting large Zustand stores.
// ═══════════════════════════════════════════════════════════════

import type { StateCreator } from 'zustand';
import type { ChatMessage } from '../types';
// Type-only import — TypeScript erases this at compile time, so the
// type cycle (consultation.store imports this slice, this slice imports
// the store's type) is resolved without a runtime cycle.
import type { ConsultationStore } from '../consultation.store';

/**
 * The portion of `ConsultationStore` owned by this slice.
 *
 * `messages` is the source of truth for chat history. Components read
 * via the `useMessages()` / `useMessageCount()` / `useLastMessage()`
 * selectors (defined in `stores/selectors.ts`).
 */
export interface MessagesSlice {
  /**
   * Ordered list of messages in the active consultation, oldest first.
   * Empty array when no consultation is active.
   */
  messages: ChatMessage[];

  /**
   * Append a message to the consultation. Dedupes by `message.id` —
   * calling this with a message whose ID already exists is a no-op.
   * This makes the operation safe to call from network-retry handlers
   * (e.g., if a POST /messages succeeds but the response is lost, the
   * UI optimistic-add + later refetch won't double-render).
   *
   * Side effect: sets `hasUnsavedChanges` to `true` so the next save
   * cycle persists this message.
   */
  addMessage: (message: ChatMessage) => void;

  /**
   * Replace the entire messages array (bulk operation).
   * Used on `resumeConsultation` when loading server state, and on
   * any "sync from server" refresh.
   *
   * Side effect: sets `hasUnsavedChanges` to `false` because the new
   * array reflects authoritative server state — nothing pending.
   */
  setMessages: (messages: ChatMessage[]) => void;

  /**
   * Wipe the messages array. Used internally by `clearConsultation`
   * in the core slice; rarely called directly from components.
   *
   * Side effect: sets `hasUnsavedChanges` to `false`.
   */
  clearMessages: () => void;
}

/**
 * Create the messages slice.
 *
 * The slice creator is typed against the FULL `ConsultationStore` so its
 * `set` and `get` can cross-write `hasUnsavedChanges` (which lives in the
 * core slice). The mutator tuple `[['zustand/devtools', never], ...]`
 * enables the 3-arg `set(partial, replace, action)` form for DevTools
 * action labels.
 *
 * Action labels follow the `<domain>/<verb>` convention enforced by
 * Phase 1's `ActionLabel` type — these strings appear in:
 *   - Redux DevTools timeline (dev)
 *   - Sentry breadcrumbs (production crash reports)
 *   - PostHog analytics events (after allowlist filtering)
 */
export const createMessagesSlice: StateCreator<
  ConsultationStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  MessagesSlice
> = (set) => ({
  messages: [],

  addMessage: (message) =>
    set(
      (state) => {
        // Idempotency guard: if a message with this ID is already in the
        // array, return the state unchanged. This makes retry-safe.
        if (state.messages.some((m) => m.id === message.id)) {
          return state;
        }
        return {
          messages: [...state.messages, message],
          hasUnsavedChanges: true,
        };
      },
      false,
      'messages/add',
    ),

  setMessages: (messages) =>
    set({ messages, hasUnsavedChanges: false }, false, 'messages/setBatch'),

  clearMessages: () => set({ messages: [], hasUnsavedChanges: false }, false, 'messages/clear'),
});
