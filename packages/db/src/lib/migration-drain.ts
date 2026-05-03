/**
 * Migration Drain — graceful in-flight request drain before schema changes.
 *
 * Why: Even with the expand-contract pattern, brief moments during a
 * migration (lock acquisition, advisory lock window) can cause query
 * failures if the application is actively serving traffic.
 *
 * The drain mechanism waits for the API service to reach an idle state
 * (active query count falls below a threshold) before allowing the
 * migration to proceed. Used in Railway's pre-stop hook on the API
 * container during migrate-deploy windows.
 *
 * @see docs/runbooks/migration-deploy.md
 */

import type { PrismaClient } from '@prisma/client';

export interface DrainOptions {
  /** Maximum time (ms) to wait for active queries to drop below threshold. */
  timeoutMs?: number;
  /** Polling interval (ms). */
  pollIntervalMs?: number;
  /** Threshold for "drained" — queries from THIS application below this count. */
  activeQueryThreshold?: number;
  /** Optional callback for observability. */
  onPoll?: (activeCount: number, elapsedMs: number) => void;
}

export const DEFAULT_DRAIN_TIMEOUT_MS = 30_000;
export const DEFAULT_DRAIN_POLL_MS = 500;
export const DEFAULT_QUERY_THRESHOLD = 1; // self-query is unavoidable

/**
 * Count active queries from this application against the connected database.
 * Excludes idle connections, the polling query itself, and replication.
 */
export async function countActiveQueries(
  prisma: PrismaClient,
  applicationName?: string,
): Promise<number> {
  const filter = applicationName
    ? `AND application_name = '${applicationName.replace(/'/g, "''")}'`
    : '';
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*)::bigint AS count
     FROM pg_stat_activity
     WHERE state = 'active'
       AND backend_type = 'client backend'
       AND pid != pg_backend_pid()
       ${filter}`,
  );
  return Number(result[0]?.count ?? 0n);
}

/**
 * Block until active query count drops to the threshold or timeout elapses.
 * Returns true if drained, false if timed out.
 */
export async function waitForDrain(
  prisma: PrismaClient,
  options: DrainOptions = {},
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;
  const pollMs = options.pollIntervalMs ?? DEFAULT_DRAIN_POLL_MS;
  const threshold = options.activeQueryThreshold ?? DEFAULT_QUERY_THRESHOLD;
  const startedAt = Date.now();

  while (true) {
    const active = await countActiveQueries(prisma);
    options.onPoll?.(active, Date.now() - startedAt);
    if (active <= threshold) return true;

    if (Date.now() - startedAt >= timeoutMs) return false;
    await new Promise((r) => setTimeout(r, pollMs));
  }
}
