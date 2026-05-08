import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { JsonlExporter } from '../../exporters/jsonl-exporter';
import { CsvExporter } from '../../exporters/csv-exporter';
import { AnonymizedDumpExporter } from '../../exporters/anonymized-dump-exporter';
import { FineTuningDatasetExporter } from '../../exporters/fine-tuning-dataset';
import type { ComplianceProfile } from '../../anonymization';

export function registerExportCommand(program: Command): void {
  const exp = program.command('export').description('Export data in various formats');

  exp
    .command('jsonl')
    .description('Export tables as JSONL')
    .requiredOption('-o, --output <path>', 'Output path')
    .option('-t, --tables <csv>', 'Tables to export', 'patient,consultation,prescription')
    .option('--anonymize', 'Apply DPDP anonymization', false)
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const e = new JsonlExporter(prisma);
        const r = await e.export({
          format: 'JSONL',
          outputPath: opts.output,
          anonymize: opts.anonymize,
          tables: (opts.tables as string).split(','),
        });
        console.log(
          `✓ Exported ${r.rowsExported} rows to ${r.outputPath} (${r.bytesWritten} bytes)`,
        );
      } finally {
        await prisma.$disconnect();
      }
    });

  exp
    .command('csv')
    .description('Export single table as CSV')
    .requiredOption('-t, --table <name>', 'Table name')
    .requiredOption('-o, --output <path>', 'Output path')
    .option('--anonymize', 'Apply DPDP anonymization', false)
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const e = new CsvExporter(prisma);
        const r = await e.export({
          format: 'CSV',
          tableName: opts.table,
          outputPath: opts.output,
          anonymize: opts.anonymize,
        });
        console.log(`✓ Exported ${r.rowsExported} rows to ${r.outputPath}`);
      } finally {
        await prisma.$disconnect();
      }
    });

  exp
    .command('dump')
    .description('Anonymized full DB dump (gzip + S3 upload optional)')
    .requiredOption('-o, --output <path>', 'Output path')
    .option('--compliance <profile>', 'DPDP|HIPAA|GDPR|DPDP_HIPAA|DPDP_HIPAA_GDPR', 'DPDP')
    .option('--compression <algo>', 'gzip|zstd|none', 'gzip')
    .option('--s3-bucket <name>', 'Upload to S3 bucket')
    .option('--s3-prefix <prefix>', 'S3 key prefix', 'datun-exports')
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const e = new AnonymizedDumpExporter(prisma);
        const r = await e.export({
          outputPath: opts.output,
          compliance: opts.compliance as ComplianceProfile,
          compression: opts.compression,
          s3Bucket: opts.s3Bucket,
          s3Prefix: opts.s3Prefix,
        });
        console.log(`✓ Dump: ${r.outputPath} (${r.bytesWritten} bytes, hash=${r.contentHash})`);
        if (r.s3Url) console.log(`  S3: ${r.s3Url}`);
        console.log(`  Manifest: ${r.manifestPath}`);
      } finally {
        await prisma.$disconnect();
      }
    });

  exp
    .command('fine-tuning')
    .description('Export consultation transcripts as fine-tuning dataset')
    .requiredOption('-o, --output <path>', 'Output JSONL path')
    .option('-f, --format <name>', 'openai|anthropic|huggingface', 'openai')
    .option('--min-quality <n>', 'Minimum quality score (1-5)', '4')
    .option('--anonymize', 'Apply DPDP anonymization', true)
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const e = new FineTuningDatasetExporter(prisma);
        const r = await e.export({
          outputPath: opts.output,
          format: opts.format,
          minQuality: parseInt(opts.minQuality, 10),
          anonymize: opts.anonymize,
        });
        console.log(`✓ FT dataset: ${r.rowsExported} conversations to ${r.outputPath}`);
      } finally {
        await prisma.$disconnect();
      }
    });
}
