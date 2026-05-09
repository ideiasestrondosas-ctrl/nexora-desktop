import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['sidecar/**/*.ts'],
      exclude: ['sidecar/dist/**', 'sidecar/profiles/*.json'],
    },
  },
});
