import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  // ── Bundle workspace packages (FAANG monorepo pattern) ──
  // Cal.com, Linear, Vercel — all bundle workspace deps.
  noExternal: [/^@repo\//],
  // ── Keep Prisma external ──
  // Prisma's native engine binary uses runtime path resolution.
  // Bundling breaks the path → engine not found.
  // Pattern: Prisma docs explicit recommendation for bundlers.
  external: ['@prisma/client', '.prisma/client', '@prisma/engines'],
});
