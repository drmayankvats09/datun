// ═══════════════════════════════════════════════════════════════
// CONSULTATION STORE — Composed multi-slice store with full middleware
//
// Architecture (top-down):
//   ConsultationStore = Core + Messages + Intake + Media + Streaming
//                       + WithHydration (Phase 1 mixin)
//
// The "core" slice (defined inline below) owns the cross-slice state:
//   - activeConsultationId, clientUuid, status, hasUnsavedChanges
//   - startConsultation, resumeConsultation, clearConsultation,
//     setStatus, markSaved
//
// The 4 slice files own their own domains and compose flat into one
// store. Backward-compat: every public field + action from the original
// monolithic store is preserved EXACTLY (same name, same signature).
// Components calling `useConsultationStore().messages` etc. keep working.
//
// Middleware stack (outermost → innermost), per Phase 1 doc:
//   logger          → console + Sentry breadcrumbs (all actions)
//   analytics       → PostHog (allowlisted actions only, PII-filtered)
//   devtools        → Redux DevTools (dev only, gated by devtoolsEnabled)
//   persist         → localStorage rehydration with version migration
//     ↓ via withHydration() helper:
//   onRehydrateStorage → flips __hasHydrated to true
//   storage layer (innermost → outermost):
//     createSafeStorage    → iOS Safari quota + SSR safe
//     createEncryptedStorage → AES-GCM 256, per-namespace key
//     createTTLStorage     → 7-day auto-expiry for stale data
//     createJSONStorage    → JSON serialize/deserialize for Zustand
//
// Persisted fields (via partialize):
//   activeConsultationId, clientUuid, messages, intakeDraft,
//   status, language
// NOT persisted:
//   hasUnsavedChanges (always starts false)
//   photos (in-memory only, backend is canonical)
//   streamingMessageId, streamingContent, isStreaming, lastStreamError
//     (mid-stream state — reload = fresh attempt)
//   __hasHydrated, __setHasHydrated (hydration tracking — always reset)
//
// Migration (v1 → v2):
//   Adds: photos: {}, all streaming fields (null/false/empty)
//   Removes: nothing
//   Renames: nothing
//   Existing v1 users see zero data loss.
// ═══════════════════════════════════════════════════════════════

import { create, type StateCreator } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';

import { createSafeStorage } from '@/lib/storage';
import type { ChatMessage, IntakeFormDraft, WithHydration } from './types';

// Phase 1 middleware
import { devtoolsEnabled, devtoolsName } from './devtools-config';
import {
  logger,
  analytics,
  withHydration,
  createHydrationState,
  createTTLStorage,
  createEncryptedStorage,
  getSessionPassphrase,
} from './middleware';

// Phase 2 slices
import { createMessagesSlice, type MessagesSlice } from './slices/messages.slice';
import { createIntakeSlice, type IntakeSlice } from './slices/intake.slice';
import { createMediaSlice, type MediaSlice } from './slices/media.slice';
import { createStreamingSlice, type StreamingSlice } from './slices/streaming.slice';

// ─── Re-exports for backward compat ───────────────────────────
// Existing components import { ChatMessage, IntakeFormDraft } from
// '@/stores' or '@/stores/consultation.store'. Re-export from here so
// those imports keep working without changes.
export type { ChatMessage, IntakeFormDraft };

// ─── Core slice — cross-slice state + lifecycle actions ───────

/**
 * Consultation status — flat string union (Phase 1 compat shape).
 *
 * Phase 2's `types.ts` ships a richer discriminated `ConsultationStatus`,
 * but the consultation store keeps the flat string for backward compat
 * with existing components that do `status === 'in_progress'` checks.
 */
export type ConsultationStatus = 'idle' | 'intake' | 'in_progress' | 'completed';

interface ConsultationCoreSlice {
  /** ID of the currently active consultation, or null. */
  activeConsultationId: string | null;
  /** Stable client UUID for the current session (server-side dedup key). */
  clientUuid: string | null;
  /** Current consultation lifecycle status. */
  status: ConsultationStatus;
  /** Has unsaved local state (drives beforeunload save + indicator). */
  hasUnsavedChanges: boolean;

  /** Begin a new consultation. Clears prior messages and resets state. */
  startConsultation: (consultationId: string, clientUuid: string) => void;

  /** Resume from server state — load messages + status atomically. */
  resumeConsultation: (
    consultationId: string,
    messages: ChatMessage[],
    status: ConsultationStatus,
  ) => void;

  /** Wipe ALL consultation state including messages + intake + photos. */
  clearConsultation: () => void;

  /** Update the lifecycle status (intake → in_progress → completed). */
  setStatus: (status: ConsultationStatus) => void;

  /** Mark all pending changes as saved (called after successful POST). */
  markSaved: () => void;
}

// ─── Full store type — union of core + 4 slices + hydration ───

/**
 * Public type for the composed consultation store. Exported so the
 * slice files can import it (via `import type` to avoid runtime cycle).
 */
export type ConsultationStore = ConsultationCoreSlice &
  MessagesSlice &
  IntakeSlice &
  MediaSlice &
  StreamingSlice &
  WithHydration;

// ─── Core slice creator ───────────────────────────────────────

const createConsultationCoreSlice: StateCreator<
  ConsultationStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  ConsultationCoreSlice
> = (set) => ({
  activeConsultationId: null,
  clientUuid: null,
  status: 'idle',
  hasUnsavedChanges: false,

  startConsultation: (consultationId, clientUuid) =>
    set(
      {
        activeConsultationId: consultationId,
        clientUuid,
        messages: [],
        status: 'in_progress',
        hasUnsavedChanges: false,
        // Reset streaming state in case a prior consultation died mid-stream
        streamingMessageId: null,
        streamingContent: '',
        isStreaming: false,
        lastStreamError: null,
      },
      false,
      'consultation/start',
    ),

  resumeConsultation: (consultationId, messages, status) =>
    set(
      {
        activeConsultationId: consultationId,
        messages,
        status,
        hasUnsavedChanges: false,
      },
      false,
      'consultation/resume',
    ),

  clearConsultation: () =>
    set(
      (state) => ({
        activeConsultationId: null,
        clientUuid: null,
        messages: [],
        // Reset intake but preserve the active language so a returning
        // patient doesn't have to re-pick their language each time.
        intakeDraft: {
          name: '',
          age: '',
          gender: '',
          language: state.language,
        },
        status: 'idle',
        hasUnsavedChanges: false,
        // Wipe media — components owning blob URLs are responsible for
        // revoking them in their effect cleanups (see media slice docs).
        photos: {},
        // Wipe streaming state
        streamingMessageId: null,
        streamingContent: '',
        isStreaming: false,
        lastStreamError: null,
      }),
      false,
      'consultation/clear',
    ),

  setStatus: (status) => set({ status }, false, 'consultation/setStatus'),

  markSaved: () => set({ hasUnsavedChanges: false }, false, 'consultation/markSaved'),
});

// ─── Persist version + migration ──────────────────────────────

const PERSIST_VERSION = 2;

/**
 * Migrate persisted state across versions.
 *
 * v0 → v1 (original): added clientUuid, language, hasUnsavedChanges
 * v1 → v2 (Phase 2):  added photos, all streaming fields
 *
 * Pattern: each migration step is idempotent and only adds defaults
 * for new fields; never removes or renames existing data.
 */
function migrate(persisted: unknown, version: number): Partial<ConsultationStore> {
  // Defensive: handle null/undefined/non-object persisted state.
  const state = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<
    string,
    unknown
  >;

  if (version < 1) {
    // v0 → v1: add fields introduced in v1.
    state.clientUuid = state.clientUuid ?? null;
    state.language = state.language ?? 'en';
    state.hasUnsavedChanges = false;
  }

  if (version < 2) {
    // v1 → v2: add Phase 2 fields (photos + streaming).
    // Photos are in-memory only — initialize to empty map.
    state.photos = {};
    // Streaming state always starts fresh.
    state.streamingMessageId = null;
    state.streamingContent = '';
    state.isStreaming = false;
    state.lastStreamError = null;
  }

  return state as Partial<ConsultationStore>;
}

// ─── Store ────────────────────────────────────────────────────

export const useConsultationStore = create<ConsultationStore>()(
  logger(
    analytics(
      devtools(
        persist(
          // First positional arg to `persist`: the state initializer.
          // We flat-compose hydration mixin + core slice + 4 domain slices.
          (set, get, store) => ({
            // Hydration tracking (Phase 1 mixin) — flips __hasHydrated
            // to true via the onRehydrateStorage callback wired in by
            // `withHydration` below.
            ...createHydrationState<ConsultationStore>(set),
            // Core lifecycle state + actions
            ...createConsultationCoreSlice(set, get, store),
            // Domain slices — flat-composed into one merged state
            ...createMessagesSlice(set, get, store),
            ...createIntakeSlice(set, get, store),
            ...createMediaSlice(set, get, store),
            ...createStreamingSlice(set, get, store),
          }),
          // Second positional arg to `persist`: the persist options object,
          // wrapped by `withHydration` which composes our hydration-flag
          // logic into the onRehydrateStorage callback.
          withHydration<ConsultationStore>({
            name: 'datun-consultation',
            version: PERSIST_VERSION,
            storage: createJSONStorage(() =>
              createTTLStorage(
                createEncryptedStorage(createSafeStorage(), {
                  passphrase: getSessionPassphrase(),
                  namespace: 'datun-consultation',
                }),
                {
                  // 7-day TTL: stale consultation drafts beyond a week are
                  // almost certainly abandoned. Backend retains authoritative
                  // history; local cache just speeds first paint.
                  ttlMs: 7 * 24 * 60 * 60 * 1000,
                },
              ),
            ),

            // Only persist user-meaningful data. Exclude:
            //   - hasUnsavedChanges (always false on fresh load)
            //   - photos (in-memory; backend is source of truth)
            //   - all streaming fields (mid-stream state is not persistable)
            //   - __hasHydrated / __setHasHydrated (hydration tracking)
            partialize: (state) =>
              ({
                activeConsultationId: state.activeConsultationId,
                clientUuid: state.clientUuid,
                messages: state.messages,
                intakeDraft: state.intakeDraft,
                status: state.status,
                language: state.language,
              }) as Partial<ConsultationStore>,

            migrate,
          }),
        ),
        // devtools options
        { name: devtoolsName('Consultation'), enabled: devtoolsEnabled },
      ),
      // analytics options — allowlist of action labels → PostHog event names
      {
        storeName: 'consultation',
        events: {
          // Funnel-event allowlist — what PostHog actually receives.
          // PII is auto-filtered by analytics middleware; here we just
          // pick which actions are "interesting" for product metrics.
          'consultation/start': 'consultation_started',
          'consultation/resume': 'consultation_resumed',
          'consultation/clear': 'consultation_cleared',
          'consultation/setStatus': 'consultation_status_changed',
          'messages/add': 'message_sent',
          'intake/setLanguage': 'language_changed',
          'media/enqueue': 'photo_enqueued',
          'media/setAnalyzed': 'photo_analyzed',
          'streaming/start': 'stream_started',
          'streaming/finish': 'stream_completed',
          'streaming/abort': 'stream_aborted',
        },
      },
    ),
    // logger options
    { name: 'Consultation' },
  ),
);
