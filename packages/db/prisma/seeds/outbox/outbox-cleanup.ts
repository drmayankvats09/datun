// ═══════════════════════════════════════════════════════════════
// CLEANUP — deletes published events older than retention window
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

export async function cleanupPublishedOutbox(
  prisma: PrismaClient,
  retentionDays = 7,
): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const result = await prisma.outboxEvent.deleteMany({
    where: { status: 'published', publishedAt: { lt: cutoff } },
  });
  return { deleted: result.count ?? 0 };
}

export async function archiveDeadLetters(
  prisma: PrismaClient,
  retentionDays = 90,
): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const result = await prisma.outboxDeadLetter.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deleted: result.count ?? 0 };
}
