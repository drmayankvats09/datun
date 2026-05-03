/**
 * pre-migration-validate.ts — data integrity sanity checks pre-deploy.
 *
 * Runs a battery of read-only queries that verify the database is in a
 * state that CAN accept the next migration. Catches things like:
 *   - Orphan FK references that a future migration's FK constraint would reject
 *   - NULL values in columns that a future NOT NULL migration would reject
 *   - Duplicate values in columns that a future UNIQUE migration would reject
 *
 * This is a safety harness — every check is read-only.
 *
 * Add new checks as schema evolves. Each check returns:
 *   { name, passed, details }
 */

import { PrismaClient } from '@prisma/client';

interface ValidationCheck {
  name: string;
  passed: boolean;
  details: string;
}

async function checkOrphanConsultations(prisma: PrismaClient): Promise<ValidationCheck> {
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*)::bigint AS count
     FROM consultations c
     LEFT JOIN users u ON c."userId" = u.id
     WHERE c."userId" IS NOT NULL AND u.id IS NULL`,
  );
  const count = Number(result[0]?.count ?? 0n);
  return {
    name: 'no-orphan-consultations',
    passed: count === 0,
    details:
      count === 0 ? 'All consultations have valid users' : `${count} orphan consultation(s) found`,
  };
}

async function checkUserEmailUnique(prisma: PrismaClient): Promise<ValidationCheck> {
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*)::bigint AS count FROM (
       SELECT email FROM users WHERE email IS NOT NULL GROUP BY email HAVING count(*) > 1
     ) dup`,
  );
  const count = Number(result[0]?.count ?? 0n);
  return {
    name: 'user-email-unique',
    passed: count === 0,
    details: count === 0 ? 'All emails unique' : `${count} duplicate email(s) found`,
  };
}

async function checkClinicSlugUnique(prisma: PrismaClient): Promise<ValidationCheck> {
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*)::bigint AS count FROM (
       SELECT slug FROM clinics WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1
     ) dup`,
  );
  const count = Number(result[0]?.count ?? 0n);
  return {
    name: 'clinic-slug-unique',
    passed: count === 0,
    details: count === 0 ? 'All slugs unique' : `${count} duplicate slug(s) found`,
  };
}

async function main(): Promise<number> {
  console.log('Pre-migration data validation\n');
  const prisma = new PrismaClient();

  const checks: ValidationCheck[] = [];
  try {
    checks.push(await checkOrphanConsultations(prisma));
    checks.push(await checkUserEmailUnique(prisma));
    checks.push(await checkClinicSlugUnique(prisma));
  } finally {
    await prisma.$disconnect();
  }

  let exitCode = 0;
  for (const c of checks) {
    const icon = c.passed ? '✓' : '✗';
    console.log(`${icon} ${c.name}: ${c.details}`);
    if (!c.passed) exitCode = 1;
  }

  console.log('');
  console.log(
    exitCode === 0
      ? 'All integrity checks passed — proceed with migration.'
      : 'Integrity violation — fix data before applying migration.',
  );
  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('pre-migration-validate crashed:', err);
    process.exit(2);
  });
