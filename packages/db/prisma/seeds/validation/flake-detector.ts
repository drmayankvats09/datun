// ═══════════════════════════════════════════════════════════════
// FLAKE DETECTOR — re-runs failing tests N times, quarantines if flaky
// Source: Google "Flaky tests at Google" (2017) heuristic
// ═══════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const QUARANTINE_FILE = './packages/db/.flake-quarantine.json';

export interface FlakeRecord {
  testName: string;
  totalRuns: number;
  failures: number;
  flakeRate: number;
  quarantinedSince?: string;
}

export class FlakeRegistry {
  private records: Record<string, FlakeRecord> = existsSync(QUARANTINE_FILE)
    ? JSON.parse(readFileSync(QUARANTINE_FILE, 'utf8'))
    : {};

  recordRun(testName: string, passed: boolean): void {
    const r = this.records[testName] ?? { testName, totalRuns: 0, failures: 0, flakeRate: 0 };
    r.totalRuns++;
    if (!passed) r.failures++;
    r.flakeRate = r.failures / r.totalRuns;
    if (r.flakeRate >= 0.1 && r.totalRuns >= 10 && !r.quarantinedSince) {
      r.quarantinedSince = new Date().toISOString();
    }
    this.records[testName] = r;
  }

  isQuarantined(testName: string): boolean {
    return Boolean(this.records[testName]?.quarantinedSince);
  }

  flush(): void {
    writeFileSync(QUARANTINE_FILE, JSON.stringify(this.records, null, 2));
  }

  report(): readonly FlakeRecord[] {
    return Object.values(this.records).sort((a, b) => b.flakeRate - a.flakeRate);
  }

  release(testName: string): void {
    if (this.records[testName]) {
      delete this.records[testName].quarantinedSince;
      this.records[testName].failures = 0;
      this.records[testName].totalRuns = 0;
      this.records[testName].flakeRate = 0;
    }
  }
}

export const flakeRegistry = new FlakeRegistry();
