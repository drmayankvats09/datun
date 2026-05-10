// ═══════════════════════════════════════════════════════════════
// COMPOSER: Clinic + Owner + Doctors
// Realistic clinic = 1 owner (User+Doctor combo) + 2-8 staff doctors
// ═══════════════════════════════════════════════════════════════

import type { Clinic, Doctor, PrismaClient, User } from '@prisma/client';
import { clinicFactory } from '../primitives/clinic.factory';
import { doctorFactory } from '../primitives/doctor.factory';
import { userFactory } from '../primitives/user.factory';

export interface ClinicWithStaff {
  readonly clinic: Clinic;
  readonly ownerUser: User;
  readonly ownerDoctor: Doctor;
  readonly staffDoctors: readonly Doctor[];
  readonly staffUsers: readonly User[];
}

export function buildClinicWithStaff(transient?: {
  staffCount?: number;
  cityTier?: 'tier-1' | 'tier-2' | 'tier-3';
}): ClinicWithStaff {
  const staffCount = transient?.staffCount ?? 3;

  const ownerUser = userFactory.build(undefined, { primaryRole: 'OWNER' });
  const clinic = clinicFactory.build(undefined, {
    ownerId: ownerUser.id,
    cityTier: transient?.cityTier,
  });
  const ownerDoctor = doctorFactory.build(
    { yearsExperience: 15 },
    { userId: ownerUser.id, clinicId: clinic.id, specialization: 'General Dentistry' },
  );

  const staffUsers: User[] = [];
  const staffDoctors: Doctor[] = [];
  for (let i = 0; i < staffCount; i++) {
    const u = userFactory.build(undefined, { primaryRole: 'DOCTOR' });
    const d = doctorFactory.build(undefined, { userId: u.id, clinicId: clinic.id });
    staffUsers.push(u);
    staffDoctors.push(d);
  }

  return { clinic, ownerUser, ownerDoctor, staffDoctors, staffUsers };
}

export async function createClinicWithStaff(
  prisma: PrismaClient,
  transient?: { staffCount?: number; cityTier?: 'tier-1' | 'tier-2' | 'tier-3' },
): Promise<ClinicWithStaff> {
  const built = buildClinicWithStaff(transient);
  return prisma.$transaction(async (tx) => {
    const ownerUser = await tx.user.create({ data: built.ownerUser as never });
    const clinic = await tx.clinic.create({
      data: { ...built.clinic, ownerId: ownerUser.id } as never,
    });
    const ownerDoctor = await tx.doctor.create({
      data: { ...built.ownerDoctor, userId: ownerUser.id, clinicId: clinic.id },
    });

    const staffUsers: User[] = [];
    const staffDoctors: Doctor[] = [];
    for (let i = 0; i < built.staffUsers.length; i++) {
      const u = await tx.user.create({ data: built.staffUsers[i]! as never });
      const d = await tx.doctor.create({
        data: { ...built.staffDoctors[i]!, userId: u.id, clinicId: clinic.id },
      });
      staffUsers.push(u);
      staffDoctors.push(d);
    }

    return { clinic, ownerUser, ownerDoctor, staffDoctors, staffUsers };
  });
}
