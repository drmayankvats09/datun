// ═══════════════════════════════════════════════════════════════
// pg_dump WRAPPER — custom-format binary dump for parallel restore
// Source: snapshooter.com + dbsnapper.com — pg_restore -j 8 parallelism
// ═══════════════════════════════════════════════════════════════

import { spawn } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

export interface PgDumpOptions {
  readonly databaseUrl: string;
  readonly outputPath: string;
  readonly format?: 'plain' | 'custom' | 'directory' | 'tar';
  readonly schemas?: readonly string[];
  readonly tables?: readonly string[];
  readonly excludeTables?: readonly string[];
  readonly dataOnly?: boolean;
  readonly schemaOnly?: boolean;
  readonly noOwner?: boolean;
  readonly noPrivileges?: boolean;
  readonly compress?: number;
  readonly jobs?: number;
}

export interface PgDumpResult {
  readonly success: boolean;
  readonly outputPath: string;
  readonly bytesWritten: number;
  readonly durationMs: number;
  readonly stderr?: string;
}

export async function runPgDump(opts: PgDumpOptions): Promise<PgDumpResult> {
  const start = Date.now();
  await mkdir(path.dirname(opts.outputPath), { recursive: true });

  const args: string[] = [
    `--dbname=${opts.databaseUrl}`,
    `--file=${opts.outputPath}`,
    `--format=${opts.format ?? 'custom'}`,
  ];
  if (opts.compress !== undefined) args.push(`--compress=${opts.compress}`);
  if (opts.jobs && opts.format === 'directory') args.push(`--jobs=${opts.jobs}`);
  if (opts.dataOnly) args.push('--data-only');
  if (opts.schemaOnly) args.push('--schema-only');
  if (opts.noOwner) args.push('--no-owner');
  if (opts.noPrivileges) args.push('--no-privileges');
  for (const s of opts.schemas ?? []) args.push(`--schema=${s}`);
  for (const t of opts.tables ?? []) args.push(`--table=${t}`);
  for (const t of opts.excludeTables ?? []) args.push(`--exclude-table=${t}`);

  return new Promise((resolve) => {
    const child = spawn('pg_dump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', async (code) => {
      const ok = code === 0;
      let bytesWritten = 0;
      if (ok)
        try {
          bytesWritten = (await stat(opts.outputPath)).size;
        } catch {
          /* ignore */
        }
      resolve({
        success: ok,
        outputPath: opts.outputPath,
        bytesWritten,
        durationMs: Date.now() - start,
        stderr: ok ? undefined : stderr,
      });
    });
    child.on('error', (err) => {
      resolve({
        success: false,
        outputPath: opts.outputPath,
        bytesWritten: 0,
        durationMs: Date.now() - start,
        stderr: err.message,
      });
    });
  });
}

export async function runPgRestore(opts: {
  databaseUrl: string;
  inputPath: string;
  jobs?: number;
  clean?: boolean;
  create?: boolean;
}): Promise<PgDumpResult> {
  const start = Date.now();
  const args: string[] = [`--dbname=${opts.databaseUrl}`];
  if (opts.jobs) args.push(`--jobs=${opts.jobs}`);
  if (opts.clean) args.push('--clean');
  if (opts.create) args.push('--create');
  args.push(opts.inputPath);

  return new Promise((resolve) => {
    const child = spawn('pg_restore', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        outputPath: opts.inputPath,
        bytesWritten: 0,
        durationMs: Date.now() - start,
        stderr: code === 0 ? undefined : stderr,
      });
    });
    child.on('error', (err) => {
      resolve({
        success: false,
        outputPath: opts.inputPath,
        bytesWritten: 0,
        durationMs: Date.now() - start,
        stderr: err.message,
      });
    });
  });
}
