// ═══════════════════════════════════════════════════════════════
// K6 STRESS TEST — push beyond expected peak to find breaking point
// 500 VU sustained — Black-Friday scale
// ═══════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: '3m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE = __ENV.DATUN_BASE_URL || 'https://api.datunai.com';

export default function () {
  const r = http.get(`${BASE}/health`);
  check(r, { 'status 200 or 503': (x) => x.status === 200 || x.status === 503 });
  sleep(0.1);
}
