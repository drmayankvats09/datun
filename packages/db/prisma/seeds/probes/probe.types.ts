export type ProbeStatus = 'green' | 'yellow' | 'red';

export interface ProbeResult {
  readonly name: string;
  readonly status: ProbeStatus;
  readonly latencyMs: number;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
}

export interface Probe {
  readonly name: string;
  readonly criticality: 'p0' | 'p1' | 'p2';
  readonly timeoutMs: number;
  readonly run: (signal: AbortSignal) => Promise<ProbeResult>;
}

export interface ProbeReport {
  readonly results: readonly ProbeResult[];
  readonly overallStatus: ProbeStatus;
  readonly p0FailureCount: number;
  readonly totalDurationMs: number;
  readonly timestamp: Date;
}
