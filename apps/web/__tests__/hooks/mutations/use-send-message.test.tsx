// apps/web/__tests__/hooks/mutations/use-send-message.test.tsx
// ═══════════════════════════════════════════════════════════════
// useSendMessage — Optimistic Update + Rollback Tests
// Task #47 Phase 3
//
// This is the CORE UX moat of Datun. The test guarantees:
//   1. Temp message lands in the cache INSTANTLY (before network)
//   2. On success: temp ID is swapped for server ID + assistant reply
//      is appended
//   3. On error: cache reverts to the previous state — no ghost
//      messages, no stuck "sending..." indicators
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChatMessageDTO, ConsultationDetail, SendMessageResponse } from '@repo/shared';

// ── Mock api before importing hook ──
vi.mock('@/lib/api', () => ({
  api: {
    consultations: {
      sendMessage: vi.fn(),
    },
  },
}));

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { useSendMessage } from '@/hooks/mutations/use-send-message';

const mockedSend = vi.mocked(api.consultations.sendMessage);

// ─── Fixtures ─────────────────────────────────────────────

const CONSULTATION_ID = 'consult-1';

function baseDetail(): ConsultationDetail {
  return {
    id: CONSULTATION_ID,
    status: 'IN_PROGRESS',
    chiefComplaint: 'Tooth pain',
    diagnosis: null,
    urgency: 'ROUTINE',
    language: 'en',
    createdAt: '2026-05-18T10:00:00.000Z',
    updatedAt: '2026-05-18T10:00:00.000Z',
    hasPdf: false,
    intake: {
      name: 'Test',
      age: 30,
      gender: 'M',
      allergies: null,
      medicalConditions: null,
    },
    messages: [
      {
        id: 'msg-existing',
        role: 'user',
        content: 'Hello',
        timestamp: 1_700_000_000_000,
      },
    ],
    assessment: null,
  };
}

function makeFixture() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.consultations.detail(CONSULTATION_ID), baseDetail());

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

// ─── Tests ────────────────────────────────────────────────

describe('useSendMessage', () => {
  beforeEach(() => {
    mockedSend.mockReset();
  });

  it('optimistic write — temp message appears INSTANTLY in cache', async () => {
    const { queryClient, Wrapper } = makeFixture();

    // Keep the mutation hanging so we can inspect the optimistic state.
    let resolveServer!: (value: SendMessageResponse) => void;
    mockedSend.mockImplementationOnce(
      () =>
        new Promise<SendMessageResponse>((resolve) => {
          resolveServer = resolve;
        }),
    );

    const { result } = renderHook(() => useSendMessage({ consultationId: CONSULTATION_ID }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({
        input: {
          content: 'My gum hurts',
          clientMessageId: 'temp-1',
        },
      });
    });

    // Optimistic update should be visible immediately.
    await waitFor(() => {
      const cached = queryClient.getQueryData<ConsultationDetail>(
        queryKeys.consultations.detail(CONSULTATION_ID),
      );
      expect(cached?.messages).toHaveLength(2);
      expect(cached?.messages[1]?.id).toBe('temp-1');
      expect(cached?.messages[1]?.content).toBe('My gum hurts');
      expect(cached?.messages[1]?.role).toBe('user');
    });

    // Cleanup — resolve the pending promise so React Query can settle.
    act(() => {
      resolveServer({
        messageId: 'server-1',
        clientMessageId: 'temp-1',
        assistantMessage: null,
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('on success — swaps temp ID for server ID and appends assistant reply', async () => {
    const { queryClient, Wrapper } = makeFixture();

    const assistantReply: ChatMessageDTO = {
      id: 'assistant-1',
      role: 'assistant',
      content: 'How long has it hurt?',
      timestamp: 1_700_000_001_000,
    };

    mockedSend.mockResolvedValueOnce({
      messageId: 'server-msg-1',
      clientMessageId: 'temp-1',
      assistantMessage: assistantReply,
    });

    const { result } = renderHook(() => useSendMessage({ consultationId: CONSULTATION_ID }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({
        input: { content: 'My gum hurts', clientMessageId: 'temp-1' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<ConsultationDetail>(
      queryKeys.consultations.detail(CONSULTATION_ID),
    );
    expect(cached?.messages).toHaveLength(3);
    // temp-1 swapped for server id
    expect(cached?.messages[1]?.id).toBe('server-msg-1');
    // assistant reply appended
    expect(cached?.messages[2]).toEqual(assistantReply);
  });

  it('on error — rolls back to previous detail', async () => {
    const { queryClient, Wrapper } = makeFixture();
    const before = queryClient.getQueryData<ConsultationDetail>(
      queryKeys.consultations.detail(CONSULTATION_ID),
    );

    mockedSend.mockRejectedValueOnce(new Error('network died'));

    const { result } = renderHook(() => useSendMessage({ consultationId: CONSULTATION_ID }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({
        input: { content: 'Doomed message', clientMessageId: 'temp-2' },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const after = queryClient.getQueryData<ConsultationDetail>(
      queryKeys.consultations.detail(CONSULTATION_ID),
    );
    // Rollback restored the original messages (length 1, the same fixture).
    expect(after?.messages).toHaveLength(1);
    expect(after?.messages[0]?.id).toBe('msg-existing');
    expect(after).toEqual(before);
  });

  it('cancels in-flight detail queries before optimistic write', async () => {
    const { queryClient, Wrapper } = makeFixture();
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');

    mockedSend.mockResolvedValueOnce({
      messageId: 'server-msg-1',
      clientMessageId: 'temp-3',
      assistantMessage: null,
    });

    const { result } = renderHook(() => useSendMessage({ consultationId: CONSULTATION_ID }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({
        input: { content: 'hi', clientMessageId: 'temp-3' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.consultations.detail(CONSULTATION_ID),
    });
  });
});
