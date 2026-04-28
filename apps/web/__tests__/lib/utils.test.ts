// ═══════════════════════════════════════════════════════════════
// WEB UTILS TESTS — Foundation test demonstrating pattern
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn() — Tailwind class merger', () => {
  it('merges multiple class strings', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('active');
  });

  it('filters out falsy values', () => {
    const result = cn('base', false, null, undefined, '', 'valid');
    expect(result).toBe('base valid');
  });

  it('handles empty call', () => {
    expect(cn()).toBe('');
  });
});
