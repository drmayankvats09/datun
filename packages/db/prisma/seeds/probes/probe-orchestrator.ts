import type { Probe, ProbeReport, ProbeResult } from './probe.types';

export async function runProbes(probes: readonly Probe[]): Promise<ProbeReport> {
  const start = performance.now();
  const results = await Promise.all(probes.map(runWithAbort));
  const p0FailureCount = results.filter(
    (r, i) => r.status === 'red' && probes[i]!.criticality === 'p0',
  ).length;
  const overallStatus: ProbeReport['overallStatus'] =
    p0FailureCount > 0 ? 'red' : results.some((r) => r.status === 'yellow') ? 'yellow' : 'green';
  return {
    results,
    overallStatus,
    p0FailureCount,
    totalDurationMs: Math.round(performance.now() - start),
    timestamp: new Date(),
  };
}

async function runWithAbort(probe: Probe): Promise<ProbeResult> {
  const start = performance.now();
  const ctrl = new AbortController();
  const timeoutId = setTimeout(
    () => ctrl.abort(new Error(`timeout after ${probe.timeoutMs}ms`)),
    probe.timeoutMs,
  );
  try {
    return await probe.run(ctrl.signal);
  } catch (err) {
    return {
      name: probe.name,
      status: 'red',
      latencyMs: Math.round(performance.now() - start),
      message: err instanceof Error ? err.message : String(err),
      timestamp: new Date(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
