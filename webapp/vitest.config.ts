import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.ts'],
      exclude: ['server/services/prowl.ts', 'server/services/sentinel.ts', 'server/services/pipelineMetrics.ts'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 50,
        lines: 60,
      },
    },
  },
});
