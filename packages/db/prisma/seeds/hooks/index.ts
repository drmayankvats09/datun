// ═══════════════════════════════════════════════════════════════
// SEED HOOKS — pre/post-module lifecycle callbacks
// Used by orchestrator for cross-cutting concerns
// (audit, telemetry, metrics, sentry breadcrumbs)
// ═══════════════════════════════════════════════════════════════
import type { ModuleContext, ModuleResult, SeedModule } from '../modules/core/module.types';

export type HookKind = 'beforeRun' | 'beforeModule' | 'afterModule' | 'onModuleError' | 'afterRun';

export interface HookContext {
  readonly runId: string;
  readonly moduleName?: string;
  readonly module?: SeedModule;
  readonly ctx: ModuleContext;
  readonly result?: ModuleResult;
  readonly error?: unknown;
}

export type HookFn = (ctx: HookContext) => Promise<void> | void;

export interface HookRegistry {
  readonly hooks: Readonly<Record<HookKind, readonly HookFn[]>>;
  register(kind: HookKind, fn: HookFn): void;
  trigger(kind: HookKind, ctx: HookContext): Promise<void>;
}

class HookRegistryImpl implements HookRegistry {
  private readonly _hooks: Record<HookKind, HookFn[]> = {
    beforeRun: [],
    beforeModule: [],
    afterModule: [],
    onModuleError: [],
    afterRun: [],
  };

  get hooks(): Readonly<Record<HookKind, readonly HookFn[]>> {
    return this._hooks;
  }

  register(kind: HookKind, fn: HookFn): void {
    this._hooks[kind].push(fn);
  }

  async trigger(kind: HookKind, ctx: HookContext): Promise<void> {
    for (const fn of this._hooks[kind]) {
      try {
        await fn(ctx);
      } catch (err) {
        console.error(`[hooks] ${kind} handler failed:`, err);
      }
    }
  }
}

export function createHookRegistry(): HookRegistry {
  return new HookRegistryImpl();
}

export const globalHookRegistry: HookRegistry = createHookRegistry();
