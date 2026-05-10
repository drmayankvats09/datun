// ═══════════════════════════════════════════════════════════════
// BENCH REPORT — markdown + JSON output for CI artifacts
// ═══════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync } from 'node:fs';

interface BenchData {
  iterations: number;
  medianDurationMs: number;
  p99DurationMs: number;
  medianHeapMb: number;
  medianRowsPerSec: number;
}

export function generateMarkdownReport(jsonPath: string, mdPath: string): void {
  const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
    results: unknown[];
    summary: BenchData;
  };
  const md = `# Datun Seed — Bench Report

**Iterations:** ${data.summary.iterations}

| Metric | Value |
|--------|-------|
| Median duration | ${data.summary.medianDurationMs} ms |
| p99 duration | ${data.summary.p99DurationMs} ms |
| Median heap peak | ${data.summary.medianHeapMb} MB |
| Median rows/sec | ${data.summary.medianRowsPerSec.toLocaleString()} |

## Per-iteration

\`\`\`json
${JSON.stringify(data.results, null, 2)}
\`\`\`

_Generated: ${new Date().toISOString()}_
`;
  writeFileSync(mdPath, md);
}
