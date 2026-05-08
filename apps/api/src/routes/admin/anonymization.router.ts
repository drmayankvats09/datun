// ═══════════════════════════════════════════════════════════════
// ADMIN — ANONYMIZATION
//
// On-demand DPDP/HIPAA/GDPR anonymization runs over selected models.
// Used for:
//   - Manual data export sanitization (legal request response)
//   - Staging-from-prod data refresh
//   - Compliance audits
//
// All admin routes are flag-gated via ADMIN_ROUTES_ENABLED at mount-time.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { AnonymizationEngine, type ComplianceProfile } from '@repo/db/prisma/seeds/anonymization';
import { validate } from '../../middleware/validate.js';
import { logger } from '../../lib/logger.js';

export const anonymizationRouter = Router();

// ─── Run anonymization on a sample dataset ────────────────────────
const RunSchema = z.object({
  body: z.object({
    profile: z.enum([
      'DPDP',
      'HIPAA',
      'GDPR',
      'DPDP_HIPAA',
      'DPDP_HIPAA_GDPR',
    ]) as z.ZodType<ComplianceProfile>,
    modelName: z.string().min(1),
    limit: z.number().int().min(1).max(1000).default(100),
    dryRun: z.boolean().default(true),
  }),
});

anonymizationRouter.post('/run', validate(RunSchema), async (req, res) => {
  const { profile, modelName, limit, dryRun } = req.body;

  // Fetch a sample dataset from the requested model
  const model = (
    prisma as unknown as Record<
      string,
      { findMany: (args: { take: number }) => Promise<Record<string, unknown>[]> }
    >
  )[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
  if (!model || typeof model.findMany !== 'function') {
    return res.status(400).json({ error: `Unknown model: ${modelName}` });
  }
  const dataset = await model.findMany({ take: limit });

  const engine = new AnonymizationEngine(profile, {
    operatorId: 'admin-route',
    purpose: dryRun ? 'admin-dry-run' : 'admin-live-run',
  });

  const result = await engine.anonymizeRecords(modelName, dataset, {
    writeAuditLog: !dryRun,
    validateKAnonymity: true,
  });

  logger.info('Anonymization run requested', {
    profile,
    modelName,
    count: dataset.length,
    dryRun,
    fieldsMasked: result.fieldsMasked,
    fieldsKept: result.fieldsKept,
    fieldsNullified: result.fieldsNullified,
  });

  return res.json({
    profile,
    modelName,
    dryRun,
    recordsProcessed: result.recordsProcessed,
    fieldsMasked: result.fieldsMasked,
    fieldsKept: result.fieldsKept,
    fieldsNullified: result.fieldsNullified,
    kAnonymityReport: result.kAnonymityReport,
    sample: result.records.slice(0, 5),
  });
});

// ─── List recent audit entries ────────────────────────────────────
anonymizationRouter.get('/audit/today', async (_req, res) => {
  // Placeholder: actual audit reader lives in seeds/anonymization/audit-trail.ts
  // Wired here as endpoint when audit DB-backed reader ships in a future task.
  return res.json({
    note: 'Audit entries are written to file system per anonymization run',
    location: process.env['SEED_AUDIT_DIR'] ?? './seeds/audit-logs',
  });
});
