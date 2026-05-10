// ═══════════════════════════════════════════════════════════════
// LOGGER — Pino-style structured logger for modules
// JSON output for production, pretty-print for development
// FAANG canonical: errors → stderr, info → stdout (separate streams)
// ═══════════════════════════════════════════════════════════════

import type { ModuleLogger } from './module.types';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class ConsoleLogger implements ModuleLogger {
  constructor(
    private readonly bindings: Record<string, unknown> = {},
    private readonly minLevel: LogLevel = 'info',
    private readonly pretty: boolean = process.env.NODE_ENV !== 'production',
  ) {}

  private write(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) return;

    const record = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...this.bindings,
      ...meta,
    };

    // Errors and warnings to stderr (FAANG convention).
    // Info/debug to stdout. CI captures both, but separation aids grep/log-tools.
    const stream = level === 'error' || level === 'warn' ? 'stderr' : 'stdout';

    if (this.pretty) {
      const color =
        level === 'error'
          ? '\x1b[31m'
          : level === 'warn'
            ? '\x1b[33m'
            : level === 'info'
              ? '\x1b[36m'
              : '\x1b[90m';
      const reset = '\x1b[0m';
      const ctx =
        Object.keys({ ...this.bindings, ...meta }).length > 0
          ? ` ${this.safeStringify({ ...this.bindings, ...meta })}`
          : '';
      const line = `${color}[${level.toUpperCase()}]${reset} ${msg}${ctx}\n`;
      if (stream === 'stderr') process.stderr.write(line);
      else process.stdout.write(line);
    } else {
      const line = this.safeStringify(record) + '\n';
      if (stream === 'stderr') process.stderr.write(line);
      else process.stdout.write(line);
    }
  }

  /** JSON.stringify with cycle/BigInt safety — never throws */
  private safeStringify(obj: unknown): string {
    const seen = new WeakSet<object>();
    try {
      return JSON.stringify(obj, (_k, v) => {
        if (typeof v === 'bigint') return String(v);
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return v;
      });
    } catch (e) {
      return `[Unstringifiable: ${e instanceof Error ? e.message : String(e)}]`;
    }
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.write('debug', msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>): void {
    this.write('info', msg, meta);
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.write('warn', msg, meta);
  }
  error(msg: string, meta?: Record<string, unknown>): void {
    this.write('error', msg, meta);
  }

  child(bindings: Record<string, unknown>): ModuleLogger {
    return new ConsoleLogger({ ...this.bindings, ...bindings }, this.minLevel, this.pretty);
  }
}

export function createLogger(
  bindings: Record<string, unknown> = {},
  minLevel: LogLevel = 'info',
): ModuleLogger {
  return new ConsoleLogger(bindings, minLevel);
}
