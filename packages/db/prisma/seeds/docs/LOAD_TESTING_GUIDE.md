# Load Testing Guide

## Production endpoint guard

K6 scripts contain a hard-coded refusal to run against `api.datunai.com` unless `staging` appears in the URL. This is the first line of defence; the `seed-load-bench.yml` workflow re-validates server-side before invoking k6.

## Test-type catalogue

| Type         | VUs                  | Duration | Purpose                       |
| ------------ | -------------------- | -------- | ----------------------------- |
| `smoke`      | 10                   | 1m       | Sanity check after deploy     |
| `load`       | 0→200→0              | 20m      | Steady-state SLO verification |
| `stress`     | 0→1000→0             | 20m      | Find breaking point           |
| `spike`      | 0→2000 in 10s        | 1.5m     | Black Friday surge            |
| `soak`       | 100 constant         | 4h       | Memory leak detection         |
| `breakpoint` | ramping arrival rate | 30m      | Maximum sustainable RPS       |

## SLO targets (staging)

- p50 < 250 ms
- p95 < 800 ms
- p99 < 2 000 ms
- Error rate < 1%

Breaching any threshold fails the run. Investigation: capture flame graph via `--prof`, inspect `bench-report.json`, correlate with Prometheus dashboard.

## Bench harness

`bench-harness.ts` runs the `perf-bench` strategy 5 times, computes median + p99 across iterations, and emits `bench-report.json`. The CI workflow uploads this as an artifact retained for 90 days.

## Memory profiling

`memory-profiler.ts` samples `process.memoryUsage()` every 500 ms and emits a heap snapshot on demand. Combine with `node --prof` for V8 profiler output, then convert with `node --prof-process` for flame graph generation.
