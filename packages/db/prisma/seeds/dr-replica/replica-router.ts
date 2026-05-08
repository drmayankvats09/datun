// ═══════════════════════════════════════════════════════════════
// REPLICA ROUTER — route reads to replica, writes to primary
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';

export interface ReplicaRouterOptions {
  primaryUrl: string;
  replicaUrl: string;
  /** Allow reads from replica only when lag < this many seconds */
  maxLagSeconds: number;
}

export class ReplicaRouter {
  private primary: PrismaClient;
  private replica: PrismaClient;

  constructor(private readonly opts: ReplicaRouterOptions) {
    this.primary = new PrismaClient({ datasources: { db: { url: opts.primaryUrl } } });
    this.replica = new PrismaClient({ datasources: { db: { url: opts.replicaUrl } } });
  }

  async forRead(): Promise<PrismaClient> {
    const lag = await this.measureLag();
    return lag <= this.opts.maxLagSeconds ? this.replica : this.primary;
  }

  forWrite(): PrismaClient {
    return this.primary;
  }

  async measureLag(): Promise<number> {
    const r = await this.replica.$queryRaw<
      Array<{ lag: number }>
    >`SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as lag`;
    return Number(r[0]?.lag ?? 999);
  }

  async shutdown(): Promise<void> {
    await Promise.all([this.primary.$disconnect(), this.replica.$disconnect()]);
  }
}
