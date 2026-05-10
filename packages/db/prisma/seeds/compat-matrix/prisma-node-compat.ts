// ═══════════════════════════════════════════════════════════════
// PRISMA / NODE COMPAT — assertion-based; CI matrix expands envs
// ═══════════════════════════════════════════════════════════════
import { Prisma } from '@prisma/client';

export interface CompatReport {
  prismaVersion: string;
  nodeVersion: string;
  os: string;
  arch: string;
  errors: string[];
}

export function checkCompatibility(): CompatReport {
  const errors: string[] = [];
  const prismaVersion = Prisma.prismaVersion.client;
  const nodeMajor = Number(process.version.replace(/^v/, '').split('.')[0]);

  // Prisma 6+ required
  const [pmaj] = prismaVersion.split('.');
  if (Number(pmaj) < 6) errors.push(`Prisma ${prismaVersion} too old (need ≥6.0.0)`);

  // Node 20+ required
  if (nodeMajor < 20) errors.push(`Node ${process.version} too old (need ≥20.0.0)`);

  // Warn on bleeding edge
  if (nodeMajor > 24) errors.push(`Node ${process.version} not yet validated`);

  return {
    prismaVersion,
    nodeVersion: process.version,
    os: process.platform,
    arch: process.arch,
    errors,
  };
}
