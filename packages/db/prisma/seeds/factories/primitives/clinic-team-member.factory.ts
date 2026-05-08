// ═══════════════════════════════════════════════════════════════
// CLINIC TEAM MEMBER FACTORY — Non-doctor staff (receptionist, manager,
//   hygienist, dental assistant, accountant, billing-admin)
// 1 OWNER + 2-4 doctors + 3-7 staff = realistic Indian dental clinic
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';
import { TEST_PHONE_PREFIX } from '../../constants/limits';

type TeamMemberRole =
  | 'RECEPTIONIST'
  | 'CLINIC_MANAGER'
  | 'DENTAL_HYGIENIST'
  | 'DENTAL_ASSISTANT'
  | 'ACCOUNTANT'
  | 'BILLING_ADMIN'
  | 'FRONT_DESK'
  | 'INVENTORY_MANAGER';

interface TeamMemberOutput {
  readonly id: string;
  readonly clinicId: string;
  readonly userId: string;
  readonly role: TeamMemberRole;
  readonly title: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly email: string | null;
  readonly joinDate: Date;
  readonly salaryBandInr: { min: number; max: number };
  readonly permissions: readonly string[];
  readonly isActive: boolean;
  readonly languagesSpoken: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface TeamMemberTransient {
  readonly clinicId: string;
  readonly userId: string;
  readonly role?: TeamMemberRole;
}

const ROLE_DEFAULTS: Record<
  TeamMemberRole,
  { title: string; salaryMin: number; salaryMax: number; permissions: string[] }
> = {
  RECEPTIONIST: {
    title: 'Receptionist',
    salaryMin: 10000,
    salaryMax: 20000,
    permissions: ['view-appointments', 'book-appointments', 'view-patients'],
  },
  CLINIC_MANAGER: {
    title: 'Clinic Manager',
    salaryMin: 25000,
    salaryMax: 60000,
    permissions: ['manage-staff', 'view-finance', 'manage-inventory', 'view-all'],
  },
  DENTAL_HYGIENIST: {
    title: 'Dental Hygienist',
    salaryMin: 18000,
    salaryMax: 35000,
    permissions: ['view-patients', 'add-clinical-notes', 'perform-prophylaxis'],
  },
  DENTAL_ASSISTANT: {
    title: 'Dental Assistant',
    salaryMin: 12000,
    salaryMax: 25000,
    permissions: ['view-appointments', 'prepare-tools', 'assist-doctor'],
  },
  ACCOUNTANT: {
    title: 'Accountant',
    salaryMin: 20000,
    salaryMax: 45000,
    permissions: ['view-finance', 'manage-invoices', 'manage-payroll'],
  },
  BILLING_ADMIN: {
    title: 'Billing Admin',
    salaryMin: 15000,
    salaryMax: 30000,
    permissions: ['create-invoices', 'process-payments', 'manage-insurance-claims'],
  },
  FRONT_DESK: {
    title: 'Front Desk Executive',
    salaryMin: 12000,
    salaryMax: 22000,
    permissions: ['view-appointments', 'book-appointments'],
  },
  INVENTORY_MANAGER: {
    title: 'Inventory Manager',
    salaryMin: 18000,
    salaryMax: 35000,
    permissions: ['manage-inventory', 'order-supplies'],
  },
};

export const teamMemberFactory = defineFactory<TeamMemberOutput, TeamMemberTransient>({
  name: 'user' as 'user',
  defaultTransient: { clinicId: 'unknown', userId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const role =
      transient.role ??
      faker.helpers.weightedArrayElement([
        { weight: 30, value: 'RECEPTIONIST' as const },
        { weight: 20, value: 'DENTAL_ASSISTANT' as const },
        { weight: 15, value: 'DENTAL_HYGIENIST' as const },
        { weight: 12, value: 'CLINIC_MANAGER' as const },
        { weight: 10, value: 'BILLING_ADMIN' as const },
        { weight: 6, value: 'ACCOUNTANT' as const },
        { weight: 5, value: 'FRONT_DESK' as const },
        { weight: 2, value: 'INVENTORY_MANAGER' as const },
      ]);
    const defaults = ROLE_DEFAULTS[role];

    return {
      id: faker.string.uuid(),
      clinicId: transient.clinicId,
      userId: transient.userId,
      role,
      title: defaults.title,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: `${TEST_PHONE_PREFIX}${String(sequence).padStart(5, '0').slice(-5)}`,
      email: faker.helpers.maybe(() => faker.internet.email(), { probability: 0.6 }) ?? null,
      joinDate: faker.date.past({ years: 3 }),
      salaryBandInr: { min: defaults.salaryMin, max: defaults.salaryMax },
      permissions: defaults.permissions,
      isActive: faker.datatype.boolean({ probability: 0.92 }),
      languagesSpoken: faker.helpers.arrayElements(
        ['hindi', 'english', 'punjabi', 'bengali', 'tamil', 'telugu', 'marathi', 'gujarati'],
        { min: 1, max: 3 },
      ),
      createdAt: faker.date.past({ years: 3 }),
      updatedAt: new Date(),
    };
  },

  persist: async (member) => member,
});
