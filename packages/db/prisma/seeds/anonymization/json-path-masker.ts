// ═══════════════════════════════════════════════════════════════
// JSON PATH MASKER — for nested JSON columns (medicalConditions, etc.)
// Supports JSONPath-like dot notation: "metadata.medical.conditions[0].name"
// ═══════════════════════════════════════════════════════════════

import { applyMask, type MaskingStrategy } from './deterministic-masker';

export interface JsonPathRule {
  readonly path: string;
  readonly strategy: MaskingStrategy;
}

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    const arrayMatch = p.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      cur = (cur as Record<string, unknown>)[arrayMatch[1]!];
      if (Array.isArray(cur)) cur = cur[Number(arrayMatch[2])];
    } else {
      cur = (cur as Record<string, unknown>)[p];
    }
  }
  return cur;
}

function setByPath(obj: unknown, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const arrayMatch = p.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      cur = (cur as Record<string, unknown>)[arrayMatch[1]!];
      if (Array.isArray(cur)) cur = cur[Number(arrayMatch[2])];
    } else {
      if (!(cur as Record<string, unknown>)[p]) (cur as Record<string, unknown>)[p] = {};
      cur = (cur as Record<string, unknown>)[p];
    }
  }
  const last = parts[parts.length - 1]!;
  const arrayMatch = last.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const arr = (cur as Record<string, unknown>)[arrayMatch[1]!] as unknown[];
    if (Array.isArray(arr)) arr[Number(arrayMatch[2])] = value;
  } else {
    (cur as Record<string, unknown>)[last] = value;
  }
}

export function maskJsonPaths(value: unknown, rules: readonly JsonPathRule[]): unknown {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (typeof value !== 'object' || value === null) return value;
  const cloned = JSON.parse(JSON.stringify(value));
  for (const rule of rules) {
    const cur = getByPath(cloned, rule.path);
    if (cur !== undefined) {
      setByPath(cloned, rule.path, applyMask(cur, rule.strategy));
    }
  }
  return cloned;
}
