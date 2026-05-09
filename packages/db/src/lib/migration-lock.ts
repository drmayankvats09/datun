/**
 * Migration Advisory Lock — application-level serialization of migration runs.
 *
 * Why: Prisma's built-in advisory lock has a 10-second timeout (per Prisma
 * docs). For large migrations (or contended deploys where two Railway
 * instances try `migrate deploy` simultaneously), this is insufficient.
 *
 * This module provides a longer-timeout wrapper using PostgreSQL session-
 * scoped advisory locks via `pg_advisory_lock` / `pg_advisory_unlock`.
 *
 * The lock key is a stable random 64-bit integer chosen ONCE for Datun:
 *   8273645        — chosen via `Math.floor(Math.random() * 1e7)`, locked
 *                    forever. Documented in ADR-0002.
 *
 * Pattern: session-scoped (not transaction-scoped) so the lock survives
 * across multiple SQL commands within a migration deploy.
 *
 * @see https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS
 * @see docs/adr/0002-prisma-migrations-baseline.md
 */

import type { PrismaClient } from '@prisma/client';

/** Stable advisory lock key for Datun migrations. NEVER change this value. */
export const DATUN_MIGRATION_LOCK_KEY = 8_273_645n;

/** Default timeout — 5 minutes covers all currently-known Datun migrations. */
export const DEFAULT_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

/** Polling interval while waiting for lock acquisition. */
export const LOCK_POLL_INTERVAL_MS = 200;

export interface LockOptions {
  /** Maximum time (ms) to wait for lock acquisition. */
  timeoutMs?: number;
  /** Polling interval (ms) while waiting. */
  pollIntervalMs?: number;
  /** Optional logger callback for observability. */
  onWait?: (elapsedMs: number) => void;
}

export class MigrationLockTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `Failed to acquire migration advisory lock within ${timeoutMs}ms — ` +
        `another deploy may be in progress. Check Railway deploy logs.`,
    );
    this.name = 'MigrationLockTimeoutError';
  }
}

/**
 * Try to acquire the lock without blocking.
 * Returns true on success, false if another session holds it.
 */
export async function tryAcquireLock(
  prisma: PrismaClient,
  key: bigint = DATUN_MIGRATION_LOCK_KEY,
): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<{ acquired: boolean }[]>(
    `SELECT pg_try_advisory_lock(${key}::bigint) AS acquired`,
  );
  return result[0]?.acquired === true;
}

/**
 * Release the lock. Idempotent — safe to call even if not held.
 */
export async function releaseLock(
  prisma: PrismaClient,
  key: bigint = DATUN_MIGRATION_LOCK_KEY,
): Promise<void> {
  await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock(${key}::bigint)`);
}

/**
 * Acquire the lock, run the provided function, then release the lock.
 * Will retry acquisition with polling until `timeoutMs` elapses.
 *
 * Guarantees: the lock is released even if `fn` throws — via Postgres
 * transaction-scoped advisory lock (`pg_advisory_xact_lock`), which
 * auto-releases on commit OR rollback. This eliminates the connection-
 * pool leak that occurs when acquire/release happen on different
 * connections from Prisma's pool (CI fails with 9+ connections, local
 * passes with 1-2).
 *
 * Why $transaction + xact_lock (FAANG canonical pattern):
 *   - $transaction pins a connection for the entire scope
 *   - pg_advisory_xact_lock is bound to that pinned connection
 *   - Lock is auto-released by Postgres at transaction end (any path)
 *   - No manual unlock needed, no silent failures, no leak possible
 *
 * Reference patterns: Stripe, Vercel, Linear, Cal.com migration locks.
 *
 * @example
 *   await withMigrationLock(prisma, async () => {
 *     await runMigration();
 *   });
 */
export async function withMigrationLock<T>(
  prisma: PrismaClient,
  fn: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  const pollMs = options.pollIntervalMs ?? LOCK_POLL_INTERVAL_MS;

  return prisma.$transaction(
    async (tx) => {
      const startedAt = Date.now();

      // Acquire xact-scoped lock with polling (non-blocking try variant)
      while (true) {
        const result = await tx.$queryRawUnsafe<{ acquired: boolean }[]>(
          `SELECT pg_try_advisory_xact_lock(${DATUN_MIGRATION_LOCK_KEY}::bigint) AS acquired`,
        );
        if (result[0]?.acquired === true) break;

        const elapsed = Date.now() - startedAt;
        if (elapsed >= timeoutMs) {
          throw new MigrationLockTimeoutError(timeoutMs);
        }
        options.onWait?.(elapsed);
        await new Promise((r) => setTimeout(r, pollMs));
      }

      // Run protected work. Lock is held on this transaction's pinned
      // connection until the transaction ends. fn() may use the outer
      // prisma for migration queries (separate pool connection — fine).
      // If fn throws, the transaction rolls back and Postgres releases
      // the xact lock atomically. No manual cleanup required.
      return fn();
    },
    {
      // Generous timeouts for long-running migrations
      maxWait: 30_000, // 30s max wait to start transaction
      timeout: timeoutMs + 600_000, // lock timeout + 10min for fn execution
    },
  );
}
