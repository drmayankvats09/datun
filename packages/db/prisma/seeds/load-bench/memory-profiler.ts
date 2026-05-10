// ═══════════════════════════════════════════════════════════════
// MEMORY PROFILER — heap snapshots + flamegraph hint
// Use: node --inspect ... or with --prof flag
// ═══════════════════════════════════════════════════════════════
import { writeHeapSnapshot } from 'node:v8';
import path from 'node:path';

export class MemoryProfiler {
  private samples: Array<{ ts: number; heapUsedMb: number; rssMb: number; externalMb: number }> =
    [];
  private interval: NodeJS.Timeout | null = null;

  start(intervalMs = 500): void {
    if (this.interval) return;
    const snap = () => {
      const m = process.memoryUsage();
      this.samples.push({
        ts: Date.now(),
        heapUsedMb: Math.round(m.heapUsed / 1024 / 1024),
        rssMb: Math.round(m.rss / 1024 / 1024),
        externalMb: Math.round(m.external / 1024 / 1024),
      });
    };
    snap();
    this.interval = setInterval(snap, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  takeSnapshot(filename = `./tmp/heap-${Date.now()}.heapsnapshot`): string {
    return writeHeapSnapshot(path.resolve(filename));
  }

  report(): { peakHeapMb: number; peakRssMb: number; durationMs: number; sampleCount: number } {
    const heapPeak = Math.max(...this.samples.map((s) => s.heapUsedMb));
    const rssPeak = Math.max(...this.samples.map((s) => s.rssMb));
    const durationMs =
      (this.samples[this.samples.length - 1]?.ts ?? 0) - (this.samples[0]?.ts ?? 0);
    return {
      peakHeapMb: heapPeak,
      peakRssMb: rssPeak,
      durationMs,
      sampleCount: this.samples.length,
    };
  }
}
