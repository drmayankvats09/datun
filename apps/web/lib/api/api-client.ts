// apps/web/lib/api/api-client.ts
// ═══════════════════════════════════════════════════════════════
// API CLIENT — Task #47 Phase 1
//
// Typed, namespaced methods for every backend endpoint. Each method
// is a thin wrapper around `authFetch` that fixes the URL, method,
// and return type. Hooks (Phase 2) consume these methods via:
//
//   useQuery({
//     queryKey: queryKeys.consultations.detail(id),
//     queryFn: ({ signal }) => api.consultations.detail(id, { signal }),
//   })
//
// Why methods instead of raw fetch in hooks:
//   - Single point of maintenance when a URL / shape changes
//   - Easy to mock in tests (`vi.spyOn(api.consultations, 'list')`)
//   - Future-proof for React Native (Task #67) — same surface,
//     different storage; eventually promote to `@repo/api-client`.
//   - Reads almost like the OpenAPI spec — onboarding-friendly.
//
// All types route through @repo/shared. NO Prisma in this module.
// Pagination convention: `data: PaginatedData<T> = { items, pagination }`
// inside the envelope. authFetch unwraps `.data`, hooks read `.items`
// and `.pagination` directly.
// ═══════════════════════════════════════════════════════════════

import type {
  // ── Existing in @repo/shared ─────────────────────────
  AuthUser,
  AuthResult,
  MediaAssetDTO,
  LabelingQueueItem,
  LabelingQueueStrategy,
  LabelingStats,
  LabelConflict,
  // ── New in Phase 1 (Files 10-13) ─────────────────────
  ConsultationListItem,
  ConsultationDetail,
  ConsultationFilters,
  PaginatedData,
  StartConsultationInput,
  SendMessageInput,
  SendMessageResponse,
  CompleteConsultationResponse,
  ClinicListItem,
  ClinicDetail,
  ClinicFilters,
  AppointmentDTO,
  BookAppointmentInput,
  CancelAppointmentInput,
  NotificationDTO,
  NotificationListFilters,
} from '@repo/shared';

import { authFetch, type AuthFetchOptions } from './auth-fetch';
import { ENDPOINTS } from './endpoints';

// ─── Per-call context ──────────────────────────────────────

/**
 * Per-call context passed by hooks — primarily for AbortSignal
 * pass-through so TanStack Query's internal cancellation reaches
 * the underlying fetch.
 */
export interface ApiCallContext {
  readonly signal?: AbortSignal;
}

function withCtx(ctx: ApiCallContext | undefined): AuthFetchOptions {
  return ctx?.signal ? { signal: ctx.signal } : {};
}

/**
 * Serialise a flat object into a URL query string. Skips undefined/null,
 * stringifies arrays as repeated keys (?tag=a&tag=b), and JSON-encodes
 * nested objects (rare — used by `nearby: { lat, lng, radiusKm }`).
 */
function toQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, String(v));
    } else if (typeof value === 'object') {
      qs.append(key, JSON.stringify(value));
    } else {
      qs.append(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
const auth = {
  me(ctx?: ApiCallContext): Promise<AuthUser> {
    return authFetch<AuthUser>(ENDPOINTS.auth.me, {
      method: 'GET',
      ...withCtx(ctx),
    });
  },

  logout(ctx?: ApiCallContext): Promise<{ ok: true }> {
    return authFetch<{ ok: true }>(ENDPOINTS.auth.logout, {
      method: 'POST',
      ...withCtx(ctx),
    });
  },

  emailLogin(
    input: { email: string; password: string },
    ctx?: ApiCallContext,
  ): Promise<AuthResult> {
    return authFetch<AuthResult>(ENDPOINTS.auth.emailLogin, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
      ...withCtx(ctx),
    });
  },

  emailSignup(
    input: { email: string; password: string; name: string },
    ctx?: ApiCallContext,
  ): Promise<AuthResult> {
    return authFetch<AuthResult>(ENDPOINTS.auth.emailSignup, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
      ...withCtx(ctx),
    });
  },

  sendOtp(
    input: { phone: string },
    ctx?: ApiCallContext,
  ): Promise<{ sent: true; expiresInSeconds: number }> {
    return authFetch<{ sent: true; expiresInSeconds: number }>(ENDPOINTS.auth.sendOtp, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
      ...withCtx(ctx),
    });
  },

  verifyOtp(input: { phone: string; otp: string }, ctx?: ApiCallContext): Promise<AuthResult> {
    return authFetch<AuthResult>(ENDPOINTS.auth.verifyOtp, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
      ...withCtx(ctx),
    });
  },

  googleExchange(input: { code: string }, ctx?: ApiCallContext): Promise<AuthResult> {
    return authFetch<AuthResult>(ENDPOINTS.auth.googleExchange, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
      ...withCtx(ctx),
    });
  },

  forgotPassword(input: { email: string }, ctx?: ApiCallContext): Promise<{ sent: true }> {
    return authFetch<{ sent: true }>(ENDPOINTS.auth.forgotPassword, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
      ...withCtx(ctx),
    });
  },

  resetPassword(
    input: { token: string; password: string },
    ctx?: ApiCallContext,
  ): Promise<{ reset: true }> {
    return authFetch<{ reset: true }>(ENDPOINTS.auth.resetPassword, {
      method: 'POST',
      body: JSON.stringify(input),
      skipAuth: true,
      ...withCtx(ctx),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSULTATIONS
// ═══════════════════════════════════════════════════════════════
const consultations = {
  list(
    filters: ConsultationFilters,
    ctx?: ApiCallContext,
  ): Promise<PaginatedData<ConsultationListItem>> {
    return authFetch<PaginatedData<ConsultationListItem>>(
      `${ENDPOINTS.consultations.list}${toQueryString(filters as Record<string, unknown>)}`,
      { method: 'GET', ...withCtx(ctx) },
    );
  },

  detail(id: string, ctx?: ApiCallContext): Promise<ConsultationDetail> {
    return authFetch<ConsultationDetail>(ENDPOINTS.consultations.detail(id), {
      method: 'GET',
      ...withCtx(ctx),
    });
  },

  start(input: StartConsultationInput, ctx?: ApiCallContext): Promise<ConsultationDetail> {
    return authFetch<ConsultationDetail>(ENDPOINTS.consultations.create, {
      method: 'POST',
      body: JSON.stringify(input),
      ...withCtx(ctx),
    });
  },

  sendMessage(
    consultationId: string,
    input: SendMessageInput,
    ctx?: ApiCallContext,
  ): Promise<SendMessageResponse> {
    return authFetch<SendMessageResponse>(ENDPOINTS.consultations.sendMessage(consultationId), {
      method: 'POST',
      body: JSON.stringify(input),
      ...withCtx(ctx),
    });
  },

  complete(id: string, ctx?: ApiCallContext): Promise<CompleteConsultationResponse> {
    return authFetch<CompleteConsultationResponse>(ENDPOINTS.consultations.complete(id), {
      method: 'POST',
      ...withCtx(ctx),
    });
  },

  pdf(id: string, ctx?: ApiCallContext): Promise<{ url: string; expiresAt: string }> {
    return authFetch<{ url: string; expiresAt: string }>(ENDPOINTS.consultations.pdf(id), {
      method: 'GET',
      ...withCtx(ctx),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// CLINICS (stubs ready for Task #57 / #59)
// ═══════════════════════════════════════════════════════════════
const clinics = {
  list(filters: ClinicFilters, ctx?: ApiCallContext): Promise<PaginatedData<ClinicListItem>> {
    return authFetch<PaginatedData<ClinicListItem>>(
      `${ENDPOINTS.clinics.list}${toQueryString(filters as Record<string, unknown>)}`,
      { method: 'GET', ...withCtx(ctx) },
    );
  },

  detail(id: string, ctx?: ApiCallContext): Promise<ClinicDetail> {
    return authFetch<ClinicDetail>(ENDPOINTS.clinics.detail(id), {
      method: 'GET',
      ...withCtx(ctx),
    });
  },

  search(query: string, ctx?: ApiCallContext): Promise<readonly ClinicListItem[]> {
    return authFetch<readonly ClinicListItem[]>(
      `${ENDPOINTS.clinics.search}${toQueryString({ q: query })}`,
      { method: 'GET', ...withCtx(ctx) },
    );
  },
};

// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS (stubs ready for Task #59 / #157)
// ═══════════════════════════════════════════════════════════════
const appointments = {
  list(
    filters: {
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
    ctx?: ApiCallContext,
  ): Promise<PaginatedData<AppointmentDTO>> {
    return authFetch<PaginatedData<AppointmentDTO>>(
      `${ENDPOINTS.appointments.list}${toQueryString(filters as Record<string, unknown>)}`,
      { method: 'GET', ...withCtx(ctx) },
    );
  },

  detail(id: string, ctx?: ApiCallContext): Promise<AppointmentDTO> {
    return authFetch<AppointmentDTO>(ENDPOINTS.appointments.detail(id), {
      method: 'GET',
      ...withCtx(ctx),
    });
  },

  book(input: BookAppointmentInput, ctx?: ApiCallContext): Promise<AppointmentDTO> {
    return authFetch<AppointmentDTO>(ENDPOINTS.appointments.create, {
      method: 'POST',
      body: JSON.stringify(input),
      ...withCtx(ctx),
    });
  },

  cancel(id: string, input: CancelAppointmentInput, ctx?: ApiCallContext): Promise<AppointmentDTO> {
    return authFetch<AppointmentDTO>(ENDPOINTS.appointments.cancel(id), {
      method: 'POST',
      body: JSON.stringify(input),
      ...withCtx(ctx),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
const notifications = {
  list(
    filters: NotificationListFilters,
    ctx?: ApiCallContext,
  ): Promise<PaginatedData<NotificationDTO>> {
    return authFetch<PaginatedData<NotificationDTO>>(
      `${ENDPOINTS.notifications.list}${toQueryString(filters as Record<string, unknown>)}`,
      { method: 'GET', ...withCtx(ctx) },
    );
  },

  unreadCount(ctx?: ApiCallContext): Promise<{ count: number }> {
    return authFetch<{ count: number }>(
      `${ENDPOINTS.notifications.list}${toQueryString({ unreadOnly: true, pageSize: 1 })}`,
      { method: 'GET', ...withCtx(ctx) },
    );
  },

  markRead(id: string, ctx?: ApiCallContext): Promise<{ ok: true }> {
    return authFetch<{ ok: true }>(ENDPOINTS.notifications.markRead(id), {
      method: 'POST',
      ...withCtx(ctx),
    });
  },

  markAllRead(ctx?: ApiCallContext): Promise<{ ok: true; count: number }> {
    return authFetch<{ ok: true; count: number }>(ENDPOINTS.notifications.markAllRead, {
      method: 'POST',
      ...withCtx(ctx),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// MEDIA (Task #46 already deployed — typed surface for hooks)
// ═══════════════════════════════════════════════════════════════
const media = {
  asset(id: string, ctx?: ApiCallContext): Promise<MediaAssetDTO> {
    return authFetch<MediaAssetDTO>(ENDPOINTS.media.asset(id), {
      method: 'GET',
      ...withCtx(ctx),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// ADMIN — LABELING (Task #44 — replaces lib/training-api.ts in Phase 3)
// ═══════════════════════════════════════════════════════════════
const labeling = {
  queue(
    params: { strategy: LabelingQueueStrategy; limit: number },
    ctx?: ApiCallContext,
  ): Promise<{
    strategy: LabelingQueueStrategy;
    count: number;
    items: readonly LabelingQueueItem[];
  }> {
    return authFetch<{
      strategy: LabelingQueueStrategy;
      count: number;
      items: readonly LabelingQueueItem[];
    }>(`${ENDPOINTS.admin.labeling.queue}${toQueryString(params as Record<string, unknown>)}`, {
      method: 'GET',
      ...withCtx(ctx),
    });
  },

  submit(
    input: {
      messageId: string;
      qualityScore: number;
      isCorrect: boolean;
      correctionText: string | null;
      clinicalNotes: string | null;
      category: string | null;
    },
    ctx?: ApiCallContext,
  ): Promise<{
    labelId: string;
    created: boolean;
    conflictDetected: boolean;
    conflictDelta: number | null;
  }> {
    return authFetch<{
      labelId: string;
      created: boolean;
      conflictDetected: boolean;
      conflictDelta: number | null;
    }>(ENDPOINTS.admin.labeling.submit, {
      method: 'POST',
      body: JSON.stringify(input),
      ...withCtx(ctx),
    });
  },

  stats(ctx?: ApiCallContext): Promise<LabelingStats> {
    return authFetch<LabelingStats>(ENDPOINTS.admin.labeling.stats, {
      method: 'GET',
      ...withCtx(ctx),
    });
  },

  conflicts(
    limit: number,
    ctx?: ApiCallContext,
  ): Promise<{ count: number; conflicts: readonly LabelConflict[] }> {
    return authFetch<{
      count: number;
      conflicts: readonly LabelConflict[];
    }>(`${ENDPOINTS.admin.labeling.conflicts}${toQueryString({ limit })}`, {
      method: 'GET',
      ...withCtx(ctx),
    });
  },

  triggerJudgeGrade(
    input: { messageId: string; force?: boolean },
    ctx?: ApiCallContext,
  ): Promise<{ judgeRunId: string; parsedScore: number; reasoning: string }> {
    return authFetch<{
      judgeRunId: string;
      parsedScore: number;
      reasoning: string;
    }>(ENDPOINTS.admin.labeling.judgeGrade, {
      method: 'POST',
      body: JSON.stringify(input),
      ...withCtx(ctx),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC SURFACE
// ═══════════════════════════════════════════════════════════════

export const api = {
  auth,
  consultations,
  clinics,
  appointments,
  notifications,
  media,
  labeling,
} as const;

export type Api = typeof api;
