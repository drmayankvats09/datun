// ═══════════════════════════════════════════════════════════════
// INSTRUMENTER — Prisma extension that records every model write
// Compares actual writes vs module.modelsTouched declaration
// ═══════════════════════════════════════════════════════════════
import { Prisma, PrismaClient } from '@prisma/client';

export interface TouchRecord {
  module: string;
  modelsActuallyTouched: Set<string>;
  modelsDeclared: Set<string>;
  undeclared: string[];
  unused: string[];
}

const records = new Map<string, Set<string>>();
let activeModule: string | null = null;

export function setActiveModule(name: string | null): void {
  activeModule = name;
  if (name && !records.has(name)) records.set(name, new Set());
}

export function getInstrumentedClient(client: PrismaClient): PrismaClient {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (activeModule && model && /create|update|upsert|delete/i.test(operation)) {
            records.get(activeModule)!.add(model);
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

export function compareDeclarations(
  declarations: Record<string, readonly string[]>,
): TouchRecord[] {
  return Object.entries(declarations).map(([module, declared]) => {
    const actual = records.get(module) ?? new Set();
    const decl = new Set(declared);
    return {
      module,
      modelsActuallyTouched: actual,
      modelsDeclared: decl,
      undeclared: [...actual].filter((m) => !decl.has(m)),
      unused: [...decl].filter((m) => !actual.has(m)),
    };
  });
}

export function resetInstrumenter(): void {
  records.clear();
  activeModule = null;
}
