// apps/web/hooks/queries/use-media-asset.ts
// ═══════════════════════════════════════════════════════════════
// useMediaAsset — Task #47 Phase 2
//
// Single media asset (image, PDF, etc.) by ID with signed CDN URL.
//
// Used by:
//   - Consultation transcript replay (existing) — display uploaded photos
//   - Task #58  PDF prescription viewer
//   - Task #61  referral graphics
//
// Cache policy:
//   - staleTime 10 min: signed URLs are 1-hour TTL on the server side;
//     we refresh well before expiry to avoid 403s on the <img> tag.
//   - `enabled` gated by id so callers can pass id-or-null safely.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import type { MediaAssetDTO } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function useMediaAsset(id: string | null | undefined) {
  return useQuery<MediaAssetDTO>({
    queryKey: queryKeys.media.asset(id ?? ''),
    queryFn: ({ signal }) => api.media.asset(id!, { signal }),
    enabled: Boolean(id),
    staleTime: TEN_MINUTES_MS,
  });
}
