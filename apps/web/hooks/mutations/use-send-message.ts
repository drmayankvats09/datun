// apps/web/hooks/mutations/use-send-message.ts
// ═══════════════════════════════════════════════════════════════
// useSendMessage — Task #47 Phase 2
//
// Send a chat message inside a consultation. Optimistic UX:
//
//   1. User taps Send → message INSTANTLY appears in the transcript
//      with a "sending..." dot (client-generated UUID, temp).
//   2. We POST in the background.
//   3. On success → swap the temp message for the server-confirmed
//      one + append the assistant's reply if returned.
//   4. On error → roll back the temp message, surface a retry toast.
//
// This is the SAME pattern WhatsApp, iMessage, and Slack use.
// Without it, the chat feels 800ms slow on every tap — Datun's
// core UX moat over Practo's clunky 2010-era UI.
//
// Cancellation safety:
//   - We `cancelQueries` on the detail before optimistic write so
//     an in-flight refetch can't clobber our temp entry.
//   - On settle we invalidate the detail key so the server view
//     becomes the source of truth.
//
// Mutation key:
//   - Used by QueryCache global error handler for Sentry tagging
//     ("react-query-mutation" / consultations.send-message).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ChatMessageDTO,
  ConsultationDetail,
  SendMessageInput,
  SendMessageResponse,
} from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

export interface UseSendMessageOptions {
  readonly consultationId: string;
}

export interface SendMessageVars {
  readonly input: SendMessageInput;
}

interface RollbackContext {
  readonly previousDetail: ConsultationDetail | undefined;
}

export function useSendMessage(options: UseSendMessageOptions) {
  const { consultationId } = options;
  const queryClient = useQueryClient();
  const detailKey = queryKeys.consultations.detail(consultationId);

  return useMutation<SendMessageResponse, Error, SendMessageVars, RollbackContext>({
    mutationKey: ['consultations.send-message', consultationId],

    mutationFn: ({ input }) => api.consultations.sendMessage(consultationId, input),

    // ── Optimistic write ──────────────────────────────────
    onMutate: async ({ input }) => {
      // Cancel any in-flight detail refetch so it can't clobber
      // our optimistic entry mid-stream.
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousDetail = queryClient.getQueryData<ConsultationDetail>(detailKey);

      if (previousDetail) {
        const tempMessage: ChatMessageDTO = {
          id: input.clientMessageId,
          role: 'user',
          content: input.content,
          timestamp: Date.now(),
          mediaAssetIds: input.mediaAssetIds,
        };

        queryClient.setQueryData<ConsultationDetail>(detailKey, {
          ...previousDetail,
          messages: [...previousDetail.messages, tempMessage],
        });
      }

      return { previousDetail };
    },

    // ── Replace temp with server-confirmed ────────────────
    onSuccess: (response, { input }) => {
      const current = queryClient.getQueryData<ConsultationDetail>(detailKey);
      if (!current) return;

      const replaced = current.messages.map((m) =>
        m.id === input.clientMessageId ? { ...m, id: response.messageId } : m,
      );

      const withAssistant = response.assistantMessage
        ? [...replaced, response.assistantMessage]
        : replaced;

      queryClient.setQueryData<ConsultationDetail>(detailKey, {
        ...current,
        messages: withAssistant,
      });
    },

    // ── Rollback ──────────────────────────────────────────
    onError: (_error, _vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData<ConsultationDetail>(detailKey, context.previousDetail);
      }
    },

    // ── Settle → server view is truth ─────────────────────
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });
}
