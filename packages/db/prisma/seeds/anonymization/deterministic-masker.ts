// ═══════════════════════════════════════════════════════════════
// DETERMINISTIC MASKER — SHA-3 + global salt (Greenmask pattern)
// Same input → same output → preserves FK integrity across tables
// ═══════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';

const SALT =
  process.env.SEED_ANONYMIZATION_SALT ??
  (process.env.NODE_ENV === 'production' ? '' : 'datun-default-salt-CHANGE-IN-PROD');

if (process.env.NODE_ENV === 'production' && !process.env.SEED_ANONYMIZATION_SALT) {
  throw new Error('SEED_ANONYMIZATION_SALT must be set in production');
}

export type MaskingStrategy =
  | { kind: 'hash'; preservePrefix?: number; preserveSuffix?: number; outputLength?: number }
  | { kind: 'pseudonym'; prefix?: string }
  | { kind: 'redact'; placeholder?: string }
  | { kind: 'truncate'; keepChars: number }
  | { kind: 'null' }
  | { kind: 'noise'; magnitude: number }
  | { kind: 'fake'; faker: 'email' | 'phone' | 'name' | 'address' | 'date' }
  | { kind: 'shuffle' }
  | { kind: 'keep' };

function sha3_256(input: string): string {
  return createHash('sha3-256')
    .update(SALT + input)
    .digest('hex');
}

let shuffleSeed = 0;
const shufflePool = new Map<string, string[]>();

export function applyMask(value: unknown, strategy: MaskingStrategy): unknown {
  if (value === null || value === undefined) return value;
  const str = String(value);

  switch (strategy.kind) {
    case 'keep':
      return value;
    case 'null':
      return null;
    case 'redact':
      return strategy.placeholder ?? '[REDACTED]';
    case 'truncate':
      return str.slice(0, strategy.keepChars);
    case 'hash': {
      const hash = sha3_256(str).slice(0, strategy.outputLength ?? 16);
      const prefix = strategy.preservePrefix ? str.slice(0, strategy.preservePrefix) : '';
      const suffix = strategy.preserveSuffix ? str.slice(-strategy.preserveSuffix) : '';
      return `${prefix}${hash}${suffix}`;
    }
    case 'pseudonym': {
      const hash = sha3_256(str);
      const num = parseInt(hash.slice(0, 8), 16);
      return `${strategy.prefix ?? 'pseudo'}-${num.toString(36)}`;
    }
    case 'noise': {
      const num = Number(value);
      if (Number.isNaN(num)) return value;
      const hashSeed = parseInt(sha3_256(str).slice(0, 8), 16) / 0xffffffff;
      const noise = (hashSeed - 0.5) * 2 * strategy.magnitude;
      return num + noise;
    }
    case 'fake': {
      const hash = sha3_256(str);
      switch (strategy.faker) {
        case 'email':
          return `user-${hash.slice(0, 8)}@anonymized.local`;
        case 'phone':
          return `+91${hash
            .slice(0, 10)
            .replace(/[^0-9]/g, '0')
            .padEnd(10, '0')
            .slice(0, 10)}`;
        case 'name': {
          const names = ['Anita', 'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Pooja', 'Arjun'];
          const surnames = [
            'Sharma',
            'Verma',
            'Patel',
            'Kumar',
            'Singh',
            'Gupta',
            'Mehta',
            'Reddy',
          ];
          const idx1 = parseInt(hash.slice(0, 4), 16) % names.length;
          const idx2 = parseInt(hash.slice(4, 8), 16) % surnames.length;
          return `${names[idx1]} ${surnames[idx2]}`;
        }
        case 'address':
          return `${(parseInt(hash.slice(0, 4), 16) % 999) + 1} Anonymous Street, City ${hash.slice(4, 8)}`;
        case 'date': {
          const days = parseInt(hash.slice(0, 6), 16) % 36500;
          return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
        }
      }
      return value;
    }
    case 'shuffle': {
      // group all values, then assign hash-based index
      const poolKey = str.length.toString();
      let pool = shufflePool.get(poolKey);
      if (!pool) {
        pool = [];
        shufflePool.set(poolKey, pool);
      }
      pool.push(str);
      const idx = (parseInt(sha3_256(str).slice(0, 8), 16) + shuffleSeed++) % pool.length;
      return pool[idx] ?? str;
    }
  }
}
