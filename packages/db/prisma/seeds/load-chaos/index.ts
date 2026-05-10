export * from './chaos-scenarios';

export const K6_SCRIPTS = {
  smoke: 'k6/smoke.k6.js',
  load: 'k6/load.k6.js',
  stress: 'k6/stress.k6.js',
  spike: 'k6/spike.k6.js',
  soak: 'k6/soak.k6.js',
  breakpoint: 'k6/breakpoint.k6.js',
} as const;
