// ═══════════════════════════════════════════════════════════════
// HEALTHCHECK PING — Cron job heartbeat to healthchecks.io
// Each cron pings success/fail URL. If ping stops, alert fires.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';

export async function pingHealthcheck(url: string | undefined, isFail = false): Promise<void> {
  if (!url) return;
  try {
    await axios.get(isFail ? `${url}/fail` : url, { timeout: 5000 });
  } catch {
    // Silent — healthchecks.io failing must never crash our system
  }
}
