// ═══════════════════════════════════════════════════════════════
// TRACE ID TESTS — Format + entropy
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { generateTraceId, isValidTraceId } from '../trace.js';

describe('Trace ID', () => {
  it('generates IDs with trc_ prefix', () => {
    const id = generateTraceId();
    expect(id).toMatch(/^trc_[a-f0-9]{16}$/);
  });

  it('produces unique IDs across calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(generateTraceId());
    expect(ids.size).toBe(1000);
  });

  it('isValidTraceId accepts well-formed IDs', () => {
    const id = generateTraceId();
    expect(isValidTraceId(id)).toBe(true);
  });

  it('isValidTraceId rejects malformed values', () => {
    expect(isValidTraceId('trc_xyz')).toBe(false);
    expect(isValidTraceId('abc_1234567890abcdef')).toBe(false);
    expect(isValidTraceId(null)).toBe(false);
    expect(isValidTraceId(123)).toBe(false);
  });
});
