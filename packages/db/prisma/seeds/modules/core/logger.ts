// ═══════════════════════════════════════════════════════════════
// LOGGER — Pino-style structured logger for modules
// JSON output for production, pretty-print for development
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
          ? ` ${JSON.stringify({ ...this.bindings, ...meta })}`
          : '';
      console.log(`${color}[${level.toUpperCase()}]${reset} ${msg}${ctx}`);
    } else {
      console.log(JSON.stringify(record));
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
