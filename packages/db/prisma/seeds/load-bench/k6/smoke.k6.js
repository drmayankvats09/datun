// ═══════════════════════════════════════════════════════════════
// K6 SMOKE — 10 VUs × 1 min, staging only
// HARD GUARD: refuses to run against api.datunai.com
// ═══════════════════════════════════════════════════════════════
import http from 'k6/http';
import { check, fail } from 'k6';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
  if (BASE.includes('api.datunai.com') && !BASE.includes('staging')) {
    fail('REFUSED: K6 must NEVER hit production. Set BASE_URL to staging.');
  }
}

export default function () {
  const res = http.get(`${BASE}/health`);
  check(res, { 'status 200': (r) => r.status === 200 });
}
