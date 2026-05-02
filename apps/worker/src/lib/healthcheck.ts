// ═══════════════════════════════════════════════════════════════
// HEALTHCHECK PING — Worker pings healthchecks.io on cron-equivalent jobs
// Mirrors API's pattern. Each scheduled job has its own URL.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';

export async function pingHealthcheck(url: string | undefined, isFail = false): Promise<void> {
  if (!url) return;
  try {
    await axios.get(isFail ? `${url}/fail` : url, { timeout: 5000 });
  } catch {
    // Silent — healthchecks.io must never crash worker
  }
}
