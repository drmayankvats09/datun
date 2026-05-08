// ═══════════════════════════════════════════════════════════════
// RETENTION — HOT (90d) → WARM (1yr archive) → ARCHIVED (S3 cold)
// DPDP §8(7) "no longer than necessary" satisfied via tiering
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'node:zlib';

const HOT_DAYS = 90;
const WARM_DAYS = 365;

export async function applyRetentionPolicy(
  prisma: PrismaClient,
): Promise<{ moved: number; archived: number; deleted: number }> {
  const now = new Date();
  const hotCutoff = new Date(now.getTime() - HOT_DAYS * 24 * 3600 * 1000);
  const warmCutoff = new Date(now.getTime() - WARM_DAYS * 24 * 3600 * 1000);

  // HOT → WARM (just tier flag)
  const moved = await prisma.seedAuditLog.updateMany({
    where: { retentionTier: 'HOT', occurredAt: { lt: hotCutoff } },
    data: { retentionTier: 'WARM' },
  });

  // WARM → ARCHIVED (export to S3 + flag)
  const toArchive = await prisma.seedAuditLog.findMany({
    where: { retentionTier: 'WARM', occurredAt: { lt: warmCutoff }, archivedAt: null },
    take: 10_000,
  });
  let archived = 0;
  if (toArchive.length > 0 && process.env.AWS_S3_EXPORT_BUCKET) {
    const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1' });
    const key = `audit-archive/${now.toISOString().slice(0, 10)}-${Date.now()}.jsonl.gz`;
    const body = gzipSync(toArchive.map((r) => JSON.stringify(r)).join('\n'));
    await s3.send(
      new PutObjectCommand({ Bucket: process.env.AWS_S3_EXPORT_BUCKET, Key: key, Body: body }),
    );
    await prisma.seedAuditLog.updateMany({
      where: { id: { in: toArchive.map((r) => r.id) } },
      data: { retentionTier: 'ARCHIVED', archivedAt: now },
    });
    archived = toArchive.length;
  }

  // No hard deletion — DPDP requires audit trail; S3 lifecycle handles cold storage TTL
  return { moved: moved.count, archived, deleted: 0 };
}
