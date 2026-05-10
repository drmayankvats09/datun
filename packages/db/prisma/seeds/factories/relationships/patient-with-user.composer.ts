// ═══════════════════════════════════════════════════════════════
// COMPOSER: Patient + User (auth account)
// Each Patient must have a backing User account for authentication.
// ═══════════════════════════════════════════════════════════════

import type { Patient, PrismaClient, User } from '@prisma/client';
import { userFactory } from '../primitives/user.factory';
import { patientFactory } from '../patient/patient.factory';

export interface PatientWithUser {
  readonly user: User;
  readonly patient: Patient;
}

/** Build patient + user pair (in-memory, not persisted) */
export function buildPatientWithUser(transient?: {
  archetypeId?: string;
  preferredLocale?:
    | 'hindi'
    | 'english'
    | 'punjabi'
    | 'bengali'
    | 'tamil'
    | 'telugu'
    | 'marathi'
    | 'gujarati';
  homeClinicId?: string;
}): PatientWithUser {
  const user = userFactory.build({ role: 'PATIENT' });
  const patient = patientFactory.build(undefined, {
    userId: user.id,
    archetypeId: transient?.archetypeId,
    preferredLocale: transient?.preferredLocale,
    homeClinicId: transient?.homeClinicId,
  });
  return { user, patient };
}

/** Create patient + user pair (persisted in DB transaction) */
export async function createPatientWithUser(
  prisma: PrismaClient,
  transient?: {
    archetypeId?: string;
    preferredLocale?:
      | 'hindi'
      | 'english'
      | 'punjabi'
      | 'bengali'
      | 'tamil'
      | 'telugu'
      | 'marathi'
      | 'gujarati';
    homeClinicId?: string;
  },
): Promise<PatientWithUser> {
  const built = buildPatientWithUser(transient);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: built.user as never });
    const patient = await tx.patient.create({
      data: { ...built.patient, userId: user.id } as never,
    });
    return { user, patient };
  });
}
