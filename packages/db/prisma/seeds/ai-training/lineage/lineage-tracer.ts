// ═══════════════════════════════════════════════════════════════
// LINEAGE TRACER — generate Mermaid graph for any example's history
// ═══════════════════════════════════════════════════════════════
import type { LineageStore } from './lineage-store';

export async function generateLineageMermaid(
  store: LineageStore,
  exampleId: string,
): Promise<string> {
  const path = await store.traceLineage(exampleId);
  if (path.length === 0) return 'graph LR\n  A[Not found]';
  const lines = ['graph LR'];
  for (let i = 0; i < path.length - 1; i++) {
    lines.push(
      `  ${shortId(path[i + 1]!.id)}[${path[i + 1]!.source}] --> ${shortId(path[i]!.id)}[${path[i]!.source}]`,
    );
  }
  return lines.join('\n');
}

function shortId(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
}
