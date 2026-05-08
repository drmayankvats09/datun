// ═══════════════════════════════════════════════════════════════
// K6 LOAD — ramp 0→200 VUs over 5min, hold 10min, ramp down 5min
// ═══════════════════════════════════════════════════════════════
import http from 'k6/http';
import { check, fail } from 'k6';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 200 },
        { duration: '10m', target: 200 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
  if (BASE.includes('api.datunai.com') && !BASE.includes('staging')) {
    fail('REFUSED: K6 must NEVER hit production.');
  }
}

export default function () {
  const list = http.get(`${BASE}/api/clinics?limit=20`);
  check(list, { 'list 200': (r) => r.status === 200 });
  const consult = http.get(`${BASE}/api/consultations?limit=10`);
  check(consult, { 'consult 200': (r) => r.status === 200 });
}
