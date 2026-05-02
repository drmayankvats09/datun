// ═══════════════════════════════════════════════════════════════
// WORKER LOGGER — Mirrors API logger pattern
// Winston + optional Logtail transport. Same redaction rules.
// ═══════════════════════════════════════════════════════════════

import winston from 'winston';
import { env } from '../config/env.js';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
  }),
];

// Add Logtail in production if token set
if (env.LOGTAIL_SOURCE_TOKEN && env.NODE_ENV === 'production') {
  // Lazy load — avoid Logtail dep in dev/test
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Logtail } = require('@logtail/node');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LogtailTransport } = require('@logtail/winston');
  const logtail = new Logtail(env.LOGTAIL_SOURCE_TOKEN);
  transports.push(new LogtailTransport(logtail));
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'datun-worker' },
  transports,
});
