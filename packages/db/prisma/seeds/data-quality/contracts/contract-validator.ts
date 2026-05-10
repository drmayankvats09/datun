// ═══════════════════════════════════════════════════════════════
// CONTRACT VALIDATOR — runs against snapshot
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { DataContract, ContractViolation } from './contract.types';

/**
 * Narrow delegate shape for dynamic table access in contract validation.
 * We only need `count` and `findMany`. Keys map to lower-camel-case Prisma model names.
 */
interface CountableDelegate {
  count(args: { where?: Record<string, unknown> }): Promise<number>;
  findMany(args: {
    take?: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
    where?: Record<string, unknown>;
  }): Promise<Record<string, unknown>[]>;
}
type DynamicPrismaAccess = Record<string, CountableDelegate>;

export interface ValidatorOptions {
  readonly sampleSize?: number;
  readonly stopOnFirstCritical?: boolean;
}

export async function validateContract(
  prisma: PrismaClient,
  contract: DataContract,
  opts: ValidatorOptions = {},
): Promise<readonly ContractViolation[]> {
  const violations: ContractViolation[] = [];
  const sampleSize = opts.sampleSize ?? 1000;

  // Freshness check
  if (contract.freshness) {
    const cutoff = new Date(Date.now() - contract.freshness.maxStaleSeconds * 1000);
    const staleCount = await (prisma as unknown as DynamicPrismaAccess)[
      lcFirst(contract.tableName)
    ]!.count({
      where: { [contract.freshness.checkColumn]: { lt: cutoff } },
    });
    if (staleCount > 0) {
      violations.push({
        contractTable: contract.tableName,
        contractVersion: contract.version,
        violationKind: 'freshness',
        severity: contract.freshness.severity,
        message: `${staleCount} rows older than ${contract.freshness.maxStaleSeconds}s`,
        sampleRowIds: [],
        observedAt: new Date(),
      });
      if (opts.stopOnFirstCritical && contract.freshness.severity === 'critical') return violations;
    }
  }

  // Volume check (last 24h)
  if (contract.volume) {
    const since = new Date(Date.now() - 86_400_000);
    const dayCount = await (prisma as unknown as DynamicPrismaAccess)[
      lcFirst(contract.tableName)
    ]!.count({ where: { createdAt: { gte: since } } });
    if (dayCount > contract.volume.maxRowsPerDay || dayCount < contract.volume.minRowsPerDay) {
      violations.push({
        contractTable: contract.tableName,
        contractVersion: contract.version,
        violationKind: 'volume',
        severity: contract.volume.severity,
        message: `Volume ${dayCount} outside [${contract.volume.minRowsPerDay},${contract.volume.maxRowsPerDay}]`,
        sampleRowIds: [],
        observedAt: new Date(),
      });
    }
  }

  // Field-level checks on sample
  const rows = await (prisma as unknown as DynamicPrismaAccess)[
    lcFirst(contract.tableName)
  ]!.findMany({ take: sampleSize, orderBy: { createdAt: 'desc' } });

  for (const field of contract.fields) {
    const offending: string[] = [];
    for (const r of rows) {
      const id = String(r.id);
      const v = r[field.name];
      if (!field.nullable && (v === null || v === undefined)) {
        offending.push(id);
        continue;
      }
      if (v === null || v === undefined) continue;
      if (field.type === 'string' && typeof v === 'string') {
        if (field.minLength !== undefined && v.length < field.minLength) offending.push(id);
        else if (field.maxLength !== undefined && v.length > field.maxLength) offending.push(id);
        else if (field.regex && !new RegExp(field.regex).test(v)) offending.push(id);
      } else if (field.type === 'number' && typeof v === 'number') {
        if (field.minValue !== undefined && v < field.minValue) offending.push(id);
        else if (field.maxValue !== undefined && v > field.maxValue) offending.push(id);
      } else if (
        field.type === 'enum' &&
        field.enumValues &&
        !field.enumValues.includes(v as string)
      ) {
        offending.push(id);
      }
    }
    if (offending.length > 0) {
      violations.push({
        contractTable: contract.tableName,
        contractVersion: contract.version,
        violationKind: field.type === 'enum' ? 'enum' : 'schema',
        fieldName: field.name,
        severity: 'error',
        message: `Field ${field.name}: ${offending.length}/${rows.length} rows violate constraint`,
        sampleRowIds: offending.slice(0, 5),
        observedAt: new Date(),
      });
    }
  }

  return violations;
}

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
