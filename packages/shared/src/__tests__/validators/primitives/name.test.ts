// ═══════════════════════════════════════════════════════════════
// NAME PRIMITIVE TESTS — Trim, XSS sanitization, multilingual
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { nameField, optionalNameField, sanitizeHtml } from '../../../validators/primitives/name.js';

describe('nameField', () => {
  // ── Valid Names ──

  it('accepts English name', () => {
    expect(nameField.parse('Dr. Mayank Vats')).toBe('Dr. Mayank Vats');
  });

  it('accepts Hindi name', () => {
    expect(nameField.parse('डॉ. मयंक वत्स')).toBe('डॉ. मयंक वत्स');
  });

  it('accepts Tamil name', () => {
    expect(nameField.parse('முருகன்')).toBe('முருகன்');
  });

  it('accepts single character name', () => {
    expect(nameField.safeParse('R').success).toBe(true);
  });

  // ── Trim ──

  it('trims leading whitespace', () => {
    expect(nameField.parse('  Rahul')).toBe('Rahul');
  });

  it('trims trailing whitespace', () => {
    expect(nameField.parse('Rahul  ')).toBe('Rahul');
  });

  it('trims both sides', () => {
    expect(nameField.parse('  Rahul  ')).toBe('Rahul');
  });

  // ── XSS Sanitization ──

  it('sanitizes <script> tags', () => {
    const result = nameField.parse('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('sanitizes HTML img tag', () => {
    const result = nameField.parse('<img onerror="alert(1)">');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  it('sanitizes double quotes', () => {
    const result = nameField.parse('Name "test"');
    expect(result).toContain('&quot;');
  });

  it('sanitizes single quotes', () => {
    const result = nameField.parse("O'Brien");
    expect(result).toContain('&#x27;');
  });

  it('sanitizes ampersand', () => {
    const result = nameField.parse('Tom & Jerry');
    expect(result).toContain('&amp;');
  });

  // ── Rejection ──

  it('rejects empty string', () => {
    expect(nameField.safeParse('').success).toBe(false);
  });

  it('rejects whitespace-only string (trim makes it empty)', () => {
    expect(nameField.safeParse('   ').success).toBe(false);
  });

  it('rejects name exceeding 200 chars', () => {
    const longName = 'A'.repeat(201);
    expect(nameField.safeParse(longName).success).toBe(false);
  });

  it('accepts name at exactly 200 chars', () => {
    const maxName = 'A'.repeat(200);
    expect(nameField.safeParse(maxName).success).toBe(true);
  });
});

describe('optionalNameField', () => {
  it('accepts undefined', () => {
    expect(optionalNameField.safeParse(undefined).success).toBe(true);
  });

  it('sanitizes when provided', () => {
    const result = optionalNameField.parse('<b>Bold</b>');
    expect(result).toContain('&lt;b&gt;');
  });
});

describe('sanitizeHtml', () => {
  it('escapes all 5 dangerous characters', () => {
    const result = sanitizeHtml('<>"\'&');
    expect(result).toBe('&lt;&gt;&quot;&#x27;&amp;');
  });

  it('leaves normal text unchanged', () => {
    expect(sanitizeHtml('Dr. Mayank')).toBe('Dr. Mayank');
  });
});
