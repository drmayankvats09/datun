// ═══════════════════════════════════════════════════════════════
// INJECTION TESTS — OWASP Top 10 attack vectors against ALL fields
// Every primitive must reject malicious input at Zod level.
// Pattern: Stripe security test suite, OWASP ZAP test patterns.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  emailField,
  nameField,
  phoneField,
  otpField,
  uuidField,
  stringIdField,
} from '../../../validators/primitives/index';
import { signupEmailSchema } from '../../../validators/domains/auth.schema';

// ── Common attack payloads ──
const SQL_INJECTIONS = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "admin'--",
  '1; DELETE FROM consultations',
  "' UNION SELECT * FROM users --",
  "1' AND 1=1 UNION ALL SELECT NULL,NULL,table_name FROM information_schema.tables--",
];

const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img onerror="alert(1)" src=x>',
  '<svg onload="alert(1)">',
  'javascript:alert(1)',
  '<iframe src="https://evil.com">',
  '"><script>document.cookie</script>',
  "'-alert(1)-'",
  '<body onload=alert(1)>',
];

const PATH_TRAVERSALS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32',
  '%2e%2e%2f%2e%2e%2f',
  '....//....//etc/passwd',
];

const NOSQL_INJECTIONS = ['{"$gt": ""}', '{"$ne": null}', '{"$regex": ".*"}'];

const COMMAND_INJECTIONS = ['; ls -la', '| cat /etc/passwd', '`whoami`', '$(rm -rf /)'];

describe('SQL Injection Prevention', () => {
  it.each(SQL_INJECTIONS)('uuidField rejects: %s', (payload) => {
    expect(uuidField.safeParse(payload).success).toBe(false);
  });

  it.each(SQL_INJECTIONS)('stringIdField rejects: %s', (payload) => {
    expect(stringIdField.safeParse(payload).success).toBe(false);
  });

  it.each(SQL_INJECTIONS)('otpField rejects: %s', (payload) => {
    expect(otpField.safeParse(payload).success).toBe(false);
  });

  it.each(SQL_INJECTIONS)('phoneField rejects: %s', (payload) => {
    expect(phoneField.safeParse(payload).success).toBe(false);
  });
});

describe('XSS Prevention', () => {
  it.each(XSS_PAYLOADS)('nameField sanitizes (not rejects): %s', (payload) => {
    // nameField uses .transform(sanitizeHtml) — accepts but sanitizes
    const result = nameField.safeParse(payload);
    if (result.success) {
      expect(result.data).not.toContain('<script');
      expect(result.data).not.toContain('<img');
      expect(result.data).not.toContain('<svg');
      expect(result.data).not.toContain('<iframe');
      expect(result.data).not.toContain('<body');
    }
  });

  it('signupEmailSchema sanitizes XSS in name field', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'StrongPass1',
      name: '<script>steal(document.cookie)</script>',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).not.toContain('<script>');
      expect(result.data.name).toContain('&lt;script&gt;');
    }
  });

  it.each(XSS_PAYLOADS)('emailField rejects XSS in email: %s', (payload) => {
    expect(emailField.safeParse(payload).success).toBe(false);
  });
});

describe('Path Traversal Prevention', () => {
  it.each(PATH_TRAVERSALS)('uuidField rejects: %s', (payload) => {
    expect(uuidField.safeParse(payload).success).toBe(false);
  });

  it.each(PATH_TRAVERSALS)('stringIdField rejects: %s', (payload) => {
    expect(stringIdField.safeParse(payload).success).toBe(false);
  });
});

describe('NoSQL Injection Prevention', () => {
  it.each(NOSQL_INJECTIONS)('uuidField rejects: %s', (payload) => {
    expect(uuidField.safeParse(payload).success).toBe(false);
  });

  it.each(NOSQL_INJECTIONS)('stringIdField rejects: %s', (payload) => {
    expect(stringIdField.safeParse(payload).success).toBe(false);
  });
});

describe('Command Injection Prevention', () => {
  it.each(COMMAND_INJECTIONS)('uuidField rejects: %s', (payload) => {
    expect(uuidField.safeParse(payload).success).toBe(false);
  });

  it.each(COMMAND_INJECTIONS)('phoneField rejects: %s', (payload) => {
    expect(phoneField.safeParse(payload).success).toBe(false);
  });

  it.each(COMMAND_INJECTIONS)('otpField rejects: %s', (payload) => {
    expect(otpField.safeParse(payload).success).toBe(false);
  });
});
