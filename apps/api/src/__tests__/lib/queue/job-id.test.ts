// ═══════════════════════════════════════════════════════════════
// JOB ID BUILDER TESTS — Idempotency contract
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppTemplateJobId,
  buildWhatsAppTextJobId,
  buildEmailTemplatedJobId,
  buildEmailRawJobId,
  buildPdfConsultationJobId,
  buildScheduledJobId,
} from '../../../lib/queue/job-id.js';

describe('Job ID builders — idempotency contract', () => {
  describe('buildWhatsAppTemplateJobId', () => {
    it('produces stable ID for same inputs', () => {
      const id1 = buildWhatsAppTemplateJobId({
        userId: 'user-1',
        templateName: 'consultation_complete',
        consultationId: 'cons-1',
      });
      const id2 = buildWhatsAppTemplateJobId({
        userId: 'user-1',
        templateName: 'consultation_complete',
        consultationId: 'cons-1',
      });
      expect(id1).toBe(id2);
    });

    it('different consultations produce different IDs', () => {
      const id1 = buildWhatsAppTemplateJobId({
        userId: 'user-1',
        templateName: 'consultation_complete',
        consultationId: 'cons-1',
      });
      const id2 = buildWhatsAppTemplateJobId({
        userId: 'user-1',
        templateName: 'consultation_complete',
        consultationId: 'cons-2',
      });
      expect(id1).not.toBe(id2);
    });

    it('salt distinguishes legitimately repeating jobs', () => {
      const id3day = buildWhatsAppTemplateJobId({
        userId: 'user-1',
        templateName: 'followup',
        consultationId: 'cons-1',
        salt: '3day',
      });
      const id7day = buildWhatsAppTemplateJobId({
        userId: 'user-1',
        templateName: 'followup',
        consultationId: 'cons-1',
        salt: '7day',
      });
      expect(id3day).not.toBe(id7day);
    });

    it('handles missing consultationId gracefully', () => {
      const id = buildWhatsAppTemplateJobId({
        userId: 'user-1',
        templateName: 'welcome',
      });
      expect(id).toMatch(/wa-tpl:user-1:welcome/);
    });
  });

  describe('buildWhatsAppTextJobId', () => {
    it('same body within bucket = same ID', () => {
      const id1 = buildWhatsAppTextJobId({
        phone: '+919999135340',
        body: 'Test message',
      });
      const id2 = buildWhatsAppTextJobId({
        phone: '+919999135340',
        body: 'Test message',
      });
      expect(id1).toBe(id2);
    });

    it('different body = different ID', () => {
      const id1 = buildWhatsAppTextJobId({
        phone: '+919999135340',
        body: 'Hello',
      });
      const id2 = buildWhatsAppTextJobId({
        phone: '+919999135340',
        body: 'Goodbye',
      });
      expect(id1).not.toBe(id2);
    });

    it('hashes body — does not leak content in ID', () => {
      const id = buildWhatsAppTextJobId({
        phone: '+919999135340',
        body: 'Sensitive medical info',
      });
      expect(id).not.toContain('Sensitive');
      expect(id).not.toContain('medical');
    });
  });

  describe('buildEmailTemplatedJobId', () => {
    it('same template + recipient = same ID', () => {
      const id1 = buildEmailTemplatedJobId({
        to: 'user@example.com',
        template: 'welcome',
        consultationId: 'cons-1',
      });
      const id2 = buildEmailTemplatedJobId({
        to: 'user@example.com',
        template: 'welcome',
        consultationId: 'cons-1',
      });
      expect(id1).toBe(id2);
    });

    it('case-insensitive on email — UPPER same as lower', () => {
      const id1 = buildEmailTemplatedJobId({
        to: 'User@Example.COM',
        template: 'welcome',
      });
      const id2 = buildEmailTemplatedJobId({
        to: 'user@example.com',
        template: 'welcome',
      });
      expect(id1).toBe(id2);
    });

    it('hashes recipient — no PII leak in ID', () => {
      const id = buildEmailTemplatedJobId({
        to: 'patient@example.com',
        template: 'welcome',
      });
      expect(id).not.toContain('patient');
      expect(id).not.toContain('@');
    });
  });

  describe('buildEmailRawJobId', () => {
    it('different subjects produce different IDs', () => {
      const id1 = buildEmailRawJobId({
        to: 'a@example.com',
        subject: 'Receipt #1',
      });
      const id2 = buildEmailRawJobId({
        to: 'a@example.com',
        subject: 'Receipt #2',
      });
      expect(id1).not.toBe(id2);
    });
  });

  describe('buildPdfConsultationJobId', () => {
    it('one consultation = one PDF job ID forever', () => {
      const id1 = buildPdfConsultationJobId('cons-abc-123');
      const id2 = buildPdfConsultationJobId('cons-abc-123');
      expect(id1).toBe(id2);
      expect(id1).toBe('pdf-cons:cons-abc-123');
    });
  });

  describe('buildScheduledJobId', () => {
    it('same job + same date = same ID', () => {
      const id1 = buildScheduledJobId({
        jobName: 'daily-report',
        bucket: '2026-05-02',
      });
      const id2 = buildScheduledJobId({
        jobName: 'daily-report',
        bucket: '2026-05-02',
      });
      expect(id1).toBe(id2);
    });

    it('different dates = different IDs', () => {
      const id1 = buildScheduledJobId({
        jobName: 'daily-report',
        bucket: '2026-05-02',
      });
      const id2 = buildScheduledJobId({
        jobName: 'daily-report',
        bucket: '2026-05-03',
      });
      expect(id1).not.toBe(id2);
    });
  });
});
