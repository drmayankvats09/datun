import http from 'k6/http';
import { check, fail } from 'k6';

const TYPE = __ENV.K6_TYPE || 'stress';

const SCENARIOS = {
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 1000 },
      { duration: '10m', target: 1000 },
      { duration: '5m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 0 },
      { duration: '10s', target: 2000 },
      { duration: '1m', target: 2000 },
      { duration: '10s', target: 0 },
    ],
  },
  soak: { executor: 'constant-vus', vus: 100, duration: '4h' },
  breakpoint: {
    executor: 'ramping-arrival-rate',
    startRate: 50,
    timeUnit: '1s',
    preAllocatedVUs: 500,
    maxVUs: 5000,
    stages: [{ duration: '30m', target: 5000 }],
  },
};

if (!SCENARIOS[TYPE]) throw new Error(`Unknown K6_TYPE: ${TYPE}. Use stress|spike|soak|breakpoint`);

export const options = {
  scenarios: { [TYPE]: SCENARIOS[TYPE] },
  thresholds: { http_req_failed: ['rate<0.05'], http_req_duration: ['p(99)<5000'] },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
  if (BASE.includes('api.datunai.com') && !BASE.includes('staging'))
    fail('REFUSED: production blocked');
}

export default function () {
  const r = http.get(`${BASE}/api/clinics?limit=5`);
  check(r, { 'status 200': (x) => x.status === 200 });
}
