// ═══════════════════════════════════════════════════════════════
// FINE-TUNING DATASET EXPORTER — OpenAI / Anthropic / HuggingFace format
// Source: ndjson.com — JSONL is the canonical FT format
// ═══════════════════════════════════════════════════════════════

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { AnonymizationEngine } from '../anonymization';
import type { ExportResult } from './exporter.types';

export interface FineTuningExportOptions {
  readonly outputPath: string;
  readonly format: 'openai' | 'anthropic' | 'huggingface';
  readonly minQuality?: number;
  readonly anonymize?: boolean;
}

interface MessageTurn {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export class FineTuningDatasetExporter {
  constructor(private readonly prisma: PrismaClient) {}

  async export(opts: FineTuningExportOptions): Promise<ExportResult> {
    const start = Date.now();
    await mkdir(path.dirname(opts.outputPath), { recursive: true });

    const stream = createWriteStream(opts.outputPath, { encoding: 'utf-8' });
    const hasher = createHash('sha256');
    let rowsExported = 0;
    let bytesWritten = 0;

    const messages = await this.fetchHighQualityConsultations(opts.minQuality ?? 4);
    const engine = opts.anonymize ? new AnonymizationEngine('DPDP') : null;

    for (const conversation of messages) {
      const anonymized = engine
        ? (await engine.anonymizeRecords('consultationMessage', conversation)).records
        : conversation;

      const turns: MessageTurn[] = anonymized.map((m: Record<string, unknown>) => ({
        role: (m as Record<string, unknown>).role === 'PATIENT' ? 'user' : 'assistant',
        content: String((m as Record<string, unknown>).content ?? ''),
      }));

      let line = '';
      switch (opts.format) {
        case 'openai':
          line = `${JSON.stringify({ messages: turns })}\n`;
          break;
        case 'anthropic':
          line = `${JSON.stringify({ messages: turns.filter((t) => t.role !== 'system') })}\n`;
          break;
        case 'huggingface':
          line = `${JSON.stringify({ conversations: turns.map((t) => ({ from: t.role, value: t.content })) })}\n`;
          break;
      }

      if (!stream.write(line)) await new Promise<void>((r) => stream.once('drain', () => r()));
      hasher.update(line);
      bytesWritten += Buffer.byteLength(line);
      rowsExported++;
    }

    await new Promise<void>((resolve, reject) =>
      stream.end((err?: Error | null) => (err ? reject(err) : resolve())),
    );

    return {
      success: true,
      outputPath: opts.outputPath,
      rowsExported,
      bytesWritten,
      durationMs: Date.now() - start,
      contentHash: hasher.digest('hex').slice(0, 16),
    };
  }

  private async fetchHighQualityConsultations(
    minQuality: number,
  ): Promise<readonly Record<string, unknown>[][]> {
    const labelModel = (
      this.prisma as unknown as {
        trainingLabel?: { findMany: (a: object) => Promise<{ consultationId: string }[]> };
      }
    ).trainingLabel;
    if (!labelModel?.findMany) return [];
    const labels = await labelModel.findMany({
      where: { qualityScore: { gte: minQuality } },
      select: { consultationId: true },
    });
    const grouped: Record<string, unknown>[][] = [];
    for (const l of labels) {
      const messages = await this.prisma.consultationMessage.findMany({
        where: { consultationId: l.consultationId },
        orderBy: { sequenceNumber: 'asc' }, // schema uses createdAt not turnIndex
      });
      if (messages.length > 0) grouped.push(messages);
    }
    return grouped;
  }
}
