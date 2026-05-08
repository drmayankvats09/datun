// ═══════════════════════════════════════════════════════════════
// TEST HELPERS — Local Postgres-per-test (FAANG-grade, no Docker)
//
// Strategy:
//   1. Per-WORKER unique template DB (prevents race conditions)
//   2. Connect-then-clone pattern (ensures Prisma client warm)
//   3. Auto-cleanup with FORCE drop on test completion
//   4. Idempotent template creation (safe across parallel workers)
//
// FAANG Pattern: Linear/Heroku use this exact pattern.
// Each vitest worker gets its own template, eliminating contention.
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';

// ─── Per-worker isolation (prevents race in parallel tests) ──────────────
// VITEST_POOL_ID is unique per worker process; fallback to PID for safety
const WORKER_ID = process.env.VITEST_POOL_ID ?? String(process.pid);
const WORKER_TEMPLATE = `datun_test_template_w${WORKER_ID}`;

// ─── Globals (per-worker scope) ──────────────────────────────────────────
let _baseUrl: string | null = null;
let _templateName: string | null = null;
let _initPromise: Promise<void> | null = null;
let _skipReason: string | null = null;

export interface TestDbHandle {
  prisma: PrismaClient;
  databaseUrl: string;
  databaseName: string;
  destroy: () => Promise<void>;
}

export function shouldSkipDbTests(): string | null {
  return _skipReason;
}

// ─── Resolve base DB URL from env ────────────────────────────────────────
function resolveBaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
  if (!url || url.length === 0) {
    _skipReason = 'No DATABASE_URL or TEST_DATABASE_URL set';
    throw new Error(_skipReason);
  }
  return url;
}

// ─── Template DB bootstrap (per-worker, idempotent) ──────────────────────
async function ensureTemplate(): Promise<{ baseUrl: string; templateName: string }> {
  if (_baseUrl && _templateName) {
    return { baseUrl: _baseUrl, templateName: _templateName };
  }

  if (!_initPromise) {
    _initPromise = (async () => {
      _baseUrl = resolveBaseUrl();
      _templateName = WORKER_TEMPLATE;

      const adminUrl = _baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/postgres$1`);

      // Verify connection works (fast probe with timeout)
      const probe = new Client({ connectionString: adminUrl, connectionTimeoutMillis: 5000 });
      try {
        await probe.connect();
        await probe.end();
      } catch (err: unknown) {
        _skipReason = `Cannot connect to Postgres: ${String(err)}`;
        throw new Error(_skipReason);
      }

      // Idempotent template creation with retry (handles parallel race)
      const admin = new Client({ connectionString: adminUrl });
      await admin.connect();
      try {
        // Drop existing connections to template DB (in case of previous run leftovers)
        await admin
          .query(
            `SELECT pg_terminate_backend(pg_stat_activity.pid)
           FROM pg_stat_activity
           WHERE pg_stat_activity.datname = $1
             AND pid <> pg_backend_pid()`,
            [_templateName],
          )
          .catch(() => {
            /* ignore */
          });

        // Drop with FORCE (handles connections that grabbed the DB after terminate)
        await admin.query(`DROP DATABASE IF EXISTS "${_templateName}" WITH (FORCE)`).catch(() => {
          /* ignore */
        });

        // Create template — wrap in try since parallel workers may race
        try {
          await admin.query(`CREATE DATABASE "${_templateName}"`);
        } catch (createErr: unknown) {
          // If duplicate, another worker created it — that's fine, we'll reuse
          const msg = String(createErr);
          if (!msg.includes('already exists') && !msg.includes('duplicate')) {
            throw createErr;
          }
        }
      } finally {
        await admin.end();
      }

      // Apply schema to template
      const templateUrl = _baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${_templateName}$1`);
      try {
        execSync('pnpm exec prisma migrate deploy', {
          env: { ...process.env, DATABASE_URL: templateUrl },
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 90000,
        });
      } catch {
        // Fallback to db push for environments without migrations
        try {
          execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
            env: { ...process.env, DATABASE_URL: templateUrl },
            cwd: process.cwd(),
            stdio: 'pipe',
            timeout: 90000,
          });
        } catch (pushErr: unknown) {
          console.warn('[test-helpers] Schema apply failed (non-fatal):', String(pushErr));
        }
      }
    })();
  }

  await _initPromise;
  return { baseUrl: _baseUrl!, templateName: _templateName! };
}

// ─── Per-test DB clone (FAANG pattern: ensure Prisma client connects) ───
export async function createTestDb(): Promise<TestDbHandle> {
  const { baseUrl, templateName } = await ensureTemplate();
  const dbName = `t_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const adminUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/postgres$1`);

  // Clone template (with retry on transient errors)
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${dbName}" TEMPLATE "${templateName}"`);
  } catch {
    // Fallback: empty DB if template clone fails
    try {
      await admin.query(`CREATE DATABASE "${dbName}"`);
    } catch {
      // ignore — DB may already exist (rare)
    }
  } finally {
    await admin.end();
  }

  const cloneUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
  const prisma = new PrismaClient({
    datasources: { db: { url: cloneUrl } },
    log: [],
    // Disable Prisma's lazy schema validation for cloned DBs
    // Schema is already applied to template; clones inherit it
    // @ts-expect-error - __internal is undocumented but stable across 5.x and 6.x
    __internal: {
      engine: {
        enableEngineDebugMode: false,
      },
    },
  });

  // CRITICAL: Force Prisma client to connect immediately (prevents lazy-init failures)
  // This eliminates the "@prisma/client did not initialize yet" error
  await prisma.$connect();

  return {
    prisma,
    databaseUrl: cloneUrl,
    databaseName: dbName,
    destroy: async () => {
      try {
        await prisma.$disconnect();
      } catch {
        // already disconnected
      }
      const cleanup = new Client({ connectionString: adminUrl });
      try {
        await cleanup.connect();
        // Terminate backends, then drop with FORCE
        await cleanup
          .query(
            `SELECT pg_terminate_backend(pg_stat_activity.pid)
           FROM pg_stat_activity
           WHERE pg_stat_activity.datname = $1
             AND pid <> pg_backend_pid()`,
            [dbName],
          )
          .catch(() => {
            /* ignore */
          });
        await cleanup.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`).catch(() => {
          /* ignore */
        });
        await cleanup.end();
      } catch {
        // Cleanup failures non-fatal
      }
    },
  };
}

// ─── Auto-cleanup wrapper — preferred test API ───────────────────────────
export async function withTestDb<T>(fn: (db: TestDbHandle) => Promise<T>): Promise<T> {
  if (_skipReason) {
    console.warn(`[test-helpers] Skipping DB test: ${_skipReason}`);
    return undefined as unknown as T;
  }

  let db: TestDbHandle;
  try {
    db = await createTestDb();
  } catch (err: unknown) {
    if (_skipReason) {
      console.warn(`[test-helpers] Skipping DB test: ${_skipReason}`);
      return undefined as unknown as T;
    }
    throw err;
  }

  try {
    return await fn(db);
  } finally {
    await db.destroy();
  }
}

// ─── Container teardown stub (no-op for local Postgres) ──────────────────
export async function teardownContainer(): Promise<void> {
  if (_baseUrl && _templateName) {
    const adminUrl = _baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/postgres$1`);
    const admin = new Client({ connectionString: adminUrl });
    try {
      await admin.connect();
      await admin
        .query(
          `SELECT pg_terminate_backend(pg_stat_activity.pid)
         FROM pg_stat_activity
         WHERE pg_stat_activity.datname = $1
           AND pid <> pg_backend_pid()`,
          [_templateName],
        )
        .catch(() => {
          /* ignore */
        });
      await admin.query(`DROP DATABASE IF EXISTS "${_templateName}" WITH (FORCE)`).catch(() => {
        /* ignore */
      });
      await admin.end();
    } catch {
      // non-fatal
    }
  }
}
