// ═══════════════════════════════════════════════════════════════
// RATE LIMITER — token bucket per module/operation
// Prevents overwhelming Postgres pool during massive seed runs
// ═══════════════════════════════════════════════════════════════

export interface RateLimiterOptions {
  readonly tokensPerInterval: number;
  readonly intervalMs: number;
  readonly maxBurst?: number;
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillMs: number;
  private readonly maxBurst: number;

  constructor(private readonly opts: RateLimiterOptions) {
    this.maxBurst = opts.maxBurst ?? opts.tokensPerInterval;
    this.tokens = this.maxBurst;
    this.lastRefillMs = Date.now();
  }

  async acquire(count = 1): Promise<void> {
    this.refill();
    while (this.tokens < count) {
      const deficit = count - this.tokens;
      const waitMs = Math.ceil((deficit / this.opts.tokensPerInterval) * this.opts.intervalMs);
      await new Promise((r) => setTimeout(r, waitMs));
      this.refill();
    }
    this.tokens -= count;
  }

  tryAcquire(count = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillMs;
    const refill = (elapsed / this.opts.intervalMs) * this.opts.tokensPerInterval;
    this.tokens = Math.min(this.maxBurst, this.tokens + refill);
    this.lastRefillMs = now;
  }

  getTokensAvailable(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/** Default limiter: 1000 ops/sec with 2000 burst — generous for seed work */
export function buildDefaultLimiter(): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter({ tokensPerInterval: 1000, intervalMs: 1000, maxBurst: 2000 });
}

/** Strict limiter: 100 ops/sec — for staging where prod is co-located */
export function buildStrictLimiter(): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter({ tokensPerInterval: 100, intervalMs: 1000, maxBurst: 200 });
}
