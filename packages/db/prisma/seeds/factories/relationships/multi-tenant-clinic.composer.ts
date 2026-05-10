// ═══════════════════════════════════════════════════════════════
// MULTI-TENANT CLINIC COMPOSER — Full per-clinic isolated dataset
// Each clinic gets its own namespace: owner + doctors + patients
//   + consultations + appointments — zero cross-clinic leakage.
// ═══════════════════════════════════════════════════════════════

import type {
  Appointment,
  Clinic,
  Consultation,
  Doctor,
  Patient,
  PrismaClient,
  User,
} from '@prisma/client';
import { setTenantScope, clearTenantScope, withTenantScope } from '../core/tenant-scope';
import { buildClinicWithStaff } from './clinic-with-doctors.composer';
import { buildPatientJourney } from './journey-composer';

export interface MultiTenantClinicResult {
  readonly clinic: Clinic;
  readonly ownerUser: User;
  readonly ownerDoctor: Doctor;
  readonly staffDoctors: readonly Doctor[];
  readonly staffUsers: readonly User[];
  readonly patients: readonly Patient[];
  readonly patientUsers: readonly User[];
  readonly consultations: readonly Consultation[];
  readonly appointments: readonly Appointment[];
}

export interface MultiTenantClinicOptions {
  readonly cityTier?: 'tier-1' | 'tier-2' | 'tier-3';
  readonly subscriptionTier?: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  readonly staffCount?: number;
  readonly patientCount?: number;
  readonly avgConsultationsPerPatient?: number;
  readonly seed?: number;
}

export async function createMultiTenantClinic(
  prisma: PrismaClient,
  opts: MultiTenantClinicOptions = {},
): Promise<MultiTenantClinicResult> {
  const staffCount = opts.staffCount ?? 3;
  const patientCount = opts.patientCount ?? 50;

  // Build clinic + staff (use existing composer)
  const clinicScope = buildClinicWithStaff({
    staffCount,
    cityTier: opts.cityTier,
  });

  // Persist clinic foundation
  const persistedFoundation = await prisma.$transaction(async (tx) => {
    const ownerUser = await tx.user.create({ data: clinicScope.ownerUser as never });
    const clinic = await tx.clinic.create({
      data: { ...clinicScope.clinic, ownerId: ownerUser.id } as never,
    });
    const ownerDoctor = await tx.doctor.create({
      data: { ...clinicScope.ownerDoctor, userId: ownerUser.id, clinicId: clinic.id },
    });
    const staffUsers: User[] = [];
    const staffDoctors: Doctor[] = [];
    for (let i = 0; i < clinicScope.staffUsers.length; i++) {
      const u = await tx.user.create({ data: clinicScope.staffUsers[i]! as never });
      const d = await tx.doctor.create({
        data: { ...clinicScope.staffDoctors[i]!, userId: u.id, clinicId: clinic.id },
      });
      staffUsers.push(u);
      staffDoctors.push(d);
    }
    return { clinic, ownerUser, ownerDoctor, staffUsers, staffDoctors };
  });

  // Now within tenant scope generate patients + journeys
  const allPatients: Patient[] = [];
  const allPatientUsers: User[] = [];
  const allConsultations: Consultation[] = [];
  const allAppointments: Appointment[] = [];

  await withTenantScope(
    {
      clinicId: persistedFoundation.clinic.id,
      clinicSlug: persistedFoundation.clinic.slug,
      defaultLocale: 'hindi',
      timezone: persistedFoundation.clinic.timezone,
      cityName: persistedFoundation.clinic.city,
      phonePrefix: '+919999',
    },
    async () => {
      for (let i = 0; i < patientCount; i++) {
        const journey = buildPatientJourney({
          homeClinicId: persistedFoundation.clinic.id,
          seed: (opts.seed ?? 0) + i,
        });

        await prisma.$transaction(async (tx) => {
          const u = await tx.user.create({ data: journey.user as never });
          const p = await tx.patient.create({
            data: { ...journey.patient, userId: u.id } as never,
          });
          allPatientUsers.push(u);
          allPatients.push(p);

          for (const c of journey.consultations) {
            allConsultations.push(await tx.consultation.create({ data: c as never }));
          }
          for (const a of journey.appointments) {
            allAppointments.push(await tx.appointment.create({ data: a as never }));
          }
        });
      }
    },
  );

  return {
    ...persistedFoundation,
    patients: allPatients,
    patientUsers: allPatientUsers,
    consultations: allConsultations,
    appointments: allAppointments,
  };
}
