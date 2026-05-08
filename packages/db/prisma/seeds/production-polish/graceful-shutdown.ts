// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN — SIGINT/SIGTERM handler with cleanup chain
// Pattern: Kubernetes terminationGracePeriodSeconds — drain before exit
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { flushBetterStackLogs } from './better-stack-logger';

export type ShutdownHook = () => Promise<void> | void;

const hooks: ShutdownHook[] = [];
let shuttingDown = false;
let shutdownTimer: NodeJS.Timeout | null = null;

export function registerShutdownHook(hook: ShutdownHook): void {
  hooks.push(hook);
}

export function installShutdownHandlers(
  opts: { prisma?: PrismaClient; abortController?: AbortController; gracePeriodMs?: number } = {},
): void {
  const grace = opts.gracePeriodMs ?? 30_000;

  const handler = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
      console.error(`Already shutting down — forcing exit on ${signal}`);
      process.exit(130);
      return;
    }
    shuttingDown = true;
    console.error(`\n[shutdown] Received ${signal} — draining (${grace}ms grace)...`);

    shutdownTimer = setTimeout(() => {
      console.error('[shutdown] Grace period exceeded — forcing exit');
      process.exit(124);
    }, grace);

    try {
      // Signal cooperative cancellation to active orchestrator
      opts.abortController?.abort();

      // Run user-registered hooks
      for (const hook of hooks) {
        try {
          await hook();
        } catch (e) {
          console.error(`[shutdown] Hook failed: ${String(e)}`);
        }
      }

      // Flush observability sinks
      try {
        await flushBetterStackLogs();
      } catch {
        /* ignore */
      }

      // Disconnect Prisma
      if (opts.prisma) {
        try {
          await opts.prisma.$disconnect();
        } catch {
          /* ignore */
        }
      }

      if (shutdownTimer) clearTimeout(shutdownTimer);
      console.error('[shutdown] Drain complete — exiting');
      process.exit(0);
    } catch (e) {
      console.error(`[shutdown] Error during drain: ${String(e)}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void handler('SIGINT'));
  process.on('SIGTERM', () => void handler('SIGTERM'));
  process.on('SIGHUP', () => void handler('SIGHUP'));

  process.on('uncaughtException', (err) => {
    console.error('[shutdown] uncaughtException:', err);
    void handler('SIGTERM');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[shutdown] unhandledRejection:', reason);
    void handler('SIGTERM');
  });
}
