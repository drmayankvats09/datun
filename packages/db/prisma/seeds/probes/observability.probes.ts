import type { Probe } from './probe.types';

export const betterStackProbe: Probe = {
  name: 'better-stack',
  criticality: 'p1',
  timeoutMs: 5_000,
  run: async (signal) => {
    const start = performance.now();
    const token = process.env.BETTER_STACK_LOGS_TOKEN;
    const ingestUrl = process.env.BETTER_STACK_INGEST_URL ?? 'https://in.logs.betterstack.com';
    if (!token)
      return {
        name: 'better-stack',
        status: 'red',
        latencyMs: 0,
        message: 'BETTER_STACK_LOGS_TOKEN missing',
        timestamp: new Date(),
      };
    const res = await fetch(ingestUrl, {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dt: new Date().toISOString(),
        level: 'info',
        message: 'datun-seed probe',
        source: 'seed-probes',
      }),
    });
    return {
      name: 'better-stack',
      status: res.ok ? 'green' : 'red',
      latencyMs: Math.round(performance.now() - start),
      message: res.ok ? 'Log accepted' : `HTTP ${res.status}`,
      timestamp: new Date(),
    };
  },
};

export const prometheusProbe: Probe = {
  name: 'prometheus',
  criticality: 'p2',
  timeoutMs: 3_000,
  run: async (signal) => {
    const start = performance.now();
    const url = process.env.PROMETHEUS_PUSHGATEWAY_URL;
    if (!url)
      return {
        name: 'prometheus',
        status: 'yellow',
        latencyMs: 0,
        message: 'No pushgateway configured',
        timestamp: new Date(),
      };
    const res = await fetch(`${url}/metrics/job/datun-seed`, {
      method: 'POST',
      signal,
      body: '# TYPE datun_seed_probe gauge\ndatun_seed_probe 1\n',
    });
    return {
      name: 'prometheus',
      status: res.ok ? 'green' : 'red',
      latencyMs: Math.round(performance.now() - start),
      message: res.ok ? 'Push accepted' : `HTTP ${res.status}`,
      timestamp: new Date(),
    };
  },
};
