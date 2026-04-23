import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.ts', 'src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/*.test.*', '**/types/**', '**/*.d.ts'],
    },
  },
});
