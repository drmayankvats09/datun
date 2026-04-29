// ═══════════════════════════════════════════════════════════════
// EMAIL SERVICE TESTS — Templates + rendering + schema
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { renderEmailTemplate } from '../../services/email/templates.js';

describe('renderEmailTemplate', () => {
  // ── OTP Template ──

  it('renders OTP template with code', () => {
    const result = renderEmailTemplate('otp', { code: '123456' }, 'en');
    expect(result.subject).toContain('123456');
    expect(result.html).toContain('123456');
    expect(result.html).toContain('10 minutes');
  });

  it('OTP template includes security warning', () => {
    const result = renderEmailTemplate('otp', { code: '000000' }, 'en');
    expect(result.html).toContain('Do not share');
  });

  // ── Welcome Template ──

  it('renders welcome template with name', () => {
    const result = renderEmailTemplate('welcome', { name: 'Dr. Mayank' }, 'en');
    expect(result.subject).toContain('Welcome');
    expect(result.html).toContain('Dr. Mayank');
  });

  it('renders welcome in Hindi', () => {
    const result = renderEmailTemplate('welcome', { name: 'मयंक' }, 'hi');
    expect(result.subject).toContain('स्वागत');
    expect(result.html).toContain('मयंक');
  });

  // ── Consultation Complete ──

  it('renders consultation complete with diagnosis', () => {
    const result = renderEmailTemplate(
      'consultation_complete',
      {
        name: 'Rahul',
        diagnosis: 'Dental Cavity',
        urgency: 'MODERATE',
        consultationId: 'test-123',
      },
      'en',
    );
    expect(result.subject).toContain('report is ready');
    expect(result.html).toContain('Dental Cavity');
    expect(result.html).toContain('test-123');
  });

  it('shows emergency warning for urgent cases', () => {
    const result = renderEmailTemplate(
      'consultation_complete',
      {
        name: 'Rahul',
        diagnosis: 'Abscess',
        urgency: 'EMERGENCY',
        consultationId: 'test-456',
      },
      'en',
    );
    expect(result.html).toContain('EMERGENCY');
    expect(result.html).toContain('#dc2626'); // red color
  });

  // ── Follow-up Templates ──

  it('renders 3-day follow-up', () => {
    const result = renderEmailTemplate(
      'follow_up_3day',
      {
        name: 'Rahul',
        diagnosis: 'toothache',
      },
      'en',
    );
    expect(result.subject).toContain('Rahul');
    expect(result.html).toContain('3 days ago');
  });

  it('renders 3-day follow-up in Hindi', () => {
    const result = renderEmailTemplate(
      'follow_up_3day',
      {
        name: 'राहुल',
        diagnosis: 'दांत दर्द',
      },
      'hi',
    );
    expect(result.html).toContain('3 दिन');
    expect(result.html).toContain('राहुल');
  });

  it('renders 7-day follow-up', () => {
    const result = renderEmailTemplate(
      'follow_up_7day',
      {
        name: 'Test',
        diagnosis: 'cavity',
      },
      'en',
    );
    expect(result.html).toContain('week');
  });

  // ── Password Reset ──

  it('renders password reset with code', () => {
    const result = renderEmailTemplate(
      'password_reset',
      {
        name: 'Test',
        code: '654321',
      },
      'en',
    );
    expect(result.subject).toContain('Reset');
    expect(result.html).toContain('654321');
    expect(result.html).toContain('10 minutes');
  });

  // ── Security Alert ──

  it('renders security alert', () => {
    const result = renderEmailTemplate(
      'security_alert',
      {
        name: 'Mayank',
        location: 'Delhi, India',
        device: 'Chrome on Windows',
      },
      'en',
    );
    expect(result.html).toContain('Delhi, India');
    expect(result.html).toContain('Chrome on Windows');
  });

  // ── Clinic Templates ──

  it('renders clinic welcome', () => {
    const result = renderEmailTemplate(
      'clinic_welcome',
      {
        doctorName: 'Sharma',
        clinicName: 'Smile Dental',
      },
      'en',
    );
    expect(result.html).toContain('Smile Dental');
    expect(result.html).toContain('14-day');
  });

  it('renders clinic lead notification', () => {
    const result = renderEmailTemplate(
      'clinic_lead',
      {
        patientName: 'Rahul',
        diagnosis: 'Cavity',
        urgency: 'URGENT',
        area: 'Dwarka',
        leadId: 'lead-123',
      },
      'en',
    );
    expect(result.html).toContain('Rahul');
    expect(result.html).toContain('URGENT');
    expect(result.html).toContain('Dwarka');
  });

  // ── Payment Receipt ──

  it('renders payment receipt', () => {
    const result = renderEmailTemplate(
      'payment_receipt',
      {
        amount: '2499',
        plan: 'Grow',
        invoiceId: 'INV-001',
        nextBillingDate: '2026-05-29',
      },
      'en',
    );
    expect(result.html).toContain('2499');
    expect(result.html).toContain('Grow');
  });

  // ── Error Handling ──

  it('throws on unknown template', () => {
    expect(() => renderEmailTemplate('nonexistent' as never, {}, 'en')).toThrow(
      'Unknown email template',
    );
  });

  // ── Unsubscribe Link ──

  it('all user-facing templates include unsubscribe', () => {
    const userTemplates = [
      'welcome',
      'consultation_complete',
      'follow_up_3day',
      'follow_up_7day',
      'password_reset',
    ] as const;

    for (const template of userTemplates) {
      const result = renderEmailTemplate(
        template,
        {
          name: 'Test',
          code: '123456',
          diagnosis: 'test',
          consultationId: 'x',
          urgency: 'ROUTINE',
        },
        'en',
      );
      expect(result.html).toContain('unsubscribe');
    }
  });
});
