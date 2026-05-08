// ═══════════════════════════════════════════════════════════════
// SEED LOGGER — Lightweight wrapper around console
//
// Used by all Phase B-E additions (Wave 7-12 ops modules + CLIs).
// Production logger lives in apps/api/src/lib/logger.ts; this is
// strictly for the seed pipeline (CLI + worker invocations).
//
// Why minimal: seed code runs in 3 contexts — CI, local dev, BullMQ
// worker — each has its own log shipping. We just emit JSON-ish lines
// to stdout/stderr; the host captures them.
// ═══════════════════════════════════════════════════════════════

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, payloadOrMsg: unknown, msg?: string): void {
  const time = new Date().toISOString();
  if (typeof payloadOrMsg === 'string' && msg === undefined) {
    const line = `[${time}] [${level.toUpperCase()}] ${payloadOrMsg}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
    return;
  }
  // Bunyan-style: first arg = payload object, second = message
  const payload = payloadOrMsg as Record<string, unknown>;
  const text = msg ?? '';
  const line = JSON.stringify({ time, level, msg: text, ...payload });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (payloadOrMsg: unknown, msg?: string) => emit('debug', payloadOrMsg, msg),
  info: (payloadOrMsg: unknown, msg?: string) => emit('info', payloadOrMsg, msg),
  warn: (payloadOrMsg: unknown, msg?: string) => emit('warn', payloadOrMsg, msg),
  error: (payloadOrMsg: unknown, msg?: string) => emit('error', payloadOrMsg, msg),
};
