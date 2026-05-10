// ═══════════════════════════════════════════════════════════════
// OTEL TRACER — root tracer for seed pipeline
// Source: opentelemetry-js v2 stable APIs (2025)
// ═══════════════════════════════════════════════════════════════
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { trace, type Tracer, SpanStatusCode } from '@opentelemetry/api';

let sdk: NodeSDK | null = null;

export function initOtel(serviceName = 'datun-seed'): void {
  if (sdk) return;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return; // no-op if not configured
  sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    instrumentations: [],
  });
  sdk.start();
}

export async function shutdownOtel(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}

export function getSeedTracer(): Tracer {
  return trace.getTracer('datun-seed', '1.0.0');
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {},
): Promise<T> {
  const tracer = getSeedTracer();
  return tracer.startActiveSpan(name, async (span) => {
    try {
      for (const [k, v] of Object.entries(attributes)) span.setAttribute(k, v);
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}
