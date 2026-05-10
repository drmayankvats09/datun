import { defineModule, measureExecution, runInScope } from '../core';
import { REGISTRY_KEYS } from '../core/module-registry';
import { resetSequences } from '../../factories/core/sequence';
import { jobLogFactory } from '../../factories/audit/job-log.factory';
import { bulkInsert } from '../../factories/core/bulk-insert';

const JOB_LOG_COUNT = 500;

export const jobLogsModule = defineModule({
  name: 'compliance.job-logs',
  description: 'Background job execution logs (cron, retries, failures)',
  category: 'compliance',
  version: '2.0.0',
  dependencies: [],
  modelsTouched: ['jobLog'],
  factoriesUsed: ['jobLog'],
  bulkStrategy: 'CREATE_MANY',
  idempotencyStrategy: { kind: 'COUNT_THRESHOLD', modelName: 'jobLog', threshold: JOB_LOG_COUNT },
  consumesRegistryKeys: [],
  providesRegistryKeys: [REGISTRY_KEYS.JOB_LOG_IDS],

  checkIdempotency: async (ctx) => (await ctx.prisma.jobLog.count()) >= JOB_LOG_COUNT,

  run: async (ctx) =>
    measureExecution(jobLogsModule, ctx, async () => {
      resetSequences(ctx.masterSeed + 1450);
      const logs = jobLogFactory.buildList(JOB_LOG_COUNT);

      let created = 0;
      await runInScope(jobLogsModule, ctx, async (tx) => {
        const r = await bulkInsert(tx, 'jobLog', logs, { batchSize: 500, skipDuplicates: true });
        created = r.totalInserted;
      });

      ctx.registry.set(
        REGISTRY_KEYS.JOB_LOG_IDS,
        logs.map((l) => l.id),
      );
      return {
        recordsCreated: created,
        recordsSkipped: 0,
        recordsFailed: 0,
        recordsCompensated: 0,
        factoriesUsed: ['jobLog'],
        modelsTouched: ['jobLog'],
        bulkStrategy: 'CREATE_MANY' as const,
        checkpointsSaved: 0,
        metadata: {},
      };
    }),
});
