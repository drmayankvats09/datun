// ═══════════════════════════════════════════════════════════════
// TRAINING API CLIENT — Task #44 Phase 3
//
// Typed client for /api/admin/labeling/* endpoints.
// Mirrors authFetch pattern from lib/auth.ts (single-flight refresh,
// 401 retry, locale-preserving logout redirect).
//
// FAANG principles applied:
//   - All inputs validated by Zod on the backend, so we trust shape
//     at TS level (no runtime parse here — caller can if needed)
//   - Bearer token attached automatically (auth.ts manages tokens)
//   - 401 → single-flight refresh → retry once → if still fails, redirect
//   - Network failures surfaced as typed Result objects (no thrown rejections
//     for "expected" errors like 401/403/404)
//
// @see apps/api/src/routes/admin/labeling.router.ts — backend endpoints
// @see packages/shared/src/types/training.ts — shared types
// ═══════════════════════════════════════════════════════════════

import type {
  LabelingQueueItem,
  LabelingQueueStrategy,
  LabelingStats,
  LabelConflict,
} from '@repo/shared';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Response envelope ─────────────────────────────────────────

interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
}

interface ApiFailure {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ─── Single-flight refresh (mirrors lib/auth.ts) ───────────────

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = (await res.json()) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (data.success) {
      setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    }
  } catch {
    /* fallthrough to false */
  }
  return false;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const pathParts = window.location.pathname.split('/');
  const possibleLocale = pathParts[1];
  const validLocales = ['hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'];
  const localePrefix = validLocales.includes(possibleLocale ?? '') ? `/${possibleLocale}` : '';
  window.location.href = `${localePrefix}/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
}

// ─── Authenticated fetch with auto-retry ───────────────────────

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE}/api/admin${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    if (!refreshInFlight) {
      refreshInFlight = tryRefreshToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const refreshed = await refreshInFlight;
    if (refreshed) {
      headers.Authorization = `Bearer ${getAccessToken()}`;
      const retryRes = await fetch(url, { ...options, headers });
      return (await retryRes.json()) as ApiResponse<T>;
    }
    clearTokens();
    redirectToLogin();
  }

  return (await res.json()) as ApiResponse<T>;
}

// ─── Public API surface ────────────────────────────────────────

export interface QueueResponse {
  readonly strategy: LabelingQueueStrategy;
  readonly count: number;
  readonly items: readonly LabelingQueueItem[];
}

/** GET /api/admin/labeling/queue?strategy=&limit= */
export async function fetchLabelingQueue(params: {
  strategy: LabelingQueueStrategy;
  limit: number;
}): Promise<ApiResponse<QueueResponse>> {
  const query = new URLSearchParams({
    strategy: params.strategy,
    limit: String(params.limit),
  });
  return adminFetch<QueueResponse>(`/labeling/queue?${query.toString()}`, { method: 'GET' });
}

export interface SubmitLabelInput {
  readonly messageId: string;
  readonly qualityScore: number; // 1-5
  readonly isCorrect: boolean;
  readonly correctionText: string | null;
  readonly clinicalNotes: string | null;
  readonly category: string | null;
}

export interface SubmitLabelResponse {
  readonly labelId: string;
  readonly created: boolean;
  readonly conflictDetected: boolean;
  readonly conflictDelta: number | null;
}

/** POST /api/admin/labeling/submit */
export async function submitLabel(
  body: SubmitLabelInput,
): Promise<ApiResponse<SubmitLabelResponse>> {
  return adminFetch<SubmitLabelResponse>('/labeling/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET /api/admin/labeling/stats */
export async function fetchLabelingStats(): Promise<ApiResponse<LabelingStats>> {
  return adminFetch<LabelingStats>('/labeling/stats', { method: 'GET' });
}

export interface ConflictsResponse {
  readonly count: number;
  readonly conflicts: readonly LabelConflict[];
}

/** GET /api/admin/labeling/conflicts?limit= */
export async function fetchConflicts(limit: number): Promise<ApiResponse<ConflictsResponse>> {
  return adminFetch<ConflictsResponse>(`/labeling/conflicts?limit=${limit}`, { method: 'GET' });
}

/** POST /api/admin/labeling/judge/grade — manual single-message judge run */
export async function triggerJudgeGrade(
  messageId: string,
  force = false,
): Promise<ApiResponse<{ judgeRunId: string; parsedScore: number; reasoning: string }>> {
  return adminFetch('/labeling/judge/grade', {
    method: 'POST',
    body: JSON.stringify({ messageId, force }),
  });
}
