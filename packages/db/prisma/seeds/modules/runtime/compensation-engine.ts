// ═══════════════════════════════════════════════════════════════
// COMPENSATION ENGINE — Saga reverse-order rollback
// AWS Saga pattern: each completed module undone via compensate()
// ═══════════════════════════════════════════════════════════════

import type { ModuleContext, ModuleLogger, ModuleResult, SeedModule } from '../core/module.types';

export class CompensationEngine {
  constructor(private readonly logger: ModuleLogger) {}

  async compensate(
    successfulResults: readonly ModuleResult[],
    allModules: readonly SeedModule[],
    ctx: ModuleContext,
  ): Promise<{ compensated: number; failed: number }> {
    const moduleByName = new Map(allModules.map((m) => [m.name, m]));
    let compensated = 0;
    let failed = 0;

    // Reverse order — last completed undone first
    const reversed = [...successfulResults].reverse();

    for (const result of reversed) {
      const module = moduleByName.get(result.moduleName);
      if (!module || !module.compensate) {
        this.logger.warn(`No compensation defined for ${result.moduleName} — skipping`);
        continue;
      }

      try {
        this.logger.info(`🔄 Compensating ${result.moduleName}`);
        await module.compensate(ctx, result);
        compensated++;
      } catch (e) {
        this.logger.error(`Compensation failed for ${result.moduleName}`, { error: String(e) });
        failed++;
      }
    }

    this.logger.info(`Compensation complete`, { compensated, failed });
    return { compensated, failed };
  }
}
