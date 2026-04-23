import { describe, it, expect } from 'vitest';
import { CONTACTS } from '../contacts.js';

describe('CONTACTS constants', () => {
  it('support phone is valid Indian format (no + prefix)', () => {
    expect(CONTACTS.supportPhone).toMatch(/^91\d{10}$/);
  });

  it('founder phone is valid Indian format', () => {
    expect(CONTACTS.founderPhone).toMatch(/^91\d{10}$/);
  });

  it('alert recipients include both numbers', () => {
    expect(CONTACTS.alertRecipients.length).toBe(2);
    expect(CONTACTS.alertRecipients).toContain(CONTACTS.supportPhone);
    expect(CONTACTS.alertRecipients).toContain(CONTACTS.founderPhone);
  });

  it('system email from includes datunai.com', () => {
    expect(CONTACTS.systemEmailFrom).toContain('datunai.com');
  });

  it('support email is set', () => {
    expect(CONTACTS.supportEmail).toContain('@datunai.com');
  });
});
