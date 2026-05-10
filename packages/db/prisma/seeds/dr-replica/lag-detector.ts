// ═══════════════════════════════════════════════════════════════
// LAG DETECTOR — alert if replica falls behind threshold
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';

export interface LagAlert {
  replica: string;
  lagSeconds: number;
  thresholdSeconds: number;
  status: 'healthy' | 'warning' | 'critical';
  observedAt: Date;
}

export async function checkReplicaLag(
  replicaUrl: string,
  warningS: number,
  criticalS: number,
): Promise<LagAlert> {
  const prisma = new PrismaClient({ datasources: { db: { url: replicaUrl } } });
  try {
    const r = await prisma.$queryRaw<
      Array<{ lag: number | null }>
    >`SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as lag`;
    const lag = Number(r[0]?.lag ?? 0);
    const status: LagAlert['status'] =
      lag >= criticalS ? 'critical' : lag >= warningS ? 'warning' : 'healthy';
    return {
      replica: replicaUrl,
      lagSeconds: lag,
      thresholdSeconds: criticalS,
      status,
      observedAt: new Date(),
    };
  } finally {
    await prisma.$disconnect();
  }
}
