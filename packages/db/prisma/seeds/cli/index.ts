#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Datun Seed CLI — Entry Point
// All commands registered in program.ts (single source of truth)
// FAANG-canonical pattern: thin shim, no business logic
// ═══════════════════════════════════════════════════════════════

import { runCli } from './program';

// Global error handlers — catch anything that escapes commander
// Without these, unhandled rejections die silently in CI (stdout buffer lost)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err instanceof Error ? err.stack : String(err));
  process.exitCode = 1;
});
process.on('unhandledRejection', (reason) => {
  console.error(
    'UNHANDLED REJECTION:',
    reason instanceof Error ? reason.stack : JSON.stringify(reason),
  );
  process.exitCode = 1;
});

/**
 * Drain stdout/stderr before exiting.
 * Critical for CI: process.exit() does NOT flush buffered output,
 * leading to "silent crashes" where the actual error is invisible.
 */
async function flushAndExit(code: number): Promise<never> {
  await new Promise<void>((resolve) => {
    let pending = 2;
    const done = (): void => {
      pending--;
      if (pending === 0) resolve();
    };
    if (process.stdout.writableLength === 0) done();
    else process.stdout.write('', done);
    if (process.stderr.writableLength === 0) done();
    else process.stderr.write('', done);
  });
  // Setting exitCode + letting event loop drain is safer than process.exit()
  process.exitCode = code;
  // Force exit only after a microtask tick (lets pending logs print)
  await new Promise((r) => setImmediate(r));
  process.exit(code);
}

runCli(process.argv.slice(2))
  .then((code) => flushAndExit(code))
  .catch(async (e) => {
    console.error(`Fatal: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    await flushAndExit(1);
  });

export * from './program';
