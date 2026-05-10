import * as Sentry from '@sentry/node';
import type { Probe } from './probe.types';

let initialized = false;

function ensureInit(): boolean {
  if (initialized) return true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({ dsn, tracesSampleRate: 0, defaultIntegrations: false });
  initialized = true;
  return true;
}

export const sentryProbe: Probe = {
  name: 'sentry',
  criticality: 'p1',
  timeoutMs: 8_000,
  run: async (signal) => {
    const start = performance.now();
    if (!ensureInit())
      return {
        name: 'sentry',
        status: 'red',
        latencyMs: 0,
        message: 'SENTRY_DSN not set',
        timestamp: new Date(),
      };
    if (signal.aborted) throw signal.reason;
    const eventId = Sentry.captureMessage('datun-seed probe', {
      level: 'info',
      tags: { probe: 'sentry' },
    });
    const flushed = await Sentry.flush(5_000);
    return {
      name: 'sentry',
      status: flushed && eventId ? 'green' : 'red',
      latencyMs: Math.round(performance.now() - start),
      message: flushed ? `Event ${eventId} flushed` : 'Flush timed out',
      details: { eventId, flushed },
      timestamp: new Date(),
    };
  },
};
