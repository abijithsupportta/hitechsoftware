import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./tests/setup.ts'],
    css: true,
    fileParallelism: false,
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    sequence: {
      shuffle: false,
      concurrent: false,
    },
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});

