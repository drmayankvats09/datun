// ═══════════════════════════════════════════════════════════════
// TELEMETRY — OpenTelemetry instrumentation hooks for seed pipeline
// Wired to env: OTEL_EXPORTER_OTLP_ENDPOINT (Better Stack / Honeycomb)
// ═══════════════════════════════════════════════════════════════
import { trace, type Tracer, type Span } from '@opentelemetry/api';

export const TRACER_NAME = 'datun.seed';

export function getSeedTracer(): Tracer {
  return trace.getTracer(TRACER_NAME, '1.0.0');
}

/** Wrap an async block in a span. Auto-records errors + duration. */
export async function withSpan<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T> {
  const tracer = getSeedTracer();
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (err) {
      span.setStatus({ code: 2, message: err instanceof Error ? err.message : String(err) }); // ERROR
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}

/** No-op span (when telemetry disabled). */
export function noopSpan<T>(_name: string, fn: () => Promise<T>): Promise<T> {
  return fn();
}

export const isTelemetryEnabled = (): boolean => {
  return typeof process !== 'undefined' && Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
};
