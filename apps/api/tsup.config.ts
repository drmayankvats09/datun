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
  // Without this, Node tries to require() raw .ts files at runtime → crash.
  // Cal.com, Linear, Vercel — all bundle workspace deps into final output.
  noExternal: [/^@repo\//],
});
