// ═══════════════════════════════════════════════════════════════
// TEST DATA FACTORY — minimal fast deterministic records for unit tests
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';

export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<{ id: string; email: string; phone: string }> = {},
): Promise<{ id: string }> {
  const id = overrides.id ?? `test-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await prisma.user.create({
    data: {
      id,
      email: overrides.email ?? `${id}@test.local`,
      phone: overrides.phone ?? '+919999000001',
      primaryRole: 'PATIENT',
      languagePreference: 'en',
      passwordHash: '$2b$10$TEST_HASH_NEVER_REAL',
    } as never,
  });
  return { id };
}

export async function createTestPatient(
  prisma: PrismaClient,
  userId: string,
  clinicId: string,
): Promise<{ id: string }> {
  const id = `test-patient-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await prisma.patient.create({
    data: {
      id,
      userId,
      clinicId,
      ageYears: 30,
      gender: 'MALE',
      preferredLocale: 'en',
    } as never,
  });
  return { id };
}

export async function cleanupTestRecords(
  prisma: PrismaClient,
  trackedIds: { consultationIds?: string[]; patientIds?: string[]; userIds?: string[] } = {},
): Promise<void> {
  // UUID columns don't support `startsWith` filter — pass explicit ID lists.
  if (trackedIds.consultationIds?.length) {
    await prisma.consultation.deleteMany({ where: { id: { in: trackedIds.consultationIds } } });
  }
  if (trackedIds.patientIds?.length) {
    await prisma.patient.deleteMany({ where: { id: { in: trackedIds.patientIds } } });
  }
  if (trackedIds.userIds?.length) {
    await prisma.user.deleteMany({ where: { id: { in: trackedIds.userIds } } });
  }
}
