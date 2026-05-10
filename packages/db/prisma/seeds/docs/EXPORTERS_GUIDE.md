# Datun Exporters Guide

The export layer ships seven exporters, all plumbing through a common `ExportResult` contract.

## Format selection matrix

| Need                                      | Exporter                    |
| ----------------------------------------- | --------------------------- |
| Streaming line-by-line, BigQuery / OpenAI | `JsonlExporter`             |
| Excel / spreadsheet, single table         | `CsvExporter`               |
| Full DB dump, restore via `pg_restore`    | `runPgDump` wrapper         |
| PII-safe staging refresh                  | `AnonymizedDumpExporter`    |
| LLM fine-tuning datasets                  | `FineTuningDatasetExporter` |
| Analytics warehouse load                  | `BigQueryExporter`          |
| Long-term archival (Parquet)              | `ParquetExporter`           |

## JSONL streaming

```typescript
import { JsonlExporter } from '@/seeds/exporters';
const e = new JsonlExporter(prisma);
const r = await e.export({
  format: 'JSONL',
  outputPath: './out/datun-2026-05-04.jsonl',
  anonymize: true,
  anonymizeProfile: 'DPDP',
  tables: ['patient', 'consultation', 'prescription'],
});
console.log(r.rowsExported, r.contentHash);
```

The exporter writes one JSON object per line, prefixed with a `_table` discriminator so multiple tables can share a single file.

## Anonymized dump pipeline

`AnonymizedDumpExporter` chains four phases:

1. JSONL export with PII masking
2. Optional gzip / zstd compression
3. Manifest sidecar (`*.manifest.json`)
4. Optional S3 multipart upload (server-side encryption, `STANDARD_IA` storage class)

Use this for the weekly `seed-export-snapshot` workflow.

## OpenAI fine-tuning

```bash
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts export fine-tuning \
  --output ./out/datun-ft.jsonl \
  --format openai \
  --min-quality 4 \
  --anonymize
```

Output format matches OpenAI's chat-completion fine-tuning spec:

```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

`--format anthropic` produces Claude-compatible turns; `--format huggingface` produces ShareGPT-style.

## BigQuery loading

```bash
pnpm --filter @repo/db exec tsx prisma/seeds/cli/index.ts export jsonl \
  --output ./out/bq.jsonl \
  --tables patient,consultation
gsutil cp ./out/bq.jsonl gs://datun-warehouse/incoming/
bq load --source_format=NEWLINE_DELIMITED_JSON --autodetect \
  datun_analytics.patient_daily_$(date +%Y%m%d) \
  gs://datun-warehouse/incoming/bq.jsonl
```

The `BigQueryExporter` returns the exact `bq load` command for convenience.

## Manifest format

Every export writes a sidecar manifest:

```json
{
  "exportPath": "./out/datun-2026-05-04.jsonl.gz",
  "bytesWritten": 1048576,
  "rowsExported": 12345,
  "contentHash": "a1b2c3d4...",
  "compliance": "DPDP",
  "compression": "gzip",
  "tables": ["patient", "consultation"],
  "generatedAt": "2026-05-04T12:34:56.789Z",
  "schemaVersion": "1.0",
  "classification": "restricted",
  "retentionDays": 90,
  "generatedBy": "datun-seed-cli@v20.10.0"
}
```

Always retain the manifest alongside the data file — it documents provenance for compliance audits.
