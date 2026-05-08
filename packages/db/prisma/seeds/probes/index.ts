import { dbProbe } from './db.probe';
import { sentryProbe } from './sentry.probe';
import { betterStackProbe, prometheusProbe } from './observability.probes';
import { s3Probe, aiProviderProbe } from './external.probes';
import { whatsappProbe, resendProbe } from './messaging.probes';
import { runProbes } from './probe-orchestrator';
import type { Probe, ProbeReport } from './probe.types';

export const ALL_PROBES: readonly Probe[] = [
  dbProbe,
  sentryProbe,
  betterStackProbe,
  prometheusProbe,
  s3Probe,
  aiProviderProbe,
  whatsappProbe,
  resendProbe,
];

export async function verifyAll(): Promise<ProbeReport> {
  return runProbes(ALL_PROBES);
}
export async function verifyByName(names: readonly string[]): Promise<ProbeReport> {
  return runProbes(ALL_PROBES.filter((p) => names.includes(p.name)));
}
export type { Probe, ProbeResult, ProbeReport, ProbeStatus } from './probe.types';
export { runProbes };
