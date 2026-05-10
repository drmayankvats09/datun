// ═══════════════════════════════════════════════════════════════
// BETTER STACK LOGGER — structured log shipping for production seeds
// Falls back to console when token absent
// ═══════════════════════════════════════════════════════════════

interface LogPayload {
  readonly level: 'info' | 'warn' | 'error' | 'debug';
  readonly msg: string;
  readonly ts: string;
  readonly meta?: Record<string, unknown>;
  readonly service?: string;
}

const TOKEN = process.env.BETTER_STACK_LOGS_TOKEN;
const ENDPOINT = process.env.BETTER_STACK_LOGS_ENDPOINT ?? 'https://in.logs.betterstack.com';

const buffer: LogPayload[] = [];
let flushTimer: NodeJS.Timeout | null = null;
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER = 500;

export function shipLog(payload: LogPayload): void {
  if (!TOKEN) {
    console.log(JSON.stringify(payload));
    return;
  }
  buffer.push(payload);
  if (buffer.length >= MAX_BUFFER) void flushNow();
  if (!flushTimer) flushTimer = setTimeout(() => void flushNow(), FLUSH_INTERVAL_MS);
}

async function flushNow(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, buffer.length);

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    });
  } catch {
    // Drop batch silently — better than crashing seed run
  }
}

export async function flushBetterStackLogs(): Promise<void> {
  await flushNow();
}
