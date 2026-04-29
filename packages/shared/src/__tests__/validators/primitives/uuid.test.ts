// ═══════════════════════════════════════════════════════════════
// UUID PRIMITIVE TESTS — Format, security (injection, traversal)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { uuidField, stringIdField } from '../../../validators/primitives/uuid.js';

describe('uuidField', () => {
  it('accepts valid UUID v4', () => {
    expect(uuidField.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
  });

  it('accepts uppercase UUID', () => {
    expect(uuidField.safeParse('550E8400-E29B-41D4-A716-446655440000').success).toBe(true);
  });

  it('rejects random string', () => {
    expect(uuidField.safeParse('not-a-uuid').success).toBe(false);
  });

  it('rejects SQL injection attempt', () => {
    expect(uuidField.safeParse("'; DROP TABLE users; --").success).toBe(false);
  });

  it('rejects path traversal attempt', () => {
    expect(uuidField.safeParse('../../../etc/passwd').success).toBe(false);
  });

  it('rejects NoSQL injection', () => {
    expect(uuidField.safeParse('{"$gt": ""}').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(uuidField.safeParse('').success).toBe(false);
  });

  it('rejects UUID v1 (wrong version digit)', () => {
    // UUID v1 has version 1 at position 13 — we require 4
    expect(uuidField.safeParse('550e8400-e29b-11d4-a716-446655440000').success).toBe(false);
  });
});

describe('stringIdField', () => {
  it('accepts alphanumeric ID', () => {
    expect(stringIdField.safeParse('consultation-abc123').success).toBe(true);
  });

  it('accepts underscore ID', () => {
    expect(stringIdField.safeParse('client_uuid_001').success).toBe(true);
  });

  it('rejects empty', () => {
    expect(stringIdField.safeParse('').success).toBe(false);
  });

  it('rejects ID with spaces', () => {
    expect(stringIdField.safeParse('has space').success).toBe(false);
  });

  it('rejects ID exceeding 64 chars', () => {
    expect(stringIdField.safeParse('a'.repeat(65)).success).toBe(false);
  });

  it('rejects SQL injection', () => {
    expect(stringIdField.safeParse("'; DROP TABLE;--").success).toBe(false);
  });
});
