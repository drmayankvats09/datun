#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Datun Seed CLI — Entry Point
// All commands registered in program.ts (single source of truth)
// FAANG-canonical pattern: thin shim, no business logic
// ═══════════════════════════════════════════════════════════════

import { runCli } from './program';

runCli(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });

export * from './program';
