// apps/web/hooks/queries/use-consultation.ts
// ═══════════════════════════════════════════════════════════════
// useConsultation / useConsultationPdf — Task #47 Phase 2
//
// Full consultation detail — messages, AI assessment, intake fields.
//
// Cache policy:
//   - staleTime 30s: messages can arrive via push (Task #61), so we
//     refetch on focus/mount within 30s of staleness.
//   - The single canonical key (`queryKeys.consultations.detail(id)`)
//     is also targeted by mutation invalidations (send-message,
//     complete-consultation).
//
// `enabled` is gated by `id` truthiness — the hook is safe to call
// before the route param resolves; it simply parks until the id arrives.
//
// useConsultationPdf is a SEPARATE hook because the PDF URL is signed
// with a short TTL (15 min); we don't want a 5-min-stale `useConsultation`
// to keep handing out an already-expired URL.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import type { ConsultationDetail } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const THIRTY_SECONDS_MS = 30_000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

// ─── Detail hook ──────────────────────────────────────────

export function useConsultation(id: string | null | undefined) {
  return useQuery<ConsultationDetail>({
    queryKey: queryKeys.consultations.detail(id ?? ''),
    queryFn: ({ signal }) => api.consultations.detail(id!, { signal }),
    enabled: Boolean(id),
    staleTime: THIRTY_SECONDS_MS,
  });
}

// ─── PDF URL hook ─────────────────────────────────────────

export function useConsultationPdf(id: string | null | undefined) {
  return useQuery<{ url: string; expiresAt: string }>({
    queryKey: queryKeys.consultations.pdf(id ?? ''),
    queryFn: ({ signal }) => api.consultations.pdf(id!, { signal }),
    enabled: Boolean(id),
    // Signed URL TTL is 15 min on the server; we keep the cached value
    // for 10 min (a safety margin) before refetching.
    staleTime: TEN_MINUTES_MS,
  });
}
