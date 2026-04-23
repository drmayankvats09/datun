import { describe, it, expect } from 'vitest';
import { URLS } from '../urls.js';

describe('URLS constants', () => {
  it('website is datunai.com', () => {
    expect(URLS.website).toBe('datunai.com');
  });

  it('websiteHttps includes https://', () => {
    expect(URLS.websiteHttps).toMatch(/^https:\/\//);
  });

  it('API URL is Railway production', () => {
    expect(URLS.api).toContain('railway.app');
  });

  it('CORS origins include production + development', () => {
    expect(URLS.corsOrigins).toContain('https://datunai.com');
    expect(URLS.corsOrigins).toContain('http://localhost:3000');
  });

  it('CORS origins do NOT include random domains', () => {
    expect(URLS.corsOrigins).not.toContain('https://evil.com');
  });

  it('reportUrl generates correct format', () => {
    const url = URLS.reportUrl('abc-123');
    expect(url).toBe('datunai.com/report/abc-123');
  });

  it('social links are set', () => {
    expect(URLS.social.instagram).toContain('instagram.com');
    expect(URLS.social.linkedin).toContain('linkedin.com');
  });
});
