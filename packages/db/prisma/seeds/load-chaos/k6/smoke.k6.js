// ═══════════════════════════════════════════════════════════════
// K6 SMOKE TEST — minimal load to verify happy path under tiny load
// Source: grafana.com/docs/k6 — smoke=1 VU, 1 minute
// Run: k6 run smoke.k6.js
// ═══════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 1, duration: '1m' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.DATUN_BASE_URL || 'https://api.datunai.com';

export default function () {
  const health = http.get(`${BASE}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });
  sleep(1);
}
