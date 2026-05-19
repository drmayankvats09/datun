// apps/web/lib/posthog/server.ts
// ═══════════════════════════════════════════════════════════════
// POSTHOG SERVER — SSR / RSC bootstrap helper (Task #49)
// ─────────────────────────────────────────────────────────────────
// Two responsibilities:
//
//   1. Fetch the user's flag map from the Datun API at render time
//      so the browser bundle receives a "warm" snapshot via the
//      provider's `bootstrap` prop. Eliminates the flicker that
//      happens when the client mounts before /api/flags resolves.
//
//   2. Provide a typed, server-safe `capture()` helper for future
//      RSC analytics events (e.g. signup completion measured on
//      the server, not the optimistic client). Stub today, fleshed
//      out when the funnel dashboard ships.
//
// Why a SEPARATE file from client.ts:
//   - This module is server-only (no 'use client'). Importing
//     anything from `posthog-js` here would break the SSR build.
//   - Keeps the dependency graph trivially clear: a file ending
//     in `server.ts` never reaches the browser bundle.
//
// Reference patterns:
//   - Next.js App Router + PostHog official "server-side bootstrap"
//     pattern (May 2025 docs).
//   - Vercel Edge Config bootstrap (same idea, different vendor).
// ═══════════════════════════════════════════════════════════════

import { cookies, headers } from 'next/headers';
import type { FlagMap } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Fetch the per-user flag map at SSR time. Returns an empty map on
 * failure — the browser then falls back to its own /api/flags call
 * (so worst case = small flicker, never an error page).
 *
 * Uses the user's access token from cookies when present so the
 * server-side response is personalised. Anonymous browsers get the
 * public/default map.
 */
export async function fetchFlagsForSSR(): Promise<FlagMap> {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    // Token may live in cookies (Phase D auth migration) or be
    // forwarded via header in middleware. Both paths tried; absent
    // token is fine (anonymous).
    const token = cookieStore.get('datun_access_token')?.value;
    const forwarded = headerStore.get('authorization');

    const reqHeaders: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      reqHeaders.Authorization = `Bearer ${token}`;
    } else if (forwarded) {
      reqHeaders.Authorization = forwarded;
    }

    // 1.5s timeout — server render must stay snappy. On timeout we
    // simply degrade to an empty map; the browser will fetch fresh.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_BASE}/api/flags`, {
      method: 'GET',
      headers: reqHeaders,
      signal: controller.signal,
      // Server-rendered pages must NEVER cache another user's flags.
      cache: 'no-store',
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) return {};
    const body = (await res.json()) as {
      success?: boolean;
      data?: { flags?: FlagMap };
    };
    return body.success ? (body.data?.flags ?? {}) : {};
  } catch {
    // Network / abort / parse — always return an empty map so the
    // RSC tree keeps rendering. Browser provider will re-fetch.
    return {};
  }
}

/**
 * Server-side event capture stub. Today no-op (analytics events
 * are captured from the browser). Stays here as the future hook
 * for funnel events that must originate on the server (e.g. paid
 * conversion confirmed by the payment webhook).
 */
export function capturePostHogServerEvent(
  _event: string,
  _properties?: Record<string, unknown>,
): void {
  // Intentionally no-op for Phase C. Phase D wires this through
  // the PostHog Node SDK already imported by apps/api.
  void _event;
  void _properties;
}
