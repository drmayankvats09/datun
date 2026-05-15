// ═══════════════════════════════════════════════════════════════
// USER FACTORY — Auth-layer User entity (B-3 v2)
//
// Schema alignment (packages/db/prisma/schema.prisma → model User):
//   Required:  id, email (unique), name (@default("")), languagePreference,
//              primaryRole (@default(PATIENT)), isEmailVerified, isPhoneVerified,
//              isActive, subscriptionTier (@default(FREE)), createdAt, updatedAt
//   Optional:  phone, passwordHash, avatarUrl, firstName, lastName, fullName,
//              role (deprecated mirror of primaryRole), googleId, appleId,
//              dateOfBirth, gender, city, state, pincode, latitude, longitude,
//              lastLoginAt, lastLoginIp, lastLoginDevice, referralCode,
//              referredById, metadata, deletedAt
//
// Roles supported (UserPrimaryRole enum):
//   PATIENT, CLINIC_OWNER, CLINIC_STAFF, DOCTOR, OWNER, ADMIN, SUPER_ADMIN
//
// Phone format: +91 99999 XXXXX (Indian reserved testing block — DPDP-safe)
// Email format: <role>-N@example.com (RFC 2606 reserved test domain)
//
// CRITICAL: Email + phone MUST be role-prefixed because each role-scoped
// module (admin/owner/doctor/patient/team) calls resetSequences() which
// resets `sequence` to 1. Without role prefix, email collisions across
// roles cause @unique violations → users silently dropped via skipDuplicates
// → downstream FK violations (e.g., clinics_ownerId_fkey).
// ═══════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs';
import { Prisma, type User, type UserPrimaryRole } from '@prisma/client';
import { defineFactory, prismaInput, toNullableJsonInput } from '../core';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS — Inlined to remove cross-module dependency.
// Mirror of values in packages/db/prisma/seeds/constants/limits.ts.
// ─────────────────────────────────────────────────────────────────
const TEST_EMAIL_DOMAIN = 'example.com';
const TEST_PHONE_PREFIX = '+9199999';
const SEED_BCRYPT_ROUNDS = 4; // Low rounds for seed perf; production = 12

// ─────────────────────────────────────────────────────────────────
// TRANSIENT — Build-time inputs not present in output
// ─────────────────────────────────────────────────────────────────
interface UserTransient {
  /** Plain password to hash (default: 'Password123!') */
  readonly password?: string;
  /** Skip bcrypt hashing — uses placeholder hash for fast tests */
  readonly skipHash?: boolean;
  /** Force specific primary role (default: PATIENT) */
  readonly primaryRole?: UserPrimaryRole;
}

// ─────────────────────────────────────────────────────────────────
// FACTORY DEFINITION
// ─────────────────────────────────────────────────────────────────
export const userFactory = defineFactory<User, UserTransient>({
  name: 'user',
  defaultTransient: {
    password: 'Password123!',
    skipHash: false,
    primaryRole: 'PATIENT',
  },

  build: ({ sequence, faker, transient }) => {
    const primaryRole: UserPrimaryRole = transient.primaryRole ?? 'PATIENT';
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;

    const passwordHash = transient.skipHash
      ? '$2a$04$placeholderhash.skipHash.true'
      : bcrypt.hashSync(transient.password ?? 'Password123!', SEED_BCRYPT_ROUNDS);

    // ── Role-prefix unique email + phone (fixes @unique collision across role-scoped resetSequences) ──
    const rolePrefix = primaryRole.toLowerCase();
    const rolePhonePrefix =
      primaryRole === 'ADMIN'
        ? '90'
        : primaryRole === 'OWNER'
          ? '91'
          : primaryRole === 'DOCTOR'
            ? '92'
            : primaryRole === 'PATIENT'
              ? '93'
              : primaryRole === 'CLINIC_STAFF'
                ? '94'
                : primaryRole === 'SUPER_ADMIN'
                  ? '95'
                  : '99';

    return {
      id: faker.string.uuid(),
      email: `${rolePrefix}-${sequence}@${TEST_EMAIL_DOMAIN}`,
      phone: `${TEST_PHONE_PREFIX}${rolePhonePrefix}${String(sequence).padStart(3, '0').slice(-3)}`,
      passwordHash,
      name: fullName,
      avatarUrl: null,
      avatarMediaId: null,

      firstName,
      lastName,
      fullName,
      role: primaryRole, // deprecated mirror — kept for back-compat
      googleId: null,
      appleId: null,
      dateOfBirth: null,
      gender: null,
      languagePreference: 'en',
      city: null,
      state: null,
      pincode: null,
      latitude: null,
      longitude: null,
      primaryRole,

      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      lastLoginAt: faker.date.recent({ days: 30 }),
      lastLoginIp: null,
      lastLoginDevice: null,

      referralCode: null,
      referredById: null,
      subscriptionTier: 'FREE',
      metadata: null,

      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as User;
  },

  persist: async (user, prisma) => {
    const u = user as Record<string, unknown>;
    const created = await prisma.user.create({
      data: prismaInput<Prisma.UserUncheckedCreateInput>({
        id: u.id as string,
        email: u.email as string,
        phone: (u.phone as string | null | undefined) ?? null,
        passwordHash: (u.passwordHash as string | null | undefined) ?? null,
        name: (u.name as string | undefined) ?? '',
        avatarUrl: (u.avatarUrl as string | null | undefined) ?? null,
        avatarMediaId: (u.avatarMediaId as string | null | undefined) ?? null,

        firstName: (u.firstName as string | null | undefined) ?? null,
        lastName: (u.lastName as string | null | undefined) ?? null,
        fullName: (u.fullName as string | null | undefined) ?? null,
        role: (u.role as UserPrimaryRole | null | undefined) ?? null,
        googleId: (u.googleId as string | null | undefined) ?? null,
        appleId: (u.appleId as string | null | undefined) ?? null,
        dateOfBirth: (u.dateOfBirth as Date | null | undefined) ?? null,
        gender:
          (u.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null | undefined) ??
          null,
        languagePreference: (u.languagePreference as string | undefined) ?? 'en',
        city: (u.city as string | null | undefined) ?? null,
        state: (u.state as string | null | undefined) ?? null,
        pincode: (u.pincode as string | null | undefined) ?? null,
        latitude: (u.latitude as number | null | undefined) ?? null,
        longitude: (u.longitude as number | null | undefined) ?? null,
        primaryRole:
          (u.primaryRole as UserPrimaryRole | undefined) ??
          (u.role as UserPrimaryRole | undefined) ??
          'PATIENT',

        isEmailVerified: (u.isEmailVerified as boolean | undefined) ?? true,
        isPhoneVerified: (u.isPhoneVerified as boolean | undefined) ?? true,
        isActive: (u.isActive as boolean | undefined) ?? true,
        lastLoginAt: (u.lastLoginAt as Date | null | undefined) ?? null,
        lastLoginIp: (u.lastLoginIp as string | null | undefined) ?? null,
        lastLoginDevice: (u.lastLoginDevice as string | null | undefined) ?? null,

        referralCode: (u.referralCode as string | null | undefined) ?? null,
        referredById: (u.referredById as string | null | undefined) ?? null,
        subscriptionTier: (u.subscriptionTier as 'FREE' | 'PRO' | undefined) ?? 'FREE',
        metadata: toNullableJsonInput(u.metadata),
      }),
    });
    return created as unknown as User;
  },
});

// ─────────────────────────────────────────────────────────────────
// Convenience builders — primaryRole driven through transient (clean pattern)
// ─────────────────────────────────────────────────────────────────
export const buildPatientUser = (overrides?: Partial<User>) =>
  userFactory.build(overrides, { primaryRole: 'PATIENT' });

export const buildDoctorUser = (overrides?: Partial<User>) =>
  userFactory.build(overrides, { primaryRole: 'DOCTOR' });

export const buildClinicOwner = (overrides?: Partial<User>) =>
  userFactory.build(overrides, { primaryRole: 'OWNER' });

export const buildAdminUser = (overrides?: Partial<User>) =>
  userFactory.build(overrides, { primaryRole: 'ADMIN' });

export const buildSuperAdminUser = (overrides?: Partial<User>) =>
  userFactory.build(overrides, { primaryRole: 'SUPER_ADMIN' });

export const buildClinicStaffUser = (overrides?: Partial<User>) =>
  userFactory.build(overrides, { primaryRole: 'CLINIC_STAFF' });
