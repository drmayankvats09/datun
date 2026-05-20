// apps/web/lib/posthog/types.ts
// ═══════════════════════════════════════════════════════════════
// POSTHOG TYPES — Shared shapes (Task #49)
// ─────────────────────────────────────────────────────────────────
// Single home for browser + server PostHog types. Re-exports
// `FlagMap` from @repo/shared so the web layer never duplicates it.
// ═══════════════════════════════════════════════════════════════

import type { FlagMap as SharedFlagMap, FlagKey } from '@repo/shared';

/** Re-export so consumers can pull from one place. */
export type FlagMap = SharedFlagMap;
export type { FlagKey };

/**
 * Configuration passed to `initPostHog()`. The provider component
 * sources these from `NEXT_PUBLIC_*` env vars.
 */
export interface PostHogConfig {
  readonly apiKey: string;
  readonly host: string;
  /** Default `true`. Set `false` in development to keep dev consoles quiet. */
  readonly autocapture?: boolean;
  /** Bootstrap flag map — wires SSR-evaluated flags into the SDK init. */
  readonly bootstrap?: FlagMap;
}

/**
 * Identification payload for `identify()`. Only fields that PostHog
 * can safely store (no PHI, no clinical content). Other fields go
 * through `capturePostHogEvent` with custom properties.
 */
export interface PostHogIdentify {
  readonly userId: string;
  readonly email?: string;
  readonly role?: string;
  readonly clinicId?: string;
  readonly plan?: string;
  readonly locale?: string;
}
