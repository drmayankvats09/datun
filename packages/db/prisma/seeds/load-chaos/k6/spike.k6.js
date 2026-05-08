// ═══════════════════════════════════════════════════════════════
// K6 SPIKE TEST — 0 to 1000 VU in 30 seconds (viral-traffic moment)
// ═══════════════════════════════════════════════════════════════

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<3000'],
  },
};

const BASE = __ENV.DATUN_BASE_URL || 'https://api.datunai.com';

export default function () {
  const r = http.get(`${BASE}/health`);
  check(r, { 'survived spike': (x) => x.status >= 200 && x.status < 600 });
  sleep(0.5);
}
