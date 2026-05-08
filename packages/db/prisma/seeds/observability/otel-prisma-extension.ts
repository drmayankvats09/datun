// ═══════════════════════════════════════════════════════════════
// OTEL PRISMA EXTENSION — emits a span for every query
// Wires Prisma → OTEL → Datadog/Grafana/Sentry trace UI
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { getSeedTracer } from './otel-tracer';
import { SpanStatusCode } from '@opentelemetry/api';

export function withOtelTracing(prisma: PrismaClient): PrismaClient {
  const tracer = getSeedTracer();
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const span = tracer.startSpan(`prisma.${model}.${operation}`, {
            attributes: {
              'db.system': 'postgresql',
              'db.operation': operation,
              'db.prisma.model': model ?? 'unknown',
            },
          });
          try {
            const start = performance.now();
            const result = await query(args);
            span.setAttribute('db.duration_ms', Math.round(performance.now() - start));
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
        },
      },
    },
  }) as unknown as PrismaClient;
}
