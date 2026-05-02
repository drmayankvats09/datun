import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  // Bundle workspace packages (matches API pattern)
  noExternal: [/^@repo\//],
  // Keep Prisma external (runtime engine path resolution)
  external: ['@prisma/client', '.prisma/client', '@prisma/engines'],
});
