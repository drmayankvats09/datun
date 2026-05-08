// ═══════════════════════════════════════════════════════════════
// DATUN SLOs — production targets
// Field-aligned to real Consultation schema (status enum, promptVersion)
// ═══════════════════════════════════════════════════════════════
import type { SloDefinition } from './slo.types';

export const PATIENT_FRESHNESS_SLO: SloDefinition = {
  name: 'patient-freshness-1h',
  description: '99% of Patient rows have createdAt within last 1 hour during business hours',
  target: 0.99,
  windowSeconds: 3600,
  query: async (prisma) => {
    const cutoff = new Date(Date.now() - 3600_000);
    const total = await prisma.patient.count();
    const fresh = await prisma.patient.count({ where: { createdAt: { gte: cutoff } } });
    return { good: fresh, total: Math.max(total, 1) };
  },
};

export const CONSULTATION_COMPLETION_SLO: SloDefinition = {
  name: 'consultation-completion-rate-24h',
  description: '95% of consultations completed within 24h of creation',
  target: 0.95,
  windowSeconds: 86_400,
  query: async (prisma) => {
    const since = new Date(Date.now() - 86_400_000);
    const all = await prisma.consultation.count({ where: { createdAt: { gte: since } } });
    const completed = await prisma.consultation.count({
      where: { createdAt: { gte: since }, status: 'COMPLETED' as never },
    } as never);
    return { good: completed, total: Math.max(all, 1) };
  },
};

export const AI_PROMPT_VERSION_COVERAGE_SLO: SloDefinition = {
  name: 'ai-prompt-version-coverage',
  description: '99.9% of consultations have promptVersion populated',
  target: 0.999,
  windowSeconds: 86_400,
  query: async (prisma) => {
    const since = new Date(Date.now() - 86_400_000);
    const all = await prisma.consultation.count({ where: { createdAt: { gte: since } } });
    const populated = await prisma.consultation.count({
      where: { createdAt: { gte: since }, promptVersion: { not: null } },
    } as never);
    return { good: populated, total: Math.max(all, 1) };
  },
};

export const ALL_SLOS: readonly SloDefinition[] = [
  PATIENT_FRESHNESS_SLO,
  CONSULTATION_COMPLETION_SLO,
  AI_PROMPT_VERSION_COVERAGE_SLO,
];
