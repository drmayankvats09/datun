// ═══════════════════════════════════════════════════════════════
// PROMPT VERSIONING OPS CLI
//
// Aligned to real PromptStore + PromptRolloutOrchestrator APIs.
// Real schema uses (version, modelTarget) as natural key — there is
// no separate "key" field; modelTarget plays that role.
//
// Subcommands:
//   list                                    — All versions, optionally filtered by model
//   show <version> <modelTarget>            — Full details
//   create                                  — Create draft from file/stdin
//   activate <version> <modelTarget>        — Promote draft → active
//   rollout-start <version> <modelTarget>   — Begin gradual rollout
//   rollout-evaluate <version> <model>      — Check guardrails + advance
//   diff <ver-a> <ver-b> --model <target>   — Compare two versions of the same modelTarget
// ═══════════════════════════════════════════════════════════════

import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'node:fs';
import { PromptStore, type PromptDraft } from './prompt-store';
import { PromptRolloutOrchestrator } from './prompt-rollout';
import { logger } from '../../utils/logger';

const program = new Command();

function makePrisma(): PrismaClient {
  return new PrismaClient();
}

program
  .name('datun-prompt')
  .description('Datun prompt versioning + rollout ops CLI')
  .version('1.0.0');

// ─── list ─────────────────────────────────────────────────────
program
  .command('list')
  .description('List prompt versions, optionally filtered by modelTarget')
  .option('-m, --model <target>', 'Filter by modelTarget (e.g. "claude-sonnet-4")')
  .option('-a, --active-only', 'Only show currently active versions', false)
  .option('-l, --limit <n>', 'Max rows', '50')
  .option('--json', 'Output JSON', false)
  .action(async (opts: { model?: string; activeOnly?: boolean; limit: string; json?: boolean }) => {
    const prisma = makePrisma();
    try {
      const where: { modelTarget?: string; active?: boolean } = {};
      if (opts.model) where.modelTarget = opts.model;
      if (opts.activeOnly) where.active = true;
      const versions = await prisma.promptVersion.findMany({
        where,
        orderBy: [{ modelTarget: 'asc' }, { releasedAt: 'desc' }],
        take: Number(opts.limit),
        select: {
          id: true,
          version: true,
          modelTarget: true,
          active: true,
          releasedAt: true,
          retiredAt: true,
          createdBy: true,
          cacheKey: true,
        },
      });
      if (opts.json) {
        console.log(JSON.stringify(versions, null, 2));
      } else if (versions.length === 0) {
        console.log('No prompts found.');
      } else {
        for (const v of versions) {
          const status = v.active ? 'ACTIVE' : v.retiredAt ? 'RETIRED' : 'DRAFT';
          console.log(
            `  ${v.id} | ${v.modelTarget.padEnd(35)} | v${v.version.padEnd(8)} | ${status.padEnd(8)} | by ${v.createdBy ?? 'unknown'}`,
          );
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── show ─────────────────────────────────────────────────────
program
  .command('show <version> <modelTarget>')
  .description('Full prompt + rollout state by (version, modelTarget)')
  .action(async (version: string, modelTarget: string) => {
    const prisma = makePrisma();
    try {
      const v = await prisma.promptVersion.findFirst({
        where: { version, modelTarget },
        include: { rolloutPlan: true },
      });
      if (!v) {
        console.error(`❌ Not found: ${modelTarget} v${version}`);
        process.exit(1);
      }
      console.log(JSON.stringify(v, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── create ───────────────────────────────────────────────────
program
  .command('create')
  .description('Create a new prompt version (draft)')
  .requiredOption('-v, --version <v>', 'New version string (e.g. "2026-05-08")')
  .requiredOption('-m, --model <target>', 'modelTarget (e.g. "claude-sonnet-4")')
  .option('-f, --file <path>', 'Read systemPrompt content from file')
  .option('--stdin', 'Read systemPrompt content from stdin')
  .option('-n, --notes <text>', 'Description of what changed')
  .requiredOption('-c, --created-by <id>', 'User ID creating the draft')
  .action(
    async (opts: {
      version: string;
      model: string;
      file?: string;
      stdin?: boolean;
      notes?: string;
      createdBy: string;
    }) => {
      const prisma = makePrisma();
      try {
        let content = '';
        if (opts.file) {
          content = await fs.readFile(opts.file, 'utf-8');
        } else if (opts.stdin) {
          content = await readStdin();
        } else {
          console.error('❌ Specify --file <path> or --stdin');
          process.exit(1);
        }
        if (content.trim().length < 10) {
          console.error('❌ systemPrompt content too short (< 10 chars)');
          process.exit(1);
        }

        const store = new PromptStore(prisma);
        const draft: PromptDraft = {
          version: opts.version,
          modelTarget: opts.model,
          systemPrompt: content,
          notes: opts.notes ?? undefined,
          createdBy: opts.createdBy,
        };
        const created = await store.createVersion(draft);
        logger.info(
          { id: created.id, version: opts.version, modelTarget: opts.model },
          'Prompt version created',
        );
        console.log(`✅ Created v${opts.version} for ${opts.model}: ${created.id}`);
        console.log(`   cacheKey: ${created.cacheKey}`);
      } catch (err) {
        logger.error({ err }, 'Create failed');
        process.exit(2);
      } finally {
        await prisma.$disconnect();
      }
    },
  );

// ─── activate ─────────────────────────────────────────────────
program
  .command('activate <version> <modelTarget>')
  .description(
    'Activate a version — atomically deactivates the previous active version for this modelTarget',
  )
  .action(async (version: string, modelTarget: string) => {
    const prisma = makePrisma();
    try {
      const store = new PromptStore(prisma);
      await store.activate(version, modelTarget);
      logger.info({ version, modelTarget }, 'Prompt activated');
      console.log(`✅ Activated v${version} for ${modelTarget}`);
    } catch (err) {
      logger.error({ err, version, modelTarget }, 'Activation failed');
      process.exit(2);
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── rollout-start ────────────────────────────────────────────
program
  .command('rollout-start <promptVersionId>')
  .description('Begin gradual rollout for a prompt version')
  .option('--start-pct <n>', 'Initial traffic percentage', '10')
  .option('--step-pct <n>', 'Increase per step', '20')
  .option('--interval-hours <n>', 'Hours between steps', '24')
  .action(
    async (
      promptVersionId: string,
      opts: { startPct: string; stepPct: string; intervalHours: string },
    ) => {
      const prisma = makePrisma();
      try {
        const orchestrator = new PromptRolloutOrchestrator(prisma);
        await orchestrator.startRollout(
          promptVersionId,
          Number(opts.startPct),
          Number(opts.stepPct),
          Number(opts.intervalHours),
        );
        logger.info({ promptVersionId, ...opts }, 'Rollout started');
        console.log(`✅ Rollout started for ${promptVersionId}`);
        console.log(`   start ${opts.startPct}% → +${opts.stepPct}% every ${opts.intervalHours}h`);
      } catch (err) {
        logger.error({ err, promptVersionId }, 'Rollout start failed');
        process.exit(2);
      } finally {
        await prisma.$disconnect();
      }
    },
  );

// ─── rollout-evaluate ─────────────────────────────────────────
program
  .command('rollout-evaluate <promptVersionId>')
  .description('Evaluate guardrails (safety + score vs baseline) and advance rollout if OK')
  .requiredOption('--safety-rate <n>', 'Observed safety violation rate (0..1, e.g. 0.001)')
  .requiredOption('--composite-score <n>', 'Composite quality score on candidate (0..1)')
  .requiredOption('--baseline-score <n>', 'Composite quality score on baseline (0..1)')
  .action(
    async (
      promptVersionId: string,
      opts: { safetyRate: string; compositeScore: string; baselineScore: string },
    ) => {
      const prisma = makePrisma();
      try {
        const safety = Number(opts.safetyRate);
        const composite = Number(opts.compositeScore);
        const baseline = Number(opts.baselineScore);
        if ([safety, composite, baseline].some((n) => Number.isNaN(n))) {
          console.error('❌ All metric flags must be numeric (0..1)');
          process.exit(1);
        }
        const orchestrator = new PromptRolloutOrchestrator(prisma);
        const decision = await orchestrator.evaluateRamp(
          promptVersionId,
          safety,
          composite,
          baseline,
        );
        console.log(`📊 ROLLOUT DECISION for ${promptVersionId}`);
        console.log(JSON.stringify(decision, null, 2));
      } catch (err) {
        logger.error({ err, promptVersionId }, 'Rollout evaluate failed');
        process.exit(2);
      } finally {
        await prisma.$disconnect();
      }
    },
  );

// ─── diff ─────────────────────────────────────────────────────
program
  .command('diff <verA> <verB>')
  .description('Diff systemPrompt between two versions of the same modelTarget')
  .requiredOption('-m, --model <target>', 'modelTarget shared by both versions')
  .action(async (verA: string, verB: string, opts: { model: string }) => {
    const prisma = makePrisma();
    try {
      const [aRow, bRow] = await Promise.all([
        prisma.promptVersion.findFirst({
          where: { version: verA, modelTarget: opts.model },
          select: { systemPrompt: true, version: true, modelTarget: true },
        }),
        prisma.promptVersion.findFirst({
          where: { version: verB, modelTarget: opts.model },
          select: { systemPrompt: true, version: true, modelTarget: true },
        }),
      ]);
      if (!aRow || !bRow) {
        console.error(
          `❌ Not found: ${!aRow ? `${opts.model} v${verA}` : `${opts.model} v${verB}`}`,
        );
        process.exit(1);
      }
      console.log(`--- v${aRow.version} (${aRow.modelTarget})`);
      console.log(`+++ v${bRow.version} (${bRow.modelTarget})`);
      console.log(simpleDiff(aRow.systemPrompt, bRow.systemPrompt));
    } finally {
      await prisma.$disconnect();
    }
  });

function simpleDiff(a: string, b: string): string {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const out: string[] = [];
  const maxLines = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < maxLines; i += 1) {
    const aLine = aLines[i] ?? '';
    const bLine = bLines[i] ?? '';
    if (aLine !== bLine) {
      if (aLine) out.push(`- ${aLine}`);
      if (bLine) out.push(`+ ${bLine}`);
    } else {
      out.push(`  ${aLine}`);
    }
  }
  return out.join('\n');
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    process.stdin.on('data', (c) => chunks.push(Buffer.from(c)));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}

if (require.main === module) {
  program.parseAsync(process.argv).catch((err) => {
    logger.error({ err }, 'CLI fatal');
    process.exit(99);
  });
}

export { program };
