// apps/web/lib/errors/index.ts
// ═══════════════════════════════════════════════════════════════
// ERROR DOMAIN — Barrel export
//
// Public surface of the error classification + recovery + audit
// layer. Components, hooks, and boundaries should import from
// `@/lib/errors`, NEVER from sub-paths, so internal reorganisation
// is invisible to consumers.
//
// Allowed:    import { categorize, getRecoveryStrategy } from '@/lib/errors'
// Forbidden:  import { categorize } from '@/lib/errors/categorize'
//             import { getRecoveryStrategy } from '@/lib/errors/recovery'
//
// Phase 3 ESLint rule (planned): `no-restricted-imports` blocks
// `@/lib/errors/*` sub-paths, enforces the public surface.
// ═══════════════════════════════════════════════════════════════

// ─── Categorisation ────────────────────────────────────────────
export {
  categorize,
  isFrameworkControlFlow,
  assertNever,
  type ErrorCategory,
  type ErrorSeverity,
  type CategorizedError,
} from './categorize';

// ─── Recovery strategies + backoff ─────────────────────────────
export {
  getRecoveryStrategy,
  computeBackoffMs,
  type RecoveryAction,
  type RecoveryStrategy,
  type BackoffOptions,
} from './recovery';

// ─── Audit logging ─────────────────────────────────────────────
export { logErrorToAudit, getAuditSessionId, type AuditErrorPayload } from './audit-log';
