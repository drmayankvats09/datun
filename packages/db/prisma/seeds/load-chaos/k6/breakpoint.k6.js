// ═══════════════════════════════════════════════════════════════
// K6 BREAKPOINT TEST — discover system limits (gradual ramp until failure)
// Source: grafana.com — breakpoint test type
// ═══════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  executor: 'ramping-arrival-rate',
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 2000,
      stages: [
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 2000 },
        { duration: '5m', target: 5000 },
      ],
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<=0.05', abortOnFail: true }],
    http_req_duration: [{ threshold: 'p(99)<5000', abortOnFail: true }],
  },
};

const BASE = __ENV.DATUN_BASE_URL || 'https://api.datunai.com';

export default function () {
  const r = http.get(`${BASE}/health`);
  check(r, { ok: (x) => x.status === 200 });
}
