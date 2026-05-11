// ═══════════════════════════════════════════════════════════════
// CLI PROGRAM — Commander.js v12+ canonical pattern
// References: Stripe CLI, Vercel CLI, Linear CLI, Cal.com CLI
// Usage: tsx prisma/seeds/cli/index.ts <subcommand> [options]
// ═══════════════════════════════════════════════════════════════

import { Command, CommanderError } from 'commander';
import { registerSeedCommand } from './commands/seed.command';
import { registerSnapshotCommand } from './commands/snapshot.command';
import { registerRestoreCommand } from './commands/restore.command';
import { registerExportCommand } from './commands/export.command';
import { registerValidateCommand } from './commands/validate.command';
import { registerManifestCommand } from './commands/manifest.command';
import { registerAnonymizeCommand } from './commands/anonymize.command';
import { registerBenchCommand } from './commands/bench.command';
import { registerWave6Commands } from './wave6-commands';
import { registerWave7Commands } from './wave7-commands';

export function buildProgram(): Command {
  const program = new Command();

  program
    .name('datun-seed')
    .description(
      'Datun seed CLI - production-grade DB seeding, anonymization, exports, and load testing',
    )
    .version('1.0.0')
    .option('--json', 'Output structured JSON to stdout (logs to stderr)', false)
    .option('--quiet', 'Suppress non-error output', false)
    .option('--verbose', 'Increase log verbosity', false);

  // ─── REGISTER SUBCOMMANDS FIRST (before exitOverride) ───
  registerSeedCommand(program);
  registerSnapshotCommand(program);
  registerRestoreCommand(program);
  registerExportCommand(program);
  registerValidateCommand(program);
  registerManifestCommand(program);
  registerAnonymizeCommand(program);
  registerBenchCommand(program);
  registerWave6Commands(program);
  registerWave7Commands(program);

  // ─── EXIT OVERRIDE: propagate to ALL subcommands (commander.js v9+ canonical) ───
  // Without this, only root has override; subcommands fall back to default exit().
  // This is THE fix that resolves the option-parsing bug.
  program.exitOverride();
  program.commands.forEach((cmd) => {
    cmd.exitOverride();
    // Recursively apply to nested subcommands (e.g., audit verify, audit retain)
    cmd.commands.forEach((nested) => nested.exitOverride());
  });

  // ─── OUTPUT CONFIG (after subcommand registration) ───
  program.configureOutput({
    writeErr: (str: string) => process.stderr.write(str),
  });

  return program;
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const program = buildProgram();
  try {
    // CRITICAL: { from: 'user' } tells commander argv is already cleaned
    // (no node/script paths). This fixes positional arg parsing.
    await program.parseAsync(argv as string[], { from: 'user' });
    return 0;
  } catch (e) {
    // Handle commander's expected control-flow "errors" gracefully
    if (e instanceof CommanderError) {
      if (e.code === 'commander.helpDisplayed') return 0;
      if (e.code === 'commander.help') return 0;
      if (e.code === 'commander.version') return 0;
    }
    process.stderr.write(`✗ ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}
