// apps/web/__tests__/lib/csp/header-size-guard.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP HEADER SIZE GUARD — Unit tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  assertHeaderSize,
  getUtf8ByteLength,
  SIZE_WARNING_BYTES,
  SIZE_ERROR_BYTES,
  VERCEL_HARD_LIMIT_BYTES,
} from '@/lib/csp/header-size-guard';

describe('CSP — header-size-guard', () => {
  it('classifies small headers as ok', () => {
    expect(assertHeaderSize('default-src self; script-src self')).toBe('ok');
  });

  it('classifies a 4 KB header as warning', () => {
    const padding = 'a'.repeat(SIZE_WARNING_BYTES + 10);
    expect(assertHeaderSize(padding)).toBe('warning');
  });

  it('classifies a 6 KB header as error', () => {
    const padding = 'a'.repeat(SIZE_ERROR_BYTES + 10);
    expect(assertHeaderSize(padding)).toBe('error');
  });

  it('Vercel hard limit constant equals 8 KB', () => {
    expect(VERCEL_HARD_LIMIT_BYTES).toBe(8 * 1024);
  });

  it('warning threshold < error threshold < hard limit', () => {
    expect(SIZE_WARNING_BYTES).toBeLessThan(SIZE_ERROR_BYTES);
    expect(SIZE_ERROR_BYTES).toBeLessThan(VERCEL_HARD_LIMIT_BYTES);
  });

  it('getUtf8ByteLength counts ASCII as 1 byte per char', () => {
    expect(getUtf8ByteLength('hello')).toBe(5);
  });

  it('getUtf8ByteLength counts multi-byte UTF-8 correctly', () => {
    // Devanagari "द" is 3 bytes in UTF-8.
    expect(getUtf8ByteLength('द')).toBe(3);
    // Emoji "🦷" (tooth — Datun's mascot) is 4 bytes in UTF-8.
    expect(getUtf8ByteLength('🦷')).toBe(4);
  });

  it('handles empty string', () => {
    expect(getUtf8ByteLength('')).toBe(0);
    expect(assertHeaderSize('')).toBe('ok');
  });
});
