// ═══════════════════════════════════════════════════════════════
// K6 SOAK TEST — 50 VU for 4 hours (memory leaks, slow degradation)
// ═══════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '4h',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

const BASE = __ENV.DATUN_BASE_URL || 'https://api.datunai.com';

export default function () {
  const r = http.get(`${BASE}/health`);
  check(r, { 'status 200': (x) => x.status === 200 });
  sleep(2);
}
