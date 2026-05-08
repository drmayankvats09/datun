import type { Probe } from './probe.types';

export const whatsappProbe: Probe = {
  name: 'whatsapp',
  criticality: 'p1',
  timeoutMs: 8_000,
  run: async (signal) => {
    const start = performance.now();
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId)
      return {
        name: 'whatsapp',
        status: 'red',
        latencyMs: 0,
        message: 'WhatsApp env missing',
        timestamp: new Date(),
      };
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}/message_templates?limit=1`,
      { headers: { Authorization: `Bearer ${token}` }, signal },
    );
    return {
      name: 'whatsapp',
      status: res.ok ? 'green' : 'red',
      latencyMs: Math.round(performance.now() - start),
      message: res.ok ? 'Cloud API reachable' : `HTTP ${res.status}`,
      timestamp: new Date(),
    };
  },
};

export const resendProbe: Probe = {
  name: 'resend',
  criticality: 'p1',
  timeoutMs: 5_000,
  run: async (signal) => {
    const start = performance.now();
    const key = process.env.RESEND_API_KEY;
    if (!key)
      return {
        name: 'resend',
        status: 'red',
        latencyMs: 0,
        message: 'RESEND_API_KEY missing',
        timestamp: new Date(),
      };
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal,
    });
    return {
      name: 'resend',
      status: res.ok ? 'green' : 'red',
      latencyMs: Math.round(performance.now() - start),
      message: res.ok ? 'API reachable' : `HTTP ${res.status}`,
      timestamp: new Date(),
    };
  },
};
