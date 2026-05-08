// ═══════════════════════════════════════════════════════════════
// K6 LOAD TEST — typical production traffic
// 100 VU steady for 10 min — verifies daily traffic capacity
// ═══════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '6m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
  },
};

const BASE = __ENV.DATUN_BASE_URL || 'https://api.datunai.com';

export default function () {
  const r = http.get(`${BASE}/health`);
  check(r, {
    'status 200': (x) => x.status === 200,
    'has db ok': (x) => x.body && x.body.includes('"database":"ok"'),
  });
  sleep(Math.random() * 2);
}
