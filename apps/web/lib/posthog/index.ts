// apps/web/lib/posthog/index.ts
// ═══════════════════════════════════════════════════════════════
// @/lib/posthog — Public surface (Task #49)
// ─────────────────────────────────────────────────────────────────
// Consumers import from here only. Internal split (client / server /
// types) stays an implementation detail.
//
// Browser code:    import { initPostHog, capturePostHogEvent } from '@/lib/posthog'
// Server code:     import { fetchFlagsForSSR } from '@/lib/posthog/server'
//                  (kept on a sub-path so Next.js tree-shakes correctly)
// ═══════════════════════════════════════════════════════════════

export {
  initPostHog,
  capturePostHogEvent,
  identifyPostHogUser,
  resetPostHogIdentity,
  reloadPostHogFlags,
  overridePostHogFlag,
} from './client';

export type { FlagMap, FlagKey, PostHogConfig, PostHogIdentify } from './types';
