// ═══════════════════════════════════════════════════════════════
// STRUCTURED LOGGER — Winston + Better Stack
// Every log line includes requestId (when available) for tracing.
// Pattern: Google Cloud Logging, AWS CloudWatch structured logs.
// ═══════════════════════════════════════════════════════════════

import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
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

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: winston.format.combine(
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
