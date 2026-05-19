// ═══════════════════════════════════════════════════════════════
// STREAMING SLICE — Real-time AI response streaming state
//
// Tracks the in-progress streaming of an AI assistant message as
// tokens arrive from the backend SSE / WebSocket connection.
//
// Lifecycle:
//   1. User sends a message → addMessage(user-msg)
//   2. Client starts the stream → startStreaming(assistantMsgId)
//      - State: { streamingMessageId: id, streamingContent: '',
//                 isStreaming: true }
//   3. Each token arrives → appendStreamingContent(chunk)
//      - State: { streamingContent: streamingContent + chunk }
//   4. Stream completes → finishStreaming()
//      - The streaming message gets committed to `messages` via the
//        caller (NOT this slice — separation of concerns; this slice
//        only tracks the in-flight buffer).
//      - State: { streamingMessageId: null, streamingContent: '',
//                 isStreaming: false }
//   5. Stream errors → abortStreaming(errorMessage)
//      - State: { streamingMessageId: null, isStreaming: false,
//                 lastStreamError: '...' }
//
// Why a separate slice (vs storing partial content INSIDE the messages
// array's last entry):
//   - Performance: appending a token to a 50-message array forces
//     React to re-process the entire messages array on every token.
//     With a separate `streamingContent` field, only the streaming
//     bubble re-renders per token; existing messages stay untouched.
//   - Commit point clarity: a stream isn't truly part of the
//     consultation until it completes successfully. Storing it as
//     "pending" outside the canonical array makes that distinction
//     visible in the code.
//
// Persistence:
//   This slice is INTENTIONALLY NOT persisted (excluded by partialize
//   in consultation.store.ts). If the page reloads mid-stream, the
//   stream is gone — the user sees the partial message disappear
//   and can resend. This is the simplest correct behavior; bringing
//   back a half-stream from localStorage would be confusing UX.
//
// Wiring (Phase 2 here, callsite in Task #65):
//   - `apps/web/hooks/use-stream-completion.ts` (NEW in Task #65) will
//     open the SSE connection and drive these actions.
//   - The streaming "typing cursor" component reads `isStreaming` +
//     `streamingContent` via the `useIsStreaming()` / `useStreamingContent()`
//     selectors (added in Phase 3 selectors.ts update).
// ═══════════════════════════════════════════════════════════════

import type { StateCreator } from 'zustand';
import type { ConsultationStore } from '../consultation.store';

/**
 * The portion of `ConsultationStore` owned by this slice.
 */
export interface StreamingSlice {
  /**
   * ID of the message currently being streamed, or `null` if no stream
   * is active. When the stream completes, the calling code adds a fully-
   * formed `ChatMessage` with this ID to `messages` and resets to `null`.
   */
  streamingMessageId: string | null;

  /**
   * Accumulated streaming content so far. Tokens are appended via
   * `appendStreamingContent`. Cleared on `startStreaming` (new stream)
   * and `finishStreaming` / `abortStreaming` (stream ends).
   */
  streamingContent: string;

  /**
   * Convenience boolean — true while a stream is active.
   * Derivable from `streamingMessageId !== null` but explicit field
   * avoids `useShallow` overhead in the common-case selector.
   */
  isStreaming: boolean;

  /**
   * Error message from the last stream failure, or `null`. Stays set
   * after `abortStreaming` so the UI can surface a toast / inline
   * error. Cleared on the next `startStreaming`.
   */
  lastStreamError: string | null;

  /**
   * Begin streaming a new assistant message. The caller chooses the ID
   * (typically a fresh UUID) and that same ID will be used when the
   * final committed message is added to `messages`.
   *
   * Resets accumulated content and prior errors.
   */
  startStreaming: (messageId: string) => void;

  /**
   * Append a token / chunk to the streaming buffer. Called once per
   * SSE event from the backend stream.
   *
   * No-op if no stream is active (defensive — protects against late
   * arrivals after `abortStreaming`).
   */
  appendStreamingContent: (chunk: string) => void;

  /**
   * Finish the current stream cleanly. Resets all streaming state.
   * The CALLER is responsible for committing the completed content
   * as a `ChatMessage` via `addMessage` BEFORE calling this — otherwise
   * the content is lost.
   *
   * Pattern in the caller:
   * ```ts
   * const fullContent = useConsultationStore.getState().streamingContent;
   * addMessage({ id: streamingMessageId, role: 'assistant',
   *              content: fullContent, timestamp: Date.now() });
   * finishStreaming();
   * ```
   */
  finishStreaming: () => void;

  /**
   * Abort the current stream with an error. Resets streaming state and
   * sets `lastStreamError` so the UI can display it.
   *
   * Any partial content is discarded — a half-message is worse UX than
   * "stream failed, please retry" with a fresh attempt button.
   */
  abortStreaming: (errorMessage: string) => void;
}

export const createStreamingSlice: StateCreator<
  ConsultationStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  StreamingSlice
> = (set) => ({
  streamingMessageId: null,
  streamingContent: '',
  isStreaming: false,
  lastStreamError: null,

  startStreaming: (messageId) =>
    set(
      {
        streamingMessageId: messageId,
        streamingContent: '',
        isStreaming: true,
        lastStreamError: null,
      },
      false,
      'streaming/start',
    ),

  appendStreamingContent: (chunk) =>
    set(
      (state) => {
        // Defensive: drop tokens that arrive after the stream was
        // aborted or finished (e.g., last-mile network buffer flush).
        if (!state.isStreaming) return state;
        // Empty chunks are a no-op (avoids spurious renders).
        if (chunk.length === 0) return state;
        return {
          streamingContent: state.streamingContent + chunk,
        };
      },
      false,
      'streaming/append',
    ),

  finishStreaming: () =>
    set(
      {
        streamingMessageId: null,
        streamingContent: '',
        isStreaming: false,
        // Preserve lastStreamError = null (already null in happy path).
      },
      false,
      'streaming/finish',
    ),

  abortStreaming: (errorMessage) =>
    set(
      {
        streamingMessageId: null,
        streamingContent: '',
        isStreaming: false,
        lastStreamError: errorMessage,
      },
      false,
      'streaming/abort',
    ),
});
