// ═══════════════════════════════════════════════════════════════
// STRUCTURED LOGGER — Winston + Better Stack + Secret Redaction
// Every log line includes requestId (when available) for tracing.
// Pattern: Google Cloud Logging, AWS CloudWatch structured logs.
//
// SECURITY: redactSecrets format runs BEFORE every other format step.
// Scans entire log payload (recursively) for known secret patterns
// and replaces with [REDACTED]. Defense layer for accidental logging.
// Pattern: Stripe (4-layer redaction), Linear (Pino redact paths),
// Cloudflare (3-stage pipeline).
// ═══════════════════════════════════════════════════════════════

import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const SECRET_PATTERNS: ReadonlyArray<RegExp> = [
  // Anthropic API keys
  /sk-ant-[a-zA-Z0-9_-]{20,}/g,
  // OpenAI API keys
  /sk-[a-zA-Z0-9]{32,}/g,
  // Stripe keys (live + test)
  /sk_(live|test)_[a-zA-Z0-9]{20,}/g,
  // Stripe webhook signing secrets
  /whsec_[a-zA-Z0-9]{20,}/g,
  // Resend API keys (re_*)
  /re_[a-zA-Z0-9_]{20,}/g,
  // AWS access keys
  /AKIA[A-Z0-9]{16}/g,
  // Bearer tokens in headers
  /Bearer\s+[a-zA-Z0-9_.+/=-]{20,}/g,
  // Generic env-var-like exposures
  /(?:JWT_SECRET|JWT_REFRESH_SECRET|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY|RESEND_API_KEY|UPSTASH_REDIS_REST_TOKEN|WHATSAPP_TOKEN|META_APP_SECRET|GOOGLE_CLIENT_SECRET|LOGTAIL_SOURCE_TOKEN|SENTRY_DSN|DATABASE_URL)\s*[:=]\s*[\w+/=.-]+/gi,
  // password=, password: in JSON-like contexts
  /password['"]?\s*[:=]\s*['"][^'"]+['"]/gi,
  // Generic JWT tokens (3-segment base64)
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];

/**
 * Redact a single string value by replacing all matched secret patterns.
 */
function redactString(value: string): string {
  let result = value;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Recursively walk an object/array and redact all string values.
 * Preserves structure — only the values change.
 *
 * Edge cases handled:
 * - null / undefined: pass through
 * - Buffer / Date: pass through (not strings)
 * - Circular refs: prevented via WeakSet visited tracker
 * - Non-enumerable props: ignored (matches JSON.stringify behavior)
 */
function redactDeep(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (typeof value !== 'object') {
    // number, boolean, bigint, symbol, function — pass through
    return value;
  }

  // Skip Buffer, Date, etc. — they're objects but not log-relevant containers
  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]';
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, seen));
  }

  // Plain object — walk keys
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = redactDeep(val, seen);
  }
  return result;
}

/**
 * Winston format that recursively redacts secrets from the log info payload.
 * Runs FIRST in the format chain so all downstream formats see redacted data.
 */
const redactSecretsFormat = winston.format((info) => {
  // info has special internal symbols (level, message, splat) — preserve them
  // by redacting only the enumerable string-keyed properties.
  for (const key of Object.keys(info)) {
    info[key] = redactDeep(info[key]);
  }
  return info;
});

// ── Transports ──
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      redactSecretsFormat(),
      winston.format.timestamp(),
      process.env['NODE_ENV'] === 'development'
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : winston.format.json(),
    ),
  }),
];

if (process.env['LOGTAIL_SOURCE_TOKEN']) {
  const logtail = new Logtail(process.env['LOGTAIL_SOURCE_TOKEN']);
  transports.push(new LogtailTransport(logtail));
}

// ── Logger Instance ──
export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: winston.format.combine(
    redactSecretsFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: 'datun-api',
    env: process.env['NODE_ENV'] ?? 'production',
  },
  transports,
});

// Expose internals for testing only — DO NOT use in production code
export const __internals = {
  redactString,
  redactDeep,
  SECRET_PATTERNS,
};
