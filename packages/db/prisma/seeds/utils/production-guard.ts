// ═══════════════════════════════════════════════════════════════
// PRODUCTION GUARD — 3-LAYER DEFENSE AGAINST ACCIDENTAL PROD SEED
//
// Layer 1: NODE_ENV check (catches careless `NODE_ENV=production pnpm db:seed`)
// Layer 2: DATABASE_URL hostname check (catches `.env` pointing at prod by accident)
// Layer 3: --force-prod flag requirement (deliberate ugly bypass for true emergencies)
//
// Pattern: Stripe internal "RailsEnv guard", AWS CLI --force flag,
//          GitHub's branch protection rules
//
// CRITICAL: Any single layer triggering = seed REFUSES.
// All three must EXPLICITLY pass for seed to proceed.
// ═══════════════════════════════════════════════════════════════

import { SEED_ERROR_CODES } from '../constants/error-codes';
import { ProductionDatabaseError } from '../errors';

/** Hostnames that strongly indicate production. Conservative match list. */
const PRODUCTION_HOST_INDICATORS: readonly RegExp[] = [
  /\.railway\.app$/i,
  /\.railway\.internal$/i,
  /production/i,
  /\.amazonaws\.com$/i, // RDS
  /\.supabase\.co$/i,
  /\.neon\.tech$/i,
  /\.planetscale\.com$/i,
  /\.cockroachlabs\.cloud$/i,
] as const;

/** Hostnames that strongly indicate development. Allowlist. */
const DEVELOPMENT_HOST_INDICATORS: readonly RegExp[] = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^::1$/,
  /^postgres$/i, // docker-compose service name
  /\.local$/i,
] as const;

/**
 * Sanitize DATABASE_URL — strips username, password, query string.
 * Returns just the host for logging. Never returns credentials.
 */
function sanitizeDatabaseUrlHost(databaseUrl: string | undefined): string {
  if (!databaseUrl) return '<unset>';

  try {
    const url = new URL(databaseUrl);
    return url.hostname || '<empty>';
  } catch {
    return '<unparseable>';
  }
}

/** Layer 1: NODE_ENV check */
function checkLayer1NodeEnv(forceProd: boolean): void {
  const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();

  if (nodeEnv === 'production' && !forceProd) {
    throw new ProductionDatabaseError({
      code: SEED_ERROR_CODES.PROD_NODE_ENV,
      layer: 1,
      sanitizedHost: sanitizeDatabaseUrlHost(process.env.DATABASE_URL),
      message:
        'BLOCKED: NODE_ENV=production detected. Seed scripts must NEVER run in production. ' +
        'If you genuinely need to run seed against a production-like environment ' +
        '(e.g., staging refresh from prod snapshot), use the --force-prod flag explicitly.',
    });
  }
}

/** Layer 2: DATABASE_URL hostname check */
function checkLayer2DatabaseUrl(forceProd: boolean): void {
  const databaseUrl = process.env.DATABASE_URL;
  const sanitizedHost = sanitizeDatabaseUrlHost(databaseUrl);

  if (!databaseUrl) {
    throw new ProductionDatabaseError({
      code: SEED_ERROR_CODES.PROD_DATABASE_URL,
      layer: 2,
      sanitizedHost: '<unset>',
      message:
        'BLOCKED: DATABASE_URL is not set. Refusing to seed without explicit DB target. ' +
        'Set DATABASE_URL in your .env file or environment.',
    });
  }

  // Allowlist — if host matches dev indicator, pass immediately.
  const isDevHost = DEVELOPMENT_HOST_INDICATORS.some((pattern) => pattern.test(sanitizedHost));
  if (isDevHost) return;

  // Blocklist — if host matches prod indicator, block.
  const isProdHost = PRODUCTION_HOST_INDICATORS.some((pattern) => pattern.test(sanitizedHost));
  if (isProdHost && !forceProd) {
    throw new ProductionDatabaseError({
      code: SEED_ERROR_CODES.PROD_DATABASE_URL,
      layer: 2,
      sanitizedHost,
      message:
        `BLOCKED: DATABASE_URL host "${sanitizedHost}" looks like production. ` +
        'Seed scripts must NEVER run against production databases. ' +
        'If this is intentional (e.g., staging refresh), use --force-prod explicitly.',
    });
  }

  // Unknown host (neither dev nor prod indicator) — log warning but allow.
  // Future: tighten to require explicit allowlist when team grows.
  if (!forceProd) {
    // eslint-disable-next-line no-console
    console.warn(
      `[seed:guard] WARN: DATABASE_URL host "${sanitizedHost}" not on dev allowlist. ` +
        'Seeding will proceed. If this is production, abort with Ctrl+C immediately.',
    );
  }
}

/** Layer 3: Explicit --force-prod flag for emergency bypass */
function checkLayer3ForceFlag(forceProd: boolean): void {
  if (forceProd) {
    // Force flag was provided — but require additional environment variable
    // as second confirmation. Two factors, no single mistake can bypass.
    const ack = process.env.SEED_PROD_ACK;
    if (ack !== 'I_UNDERSTAND_THIS_WILL_DESTROY_PRODUCTION_DATA') {
      throw new ProductionDatabaseError({
        code: SEED_ERROR_CODES.PROD_NO_FORCE_FLAG,
        layer: 3,
        sanitizedHost: sanitizeDatabaseUrlHost(process.env.DATABASE_URL),
        message:
          'BLOCKED: --force-prod flag requires SEED_PROD_ACK environment variable to be set ' +
          'to exactly "I_UNDERSTAND_THIS_WILL_DESTROY_PRODUCTION_DATA". ' +
          'This is a deliberate two-factor confirmation to prevent accidental prod seeds.',
      });
    }

    // eslint-disable-next-line no-console
    console.error('═'.repeat(72));
    // eslint-disable-next-line no-console
    console.error('🚨 SEED RUNNING WITH --force-prod FLAG');
    // eslint-disable-next-line no-console
    console.error('   Target host:', sanitizeDatabaseUrlHost(process.env.DATABASE_URL));
    // eslint-disable-next-line no-console
    console.error('   This will mutate the target database.');
    // eslint-disable-next-line no-console
    console.error('   You have 5 seconds to abort with Ctrl+C.');
    // eslint-disable-next-line no-console
    console.error('═'.repeat(72));
  }
}

/** Synchronous sleep helper for the 5-second abort window */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * MAIN ENTRY POINT — call before any DB mutation in seed.
 *
 * @param options.forceProd If true, attempts to bypass guards (still requires SEED_PROD_ACK env var)
 * @throws {ProductionDatabaseError} if any guard layer triggers
 */
export async function assertNotProduction(options: { forceProd?: boolean } = {}): Promise<void> {
  const forceProd = options.forceProd === true;

  // All three layers run sequentially. First trigger throws.
  checkLayer1NodeEnv(forceProd);
  checkLayer2DatabaseUrl(forceProd);
  checkLayer3ForceFlag(forceProd);

  // If --force-prod was used, give 5-second abort window.
  if (forceProd) {
    await sleep(5_000);
  }
}

/**
 * Test-only utility — exposes internals for unit tests without
 * weakening the runtime guard. Pattern: Stripe's _internalUtils export.
 */
export const __test_internals__ = {
  sanitizeDatabaseUrlHost,
  checkLayer1NodeEnv,
  checkLayer2DatabaseUrl,
  checkLayer3ForceFlag,
  PRODUCTION_HOST_INDICATORS,
  DEVELOPMENT_HOST_INDICATORS,
};
