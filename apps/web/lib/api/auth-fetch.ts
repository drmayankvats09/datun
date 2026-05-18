// apps/web/lib/api/auth-fetch.ts
// ═══════════════════════════════════════════════════════════════
// AUTH FETCH — Task #47 Phase 1
//
// The SINGLE source of HTTP truth for the API client.
//
// Responsibilities:
//   1. Bearer-token injection (skippable for public endpoints like
//      /api/auth/login, /api/auth/signup, /api/auth/otp/*).
//   2. JSON envelope parsing (`ApiResponse<T>` → unwrap `.data` on
//      success, throw `ApiError` on `{ success: false, error }`).
//   3. Single-flight 401 refresh — when 10 queries fire concurrently
//      and ALL receive 401, we trigger exactly ONE refresh and retry
//      all of them after the new tokens land. Stripe / Auth0 pattern.
//   4. Locale-preserving login redirect on refresh failure (so a
//      Hindi user lands on /hi/login, not /login).
//   5. AbortSignal pass-through — TanStack Query passes its internal
//      AbortSignal here so unmount-during-fetch cleanly cancels
//      without setState-after-unmount warnings.
//   6. Defensive JSON parsing — handles non-JSON 5xx HTML pages from
//      CDNs / edge errors without crashing the React tree.
//
// Two STALE duplicates of this logic exist today and will be
// removed in Phase 3:
//   - `apps/web/lib/auth.ts` (`authFetch` — auth endpoints only)
//   - `apps/web/lib/training-api.ts` (admin endpoints only)
// Phase 1 introduces the canonical version here, both duplicates
// remain operational so the running app is untouched.
//
// Memory rule: NO direct @repo/db imports. All response types flow
// through @repo/shared envelope schema (ApiResponse<T>).
// ═══════════════════════════════════════════════════════════════

import type { ApiResponse } from '@repo/shared';
import { ERROR_CODES } from '@repo/shared';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth';
import { ApiError, NetworkError } from './api-error';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Kept in sync with apps/web/i18n/config.ts.
// If a locale is added/removed there, mirror it here so the post-refresh
// failure redirect preserves the URL prefix.
const VALID_LOCALE_PREFIXES = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'] as const;

// ─── Single-flight refresh ──────────────────────────────────
//
// Concurrent 401s share the SAME Promise. Only one refresh hits the
// network. All concurrent requests retry once after the refresh resolves.
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

    // Server returns `{ success: true, data: { accessToken, refreshToken } }`
    // on success, `{ success: false, error: {...} }` on failure.
    const body = (await res.json()) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;

    if (body.success) {
      setTokens(body.data.accessToken, body.data.refreshToken);
      return true;
    }
  } catch {
    /* fall through — refresh failed, treat as not-refreshed */
  }
  return false;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const pathParts = window.location.pathname.split('/');
  const candidate = pathParts[1] ?? '';
  const localePrefix = (VALID_LOCALE_PREFIXES as readonly string[]).includes(candidate)
    ? `/${candidate}`
    : '';
  const returnTo = encodeURIComponent(window.location.pathname);
  window.location.href = `${localePrefix}/login?returnTo=${returnTo}`;
}

// ─── Public API ─────────────────────────────────────────────

export interface AuthFetchOptions extends RequestInit {
  /**
   * Skip Bearer-token injection. Use for public endpoints
   * (login, signup, OTP send/verify, password forgot/reset,
   * Google code exchange) where sending a stale access token
   * would cause the server to reject the request.
   */
  readonly skipAuth?: boolean;
}

/**
 * Authenticated fetch with envelope unwrap, single-flight refresh,
 * and structured error throws. This is the canonical queryFn for
 * every `useQuery` and `useMutation` in the app.
 *
 * @param path     Absolute path starting with /api/... (or full URL)
 * @param options  Standard RequestInit + `skipAuth` flag + signal
 * @returns        The unwrapped `data` payload from the API envelope
 *
 * @throws {NetworkError}  request never reached the server
 *                          (offline, CORS, DNS, ad-blocker)
 * @throws {ApiError}      server returned `{ success: false, error }`
 *                          or returned a non-JSON body unexpectedly
 * @throws {DOMException}  caller's AbortSignal fired
 *                          (TanStack Query unmount, etc.) — propagated
 *                          unwrapped so consumers can detect it
 */
export async function authFetch<T>(path: string, options: AuthFetchOptions = {}): Promise<T> {
  const { skipAuth, ...init } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // ── First attempt ────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (cause) {
    // Abort is propagated unwrapped — TanStack Query needs the raw
    // DOMException to mark the query as cancelled, not failed.
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    throw new NetworkError('Network request failed', { cause });
  }

  // ── 401 → single-flight refresh → retry once ─────────────
  if (response.status === 401 && !skipAuth && getRefreshToken()) {
    if (!refreshInFlight) {
      refreshInFlight = tryRefreshToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const refreshed = await refreshInFlight;

    if (refreshed) {
      headers.Authorization = `Bearer ${getAccessToken() ?? ''}`;
      try {
        response = await fetch(url, { ...init, headers });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          throw cause;
        }
        throw new NetworkError('Network request failed on retry', { cause });
      }
    } else {
      clearTokens();
      redirectToLogin();
      throw new ApiError({
        statusCode: 401,
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Session expired. Please log in again.',
      });
    }
  }

  // ── Parse envelope ───────────────────────────────────────
  //
  // Defensive against non-JSON 5xx HTML pages from CDNs / edge
  // proxies (Cloudflare 521, 522, 524 are HTML by default).
  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch (cause) {
    throw new ApiError({
      statusCode: response.status,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: `Invalid JSON response from ${path}`,
      cause,
    });
  }

  if (!body.success) {
    throw new ApiError({
      statusCode: response.status,
      code: body.error.code,
      message: body.error.message,
      details: body.error.details,
    });
  }

  return body.data;
}
