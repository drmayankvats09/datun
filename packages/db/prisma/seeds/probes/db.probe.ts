import { PrismaClient } from '@prisma/client';
import type { Probe } from './probe.types';

export const dbProbe: Probe = {
  name: 'database',
  criticality: 'p0',
  timeoutMs: 5_000,
  run: async (signal) => {
    const start = performance.now();
    const prisma = new PrismaClient();
    try {
      if (signal.aborted) throw signal.reason;
      const res = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
      const lat = Math.round(performance.now() - start);
      return {
        name: 'database',
        status: lat < 100 ? 'green' : lat < 500 ? 'yellow' : 'red',
        latencyMs: lat,
        message: `SELECT 1 returned ${res[0]?.ok}`,
        timestamp: new Date(),
      };
    } finally {
      await prisma.$disconnect();
    }
  },
};
