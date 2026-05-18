// apps/web/hooks/queries/use-prescriptions.ts
// ═══════════════════════════════════════════════════════════════
// usePrescriptions / usePrescriptionDetail — Task #47 Phase 2 (stub)
//
// PDF prescription list and detail with signed-URL refresh.
//
// Future: Task #58 wires backend (BullMQ generates PDFs via Puppeteer,
// uploads to R2 — Task #46 done). Types live HERE temporarily; will
// move to `@repo/shared/types/prescription.ts` on Task #58.
//
// Polling pattern:
//   When `status === 'PENDING'`, the detail query refetches every 2s
//   until status flips to `READY` or `FAILED`. Stripe webhook-status
//   pattern but client-driven (no SSE needed for the MVP).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import { authFetch, ENDPOINTS } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const ONE_MINUTE_MS = 60_000;
const TWO_SECONDS_MS = 2_000;

// ─── Temporary local DTOs (move to @repo/shared on Task #58) ──

export type PrescriptionStatus = 'PENDING' | 'READY' | 'FAILED';

export interface PrescriptionListItem {
  readonly id: string;
  readonly consultationId: string;
  readonly diagnosis: string;
  readonly status: PrescriptionStatus;
  readonly createdAt: string;
}

export interface PrescriptionDetail extends PrescriptionListItem {
  readonly pdfUrl: string | null;
  readonly pdfExpiresAt: string | null;
  readonly medications: readonly {
    readonly salt: string;
    readonly dose: string;
    readonly frequency: string;
    readonly duration: string;
  }[];
}

// ─── List ─────────────────────────────────────────────────

export function usePrescriptions() {
  return useQuery<readonly PrescriptionListItem[]>({
    queryKey: queryKeys.prescriptions.lists(),
    queryFn: ({ signal }) =>
      authFetch<readonly PrescriptionListItem[]>(ENDPOINTS.prescriptions.list, {
        method: 'GET',
        signal,
      }),
    staleTime: ONE_MINUTE_MS,
  });
}

// ─── Detail (with conditional polling) ────────────────────

export function usePrescriptionDetail(id: string | null | undefined) {
  return useQuery<PrescriptionDetail>({
    queryKey: queryKeys.prescriptions.detail(id ?? ''),
    queryFn: ({ signal }) =>
      authFetch<PrescriptionDetail>(ENDPOINTS.prescriptions.detail(id!), {
        method: 'GET',
        signal,
      }),
    enabled: Boolean(id),
    staleTime: ONE_MINUTE_MS,
    // Poll every 2s while PDF generation is in flight; stop once ready.
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? TWO_SECONDS_MS : false),
  });
}
