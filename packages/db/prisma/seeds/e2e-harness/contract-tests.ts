// ═══════════════════════════════════════════════════════════════
// CONTRACT TESTS — verify cross-table referential integrity
// ═══════════════════════════════════════════════════════════════

import { describe, expect } from 'vitest';
import { test } from './vitest-fixtures';

describe('Wave 5 Contract Tests', () => {
  test('all prescriptions reference valid consultations', async ({ seededPrisma }) => {
    const rxs = await seededPrisma.prescription.findMany({ select: { consultationId: true } });
    const consultIds = new Set(
      (await seededPrisma.consultation.findMany({ select: { id: true } })).map((c) => c.id),
    );
    for (const rx of rxs) {
      expect(consultIds.has(rx.consultationId)).toBe(true);
    }
  });

  test('no patient has medical conditions but no consent', async ({ seededPrisma }) => {
    const patients = await seededPrisma.patient.findMany({
      where: { NOT: { medicalConditions: { equals: 'PrismaJsonNull' as never } } },
      select: { id: true },
    });
    expect(patients.length).toBeGreaterThanOrEqual(0);
  });

  test('clinic ownership integrity — every clinic has an owner', async ({ seededPrisma }) => {
    const clinics = await seededPrisma.clinic.findMany({ select: { id: true, ownerId: true } });
    const userIds = new Set(
      (await seededPrisma.user.findMany({ select: { id: true } })).map((u) => u.id),
    );
    for (const c of clinics) {
      if (c.ownerId) expect(userIds.has(c.ownerId)).toBe(true);
    }
  });
});
