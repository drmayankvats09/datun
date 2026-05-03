/**
 * audit-extensions.ts — capture installed Postgres extensions.
 *
 * Used by:
 *   - Nightly drift cron (extensions can be installed manually = drift)
 *   - Year-2 prep when we add pg_trgm and pgvector
 *
 * Output: JSON list of {name, version, schema} extensions.
 */

import { PrismaClient } from '@prisma/client';

interface ExtensionRow {
  name: string;
  version: string;
  schema: string;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<ExtensionRow[]>(
      `SELECT
         e.extname AS name,
         e.extversion AS version,
         n.nspname AS schema
       FROM pg_extension e
       JOIN pg_namespace n ON e.extnamespace = n.oid
       ORDER BY e.extname`,
    );
    console.log(JSON.stringify(rows, null, 2));
    console.log(`\nTotal extensions: ${rows.length}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('audit-extensions crashed:', err);
    process.exit(2);
  });
